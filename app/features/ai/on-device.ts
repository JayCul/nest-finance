// On-device AI: a small language model (Qwen3 0.6B, 4-bit) run by llama.cpp on the phone.
// No server and no API key: nothing to leak from the APK, and what it reads (location, IP,
// device details) never leaves the phone. The model is downloaded once from Hugging Face.

import { File } from 'expo-file-system'
import * as FileSystem from 'expo-file-system/legacy'
import { initLlama, type LlamaContext } from 'llama.rn'
import { UserError } from '@/features/errors'

export const MODEL = {
  name: 'Qwen3 0.6B',
  file: 'Qwen3-0.6B-Q4_K_M.gguf',
  url: 'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_K_M.gguf',
  bytes: 396_705_472,
}

const dir = `${FileSystem.documentDirectory}models/`
const path = `${dir}${MODEL.file}`

export async function isModelReady(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(path)
  return info.exists && !info.isDirectory && info.size === MODEL.bytes
}

const CHUNK = 4 * 1024 * 1024
const CHUNK_TIMEOUT_MS = 60_000
const CHUNK_RETRIES = 5

/**
 * Downloads the model in 4 MB ranges, reporting progress from 0 to 1. Each range retries on its
 * own, and the partial file is kept, so a stalled connection or a closed app resumes where it
 * stopped instead of starting over.
 */
export async function downloadModel(onProgress: (fraction: number) => void): Promise<void> {
  if (await isModelReady()) return onProgress(1)
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {})
  const part = new File(`${path}.part`)
  if (!part.exists) part.create()
  const have = part.size
  if (have > MODEL.bytes) {
    part.delete()
    throw new UserError('The AI model download was damaged and has been cleared. Please try again.')
  }
  const free = await FileSystem.getFreeDiskStorageAsync()
  if (free < (MODEL.bytes - have) * 1.1) {
    throw new UserError(`Not enough free space: the AI model needs about ${Math.ceil(MODEL.bytes / 1e6)} MB.`)
  }

  const handle = part.open()
  try {
    let offset = have
    handle.offset = offset
    onProgress(offset / MODEL.bytes)
    while (offset < MODEL.bytes) {
      const end = Math.min(offset + CHUNK, MODEL.bytes) - 1
      const bytes = await fetchRange(offset, end)
      handle.writeBytes(bytes)
      offset += bytes.length
      onProgress(offset / MODEL.bytes)
    }
  } finally {
    handle.close()
  }

  const head = new File(`${path}.part`).open()
  const magic = String.fromCharCode(...head.readBytes(4))
  head.close()
  if (part.size !== MODEL.bytes || magic !== 'GGUF') {
    part.delete()
    throw new UserError('The AI model did not download correctly and has been cleared. Please try again.')
  }
  await FileSystem.moveAsync({ from: `${path}.part`, to: path })
  onProgress(1)
}

async function fetchRange(start: number, end: number): Promise<Uint8Array> {
  let lastError: unknown
  for (let attempt = 0; attempt < CHUNK_RETRIES; attempt++) {
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), CHUNK_TIMEOUT_MS)
    try {
      const res = await fetch(MODEL.url, { headers: { Range: `bytes=${start}-${end}` }, signal: abort.signal })
      if (res.status !== 206) throw new Error(`Unexpected response ${res.status}`)
      const bytes = new Uint8Array(await res.arrayBuffer())
      if (bytes.length !== end - start + 1) throw new Error('Short read')
      return bytes
    } catch (e) {
      lastError = e
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
    } finally {
      clearTimeout(timer)
    }
  }
  if (__DEV__) console.warn('[nest] model download failed:', lastError)
  throw new UserError('The AI model download keeps stalling. Check your connection and tap again: it resumes where it stopped.')
}

export async function deleteModel() {
  await FileSystem.deleteAsync(path, { idempotent: true })
}

let context: Promise<LlamaContext> | null = null
const load = () => (context ??= initLlama({ model: path, n_ctx: 2048, use_mlock: false, n_gpu_layers: 0 }))

const STOP = ['<|im_end|>', '<|endoftext|>']

/**
 * Asks the on-device model for a short answer, streaming it through `onText` as it is written.
 * The model only sees what is passed in `facts`.
 */
export async function askOnDevice(system: string, facts: string, onText: (text: string) => void): Promise<string> {
  const llama = await load()
  let text = ''
  const result = await llama.completion(
    {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: facts },
      ],
      enable_thinking: false,
      n_predict: 220,
      temperature: 0.2,
      top_p: 0.9,
      stop: STOP,
    },
    ({ token }) => {
      text += token
      onText(clean(text))
    },
  )
  return clean(result.text || text)
}

/** Frees the model's memory; it loads again on the next question. */
export async function releaseModel() {
  const c = context
  context = null
  if (c) await (await c).release().catch(() => {})
}

// Qwen3 can still emit an empty <think></think> block; drop it.
const clean = (t: string) => t.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<\/?think>/g, '').trim()
