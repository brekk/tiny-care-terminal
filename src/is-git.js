// import iniparser from 'iniparser'
import parseGitConfig from 'parse-git-config'
import pathExists from 'path-exists'
import {e0, e1} from 'entrust'
import {
  curry,
  K,
  map,
  chain,
  propOr,
  add,
  length,
  pipe,
  split,
  keys
} from 'f-utility'
// import {trace} from 'xtrace'
import Future from 'fluture'

const checkPathExists = Future.encaseP(pathExists)
const parser = (cwd) => new Future(
  (reject, resolve) => parseGitConfig({cwd, path: `.git/config`}, (err, config) => (
    err ?
      reject(err) :
      resolve(config)
  ))
)
// const parser = Future.encaseN(iniparser.parse)

const pop = e0(`pop`)
const mapRej = e1(`chainRej`)

const getFolderName = pipe(
  split(`\\`),
  pop
)

const forceTrailingSlash = (x) => (
  (/\/$/).test(x) ?
    x :
    x + `/`
)

const parseConfig = curry(
  (path, extant) => (
    extant ?
      parser(path) :
      Future.of(false)
  )
)

const checkForCore = pipe(
  propOr({}, `core`),
  keys,
  length,
  (l) => l > 0
)
const inAllBadCasesReturnFalse = pipe(
  K,
  mapRej
)(false)

const isGit = (path) => pipe(
  getFolderName,
  forceTrailingSlash,
  add(`.git/config`),
  checkPathExists,
  chain(parseConfig(path)),
  map(checkForCore),
  inAllBadCasesReturnFalse
)(path)

export default isGit
