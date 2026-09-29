// Generates the typed @solana/kit client for the nest_vault program from its Anchor IDL.
// Run after `anchor build`: npm run generate:client
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor'
import { renderVisitor } from '@codama/renderers-js'
import { createFromRoot } from 'codama'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const builtIdl = path.resolve(appDir, '../target/idl/nest_vault.json')
const committedIdl = path.resolve(appDir, 'idl/nest_vault.json')

// Keep a copy of the IDL in the app so the client can be regenerated without a Rust build.
if (existsSync(builtIdl)) {
  mkdirSync(path.dirname(committedIdl), { recursive: true })
  copyFileSync(builtIdl, committedIdl)
}

const idl = JSON.parse(readFileSync(committedIdl, 'utf8'))
const codama = createFromRoot(rootNodeFromAnchor(idl))
await codama.accept(
  renderVisitor(appDir, {
    generatedFolder: 'generated/nest-vault',
    syncPackageJson: false,
    deleteFolderBeforeRendering: true,
  }),
)
console.log('Generated generated/nest-vault from', path.relative(appDir, committedIdl))
