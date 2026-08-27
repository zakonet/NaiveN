import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const naiveManifestModuleId = 'virtual:naive-ui-component-manifest'
const resolvedNaiveManifestModuleId = `\0${naiveManifestModuleId}`

interface NaiveComponentManifestEntry {
  name: string
  modulePath: string
}

function extractNaiveComponentNames(declaration: string): string[] {
  const names = new Set<string>()
  const componentNamePattern = /\bN[A-Z][A-Za-z0-9]*\b/g
  let match = componentNamePattern.exec(declaration)

  while (match) {
    names.add(match[0])
    match = componentNamePattern.exec(declaration)
  }

  return [...names]
}

function createNaiveComponentManifest(root: string): NaiveComponentManifestEntry[] {
  const componentsRoot = path.resolve(root, 'node_modules/naive-ui/es')

  if (!fs.existsSync(componentsRoot)) {
    return []
  }

  const entries: NaiveComponentManifestEntry[] = []

  for (const entry of fs.readdirSync(componentsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) {
      continue
    }

    const declarationPath = path.join(componentsRoot, entry.name, 'index.d.ts')

    if (!fs.existsSync(declarationPath)) {
      continue
    }

    const declaration = fs.readFileSync(declarationPath, 'utf8')
    const modulePath = `/node_modules/naive-ui/es/${entry.name}/index.mjs`

    for (const name of extractNaiveComponentNames(declaration)) {
      entries.push({ name, modulePath })
    }
  }

  return entries.sort((left, right) =>
    left.name.localeCompare(right.name) || left.modulePath.localeCompare(right.modulePath),
  )
}

function naiveUiComponentManifest(): Plugin {
  let projectRoot = process.cwd()

  return {
    name: 'naive-ui-component-manifest',
    configResolved(config) {
      projectRoot = config.root
    },
    resolveId(id) {
      return id === naiveManifestModuleId ? resolvedNaiveManifestModuleId : undefined
    },
    load(id) {
      if (id !== resolvedNaiveManifestModuleId) {
        return undefined
      }

      const manifest = createNaiveComponentManifest(projectRoot)

      return `export default ${JSON.stringify(manifest)}`
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), naiveUiComponentManifest()],
})
