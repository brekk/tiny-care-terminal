// import path from 'path'
import username from 'git-user-name'
import resolveDir from 'resolve-dir'
import subdirs from 'subdirs'
import isGit from 'is-git'
import gitlog from 'gitlog'
import async from 'async'
import {fork, filter, map, I, curry, pipe} from 'f-utility'
import {trace} from 'xtrace'
import {e0, e1} from 'entrust'
import Future from 'fluture'

const all = (x) => Future.parallel(Infinity, x)

import barf from './barf'

const mapRej = e1(`mapRej`)
const sort = e0(`sort`)
const reverse = e0(`reverse`)

const author = username()

const fail = curry((cb, x) => cb(new Error(x), null))

// const subdirsF = Future.encaseN2(subdirs)
const subdirsF = curry(
  (repo, depth) => new Future((reject, resolve) => {
    subdirs(repo, depth, (err, data) => (
      err ?
        reject(err) :
        resolve(data.concat(repo))
    ))
  })
)
// const isGitF = Future.encaseN(isGit)
const isGitF = curry(
  (path) => later((reject, resolve) => {
    isGit(path, (err, data) => (
      err ?
        reject(err) :
        resolve(data)
    ))
  })
)
const isDotGit = (x) => x.indexOf(`.git`) > -1

/*
Go through all `repos` and look for subdirectories up to a given `depth`
and look for repositories.
Calls `callback` with array of repositories.
*/
function findGitRepos(repos, depth, callback) {
  pipe(
    map(pipe(
      resolveDir,
      (repo) => subdirsF(repo, depth)
    )),
    all,
    map(([x]) => x),
    fork(callback, (x) => callback(null, x))
  )(repos)
}

/*
 * returns all commits of the last given `days`.
 * Calls `callback` with line-seperated-strings of the formatted commits.
 */
function getCommitsFromRepos(repos, days, callback) {
  let cmts = []
  async.each(repos, (repo, repoDone) => {
    try {
      gitlog({
        repo: repo,
        all: true,
        number: 100, // max commit count
        since: `${days} days ago`,
        fields: [`abbrevHash`, `subject`, `authorDateRel`, `authorName`],
        author
      }, (err, logs) => {
        // Error
        if (err) {
          fail(`Oh noes😱\nThe repo ${repo} has failed:\n${err}`)
        }
        // Find user commits
        const commits = logs.map((c) => {
          // barf(`commit`, JSON.stringify(c))
          // filter simple merge commits
          if (c.status && c.status.length) {
            return [
              `${c.abbrevHash}`,
              `-`,
              `${c.subject}`,
              `(${c.authorDateRel})`,
              `<${c.authorName.replace(`@end@\n`, ``)}>`
            ].join(` `)
          }
        }).filter(I)

        // Add repo name and commits
        if (commits.length >= 1) {
          // Repo name
          cmts.push(repo)
          cmts.push(...commits)
        }

        repoDone()
      })
    } catch (err) {
      callback(err, null)
    }
  }, (err) => {
    callback(err, cmts.length > 0 ? cmts.join(`\n`) : `Nothing yet. Start small!`)
  })
}

export default {
  findGitRepos,
  getCommitsFromRepos
}
