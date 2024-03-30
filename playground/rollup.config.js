const preactPlugin = require('../')

/**
 * @type {import("rollup").RollupOptions}
 */
module.exports = {
  input: 'server.js',
  output: {
    dir: 'dist',
    format: 'cjs',
  },
  plugins: [preactPlugin({ production: true })],
}
