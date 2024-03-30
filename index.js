const { generateIslandsWithSource } = require('./lib/plugin')
const { writeFileSync } = require('fs')
const { mkdir } = require('fs/promises')
const { dirname } = require('path')
const { resolveTsConfig } = require('./lib/typescript')
const path = require('path')
const { defu } = require('defu')
const sucrase = require('sucrase')
const rollupPluginUtils = require('@rollup/pluginutils')
const fs = require('fs')

exports = module.exports = rollupPlugin

/**@type {import("../lib/types").Options} */
const defaultOptions = {
  rootDir: '.',
  baseURL: '/public',
  atomic: true,
  hash: false,
  tsconfig: './tsconfig.json',
  client: {
    replaceParentNode: false,
    tsconfig: './tsconfig.json',
    output: './dist/client/__preact_islands/client',
  },
  server: {
    output: './dist/client/__preact_islands/server',
  },
}

/**
 * @param {import('../lib/types').Options} options
 * @returns {import("rollup").Plugin}
 */
function rollupPlugin(options = defaultOptions) {
  options = defu(options, defaultOptions)
  const filter = rollupPluginUtils.createFilter(
    options.include,
    options.exclude
  )

  return {
    name: 'preact-island-plugin',
    // eslint-disable-next-line consistent-return
    resolveId(importee, importer) {
      if (importer && /^[./]/.test(importee)) {
        const resolved = path.resolve(
          importer ? path.dirname(importer) : process.cwd(),
          importee
        )
        // resolve in the same order that TypeScript resolves modules
        const resolvedFilenames = [
          `${resolved}.ts`,
          `${resolved}.tsx`,
          `${resolved}/index.ts`,
          `${resolved}/index.tsx`,
        ]
        if (resolved.endsWith('.js')) {
          resolvedFilenames.splice(
            2,
            0,
            `${resolved.slice(0, -3)}.ts`,
            `${resolved.slice(0, -3)}.tsx`
          )
        }
        const resolvedFilename = resolvedFilenames.find(filename =>
          fs.existsSync(filename)
        )

        if (resolvedFilename) {
          return resolvedFilename
        }
      }
    },
    async transform(transformCode, id) {
      if (!filter(id)) return null

      // 1. Retrieve Tsconfig settings as default fallback
      const baseTransformTSConfig = await resolveTsConfig(options.tsconfig)

      // 2. Convert to Javascript for easier parsing from Preact Islands
      if (id.endsWith('ts') || id.endsWith('tsx')) {
        let isIsland = false

        const initialTransform = sucrase.transform(transformCode, {
          transforms: ['typescript', 'jsx'],
          jsxPragma:
            options.jsxPragma ??
            baseTransformTSConfig.compilerOptions.jsxFactory,
          jsxFragmentPragma:
            options.jsxFragmentPragma ??
            baseTransformTSConfig.compilerOptions.jsxFragmentFactory,
          enableLegacyTypeScriptModuleInterop:
            options.enableLegacyTypeScriptModuleInterop,
          enableLegacyBabel5ModuleInterop:
            options.enableLegacyBabel5ModuleInterop,
          production: options.production,
          disableESTransforms: options.disableESTransforms,
          filePath: id,
          sourceMapOptions: {
            compiledFilename: id,
          },
        })

        if (
          initialTransform.code.indexOf('//@island') > -1 ||
          initialTransform.code.indexOf('// @island') > -1
        ) {
          isIsland = true
        }

        transformCode = initialTransform.code

        if (isIsland) {
          transformCode = '//@island\n' + transformCode
        }
      }

      // 3. Generate server and client bundles for Preact islands
      const generatedOutput = generateIslandsWithSource(
        transformCode,
        id,
        options
      )
      const { code, paths } = generatedOutput

      // 4. Compile client code
      if (paths.client) {
        await mkdir(dirname(paths.client), { recursive: true })

        const clientOutput = sucrase.transform(code.client, {
          transforms: ['jsx'],
          jsxPragma:
            options.jsxPragma ??
            baseTransformTSConfig.compilerOptions.jsxFactory,
          jsxFragmentPragma:
            options.jsxFragmentPragma ??
            baseTransformTSConfig.compilerOptions.jsxFragmentFactory,
          enableLegacyTypeScriptModuleInterop:
            options.enableLegacyTypeScriptModuleInterop,
          enableLegacyBabel5ModuleInterop:
            options.enableLegacyBabel5ModuleInterop,
          production: options.production,
          disableESTransforms: options.disableESTransforms,
          filePath: id,
          sourceMapOptions: {
            compiledFilename: id,
          },
        })

        writeFileSync(paths.client, clientOutput.code, 'utf8')
      }

      // 5. Compile server code

      const serverOutput = sucrase.transform(code.server, {
        transforms: ['jsx', 'typescript'],
        jsxPragma:
          options.jsxPragma ?? baseTransformTSConfig.compilerOptions.jsxFactory,
        jsxFragmentPragma:
          options.jsxFragmentPragma ??
          baseTransformTSConfig.compilerOptions.jsxFragmentFactory,
        enableLegacyTypeScriptModuleInterop:
          options.enableLegacyTypeScriptModuleInterop,
        enableLegacyBabel5ModuleInterop:
          options.enableLegacyBabel5ModuleInterop,
        production: options.production,
        disableESTransforms: options.disableESTransforms,
        filePath: id,
        sourceMapOptions: {
          compiledFilename: id,
        },
      })
      if (paths.server) {
        await mkdir(dirname(paths.server), { recursive: true })
        writeFileSync(paths.server, serverOutput.code, 'utf8')
      }

      return {
        code: serverOutput.code,
        map: serverOutput.sourceMap,
      }
    },
  }
}
