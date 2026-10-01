// Encrypts the Groq API key for the app bundle, so the APK never holds it as plain text.
//
// Put `GROQ_API_KEY=...` in app/.env.local (git-ignored), then run `npm run groq:key`. This adds
// EXPO_PUBLIC_GROQ_KEY_ENC to the same file: AES-256-GCM ciphertext whose key is
// SHA-256(app pepper || random salt). Expo inlines EXPO_PUBLIC_ variables into the bundle at
// build time; the plain GROQ_API_KEY is never bundled.
//
// This is obfuscation, not secrecy: the app must decrypt the key to use it. Use a dedicated key
// with a spending limit, and rotate it when it is no longer needed.

import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Must match PEPPER in features/ai/groq.ts.
const PEPPER = 'nest-finance/groq/v1'

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env.local')
if (!existsSync(envPath)) {
  console.error('app/.env.local not found. Create it with a line GROQ_API_KEY=<your key>.')
  process.exit(1)
}
const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
const key = lines.find((l) => l.startsWith('GROQ_API_KEY='))?.slice('GROQ_API_KEY='.length).trim()
if (!key) {
  console.error('No GROQ_API_KEY= line in app/.env.local.')
  process.exit(1)
}

const salt = randomBytes(16)
const iv = randomBytes(12)
const aesKey = createHash('sha256').update(Buffer.concat([Buffer.from(PEPPER), salt])).digest()
const cipher = createCipheriv('aes-256-gcm', aesKey, iv)
const ciphertext = Buffer.concat([cipher.update(key, 'utf8'), cipher.final()])
const blob = Buffer.concat([salt, iv, ciphertext, cipher.getAuthTag()]).toString('base64')

const kept = lines.filter((l) => l && !l.startsWith('EXPO_PUBLIC_GROQ_KEY_ENC='))
writeFileSync(envPath, [...kept, `EXPO_PUBLIC_GROQ_KEY_ENC=${blob}`].join('\n') + '\n')
console.log(`Encrypted the Groq key (${key.length} characters) into EXPO_PUBLIC_GROQ_KEY_ENC in app/.env.local.`)
