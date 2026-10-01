// Nest Intelligence: wording by a model on Groq, everything it says grounded in facts the app
// computes. The model never decides anything: scores, scenario outcomes and recommended actions
// come from code, and only short facts (amounts, durations, roles, short addresses) are sent.
// No location, IP, device details or full addresses ever leave the phone.

import { gcm } from '@noble/ciphers/aes.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { utf8ToBytes } from '@noble/hashes/utils.js'
import { getBase64Encoder } from '@solana/kit'
import { useQuery } from '@tanstack/react-query'
import { UserError } from '@/features/errors'

// Must match PEPPER in scripts/encrypt-groq-key.mjs.
const PEPPER = 'nest-finance/groq/v1'
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
// Reasoning models on Groq; reasoning stays hidden and short, only the answer is returned.
const MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']
const TIMEOUT_MS = 20_000

let cachedKey: string | null | undefined

/**
 * The Groq key, decrypted from the bundle. It is stored as AES-256-GCM ciphertext under a key
 * derived with SHA-256 (see scripts/encrypt-groq-key.mjs), so it never sits in the APK as text.
 */
function apiKey(): string | null {
  if (cachedKey !== undefined) return cachedKey
  const blob = process.env.EXPO_PUBLIC_GROQ_KEY_ENC
  try {
    if (!blob) return (cachedKey = null)
    const bytes = new Uint8Array(getBase64Encoder().encode(blob))
    const salt = bytes.subarray(0, 16)
    const iv = bytes.subarray(16, 28)
    const sealed = bytes.subarray(28)
    const pepper = utf8ToBytes(PEPPER)
    const material = new Uint8Array(pepper.length + salt.length)
    material.set(pepper)
    material.set(salt, pepper.length)
    const plain = gcm(sha256(material), iv).decrypt(sealed)
    cachedKey = new TextDecoder().decode(plain)
  } catch {
    cachedKey = null
  }
  return cachedKey
}

export const aiAvailable = () => !!apiKey()

const RULES = [
  'You are Nest Intelligence inside Nest Finance, a savings app on Solana where every withdrawal waits a protection delay that the owner or a guardian can cancel, and savings can be frozen.',
  'Use only the facts given. Never invent amounts, times, names, addresses or reasons. If the facts do not answer something, say so.',
  'Repeat the recommended action exactly in meaning when one is given; do not add other advice.',
  'Plain English, no markdown, no headings, no lists, no emoji.',
].join(' ')

/** Asks the model to word `facts` for `task`. Throws UserError with a readable message on failure. */
export async function askAi(task: string, facts: string, maxTokens = 700): Promise<string> {
  const key = apiKey()
  if (!key) throw new UserError('Nest Intelligence is not set up in this build.')
  let lastError: unknown
  for (const model of MODELS) {
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_completion_tokens: maxTokens,
          reasoning_effort: 'low',
          include_reasoning: false,
          messages: [
            { role: 'system', content: `${RULES} ${task}` },
            { role: 'user', content: facts },
          ],
        }),
        signal: abort.signal,
      })
      if (res.status === 429) throw new UserError('Nest Intelligence is busy right now. Try again in a minute.')
      if (!res.ok) throw new Error(`Groq ${res.status}`)
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const text = json.choices?.[0]?.message?.content?.trim()
      if (text) return text.replace(/\*\*/g, '')
      throw new Error('empty answer')
    } catch (e) {
      lastError = e
      if (e instanceof UserError) throw e
    } finally {
      clearTimeout(timer)
    }
  }
  if (__DEV__) console.warn('[nest] ai:', lastError)
  throw new UserError("Nest Intelligence couldn't answer just now. Check your connection and try again.")
}

/** Cached AI wording for a set of facts; the same facts never cost a second call. */
export function useAiText(kind: string, task: string, facts: string | null, enabled = true) {
  return useQuery({
    queryKey: ['ai', kind, facts],
    enabled: enabled && !!facts && aiAvailable(),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
    queryFn: () => askAi(task, facts!),
  })
}
