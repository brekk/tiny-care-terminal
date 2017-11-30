const germs = require(`germs`)
const pkg = require(`./package.json`)
const utils = require(`nps-utils`)

const GERMS = germs.build(pkg.name, {
  readme: `echo "documentation readme -s API src/*.js"`,
  prepublishOnly: `nps care`
})

GERMS.scripts.lint.jsdoc = `echo "documentation lint"`

module.exports = GERMS
