type NaiveModule = Record<string, unknown>
type NaiveModuleLoader = () => Promise<NaiveModule>

const naiveComponentLoaders = import.meta.glob<NaiveModule>(
  [
    '/node_modules/naive-ui/es/*/index.mjs',
    '!/node_modules/naive-ui/es/locales/index.mjs',
  ],
)

export function loadNaiveModule(modulePath: string): Promise<NaiveModule> {
  const loader = naiveComponentLoaders[modulePath] as NaiveModuleLoader | undefined

  if (!loader) {
    return Promise.reject(new Error(`Naive UI module "${modulePath}" was not found.`))
  }

  return loader()
}
