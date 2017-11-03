import fs from 'fs'
import {I} from 'f-utility'
import config from './config'
const {debug = false} = config
const logger = (
  debug ?
    fs.appendFile :
    I
)
const barf = (tag, ...x) => logger(
  `barf.log`,
  `${tag} ${x.join(`\n * `)}\n`,
  `utf8`,
  (e) => {
    if (e) throw e
  }
)
export default barf
