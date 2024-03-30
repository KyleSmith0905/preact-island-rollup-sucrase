const { existsSync } = require('fs')
const { resolve } = require('path')
const ts = require('typescript')

exports.resolveTsConfig = resolveTsConfig

async function resolveTsConfig(config) {
  if (!config) {
    return {}
  }

  const validConfig = typeof config == 'object' || typeof config == 'string'

  if (!validConfig) {
    throw new Error(
      'expected `tsconfig` property to be either a path to the config or the raw tsconfig'
    )
  }

  // Expect it to be the path of the config
  if (typeof config == 'string') {
    if (existsSync(resolve(config))) {
      const configDef = ts.readConfigFile(config, ts.sys.readFile)
      return configDef.config
    }
    return {}
  }

  return {
    ...config,
  }
}
