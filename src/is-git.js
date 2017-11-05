// import iniparser from 'iniparser'
import parseGitConfig from 'parse-git-config'
import pathExists from 'path-exists'
import {e0, e1} from 'entrust'
import {
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
import {trace} from 'xtrace'
import Future from 'fluture'

const exists = Future.encaseP(pathExists)
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

const isGit = (path) => pipe(
  getFolderName,
  forceTrailingSlash,
  add(`.git/config`),
  exists,
  chain((extant) => extant ? parser(path) : Future.of(false)),
  map(pipe(
    propOr(false, `core`),
    keys,
    length,
    (l) => l > 0
  )),
  mapRej(K(false))
)(path)

export default isGit
