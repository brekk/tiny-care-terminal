const pkg = require(`../package.json`)
const {bundle} = require(`germs`)

module.exports = bundle({
  name: pkg.name,
  alias: {
  },
  input: `src/care.js`,
  output: {
    name: `hugs`,
    file: `./${pkg.name}.js`,
    format: `umd`
  }
})
