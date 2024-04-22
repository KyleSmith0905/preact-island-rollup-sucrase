import type { CompilerOptions, TypeAcquisition } from 'typescript'

export interface TSConfig {
  compilerOptions?: CompilerOptions
  exclude?: string[]
  compileOnSave?: boolean
  extends?: string
  files?: string[]
  include?: string[]
  typeAcquisition?: TypeAcquisition
}

export interface Options {
  rootDir: string
  baseURL: string
  atomic?: boolean
  hash?: boolean
  tsconfig: string | TSConfig
  client: {
    replaceParentNode: boolean
    tsconfig?: string | TSConfig
    output: string
  }
}
