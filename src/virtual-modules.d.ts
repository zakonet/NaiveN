declare module 'virtual:naive-ui-component-manifest' {
  interface NaiveComponentManifestEntry {
    name: string
    modulePath: string
  }

  const manifest: NaiveComponentManifestEntry[]

  export default manifest
}
