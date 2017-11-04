import {curry, split, pipe} from 'f-utility'

const toLowerCase = (x) => x.toLowerCase()

const env = curry((envVar, def) => process.env[envVar] || def)
const eitherEnv = curry(
  (def, envVar1, envVar2) => process.env[envVar1] || process.env[envVar2] || def
)
const eitherEnvOrNone = eitherEnv(`none`)

const config = {
  // Accounts to read the last tweet from. The first one in the list will be
  // spoken by the party parrot.
  twitter: pipe(
    env(`TTC_BOTS`),
    toLowerCase,
    split(`,`)
  )(`javascriptdaily,selfcare_bot,magicrealismbot,jennyholzer,picdescbot`),

  // Use this to have a different animal say a message in the big box.
  say: pipe(
    env(`TTC_SAY_BOX`),
    toLowerCase
  )(`parrot`),
  // Set this to false if you want to scrape twitter.com instead of using
  // API keys. The tweets may include RTs in this case :(
  apiKeys: env(`TTC_APIKEYS`, `true`) === `true`,

  // Directories in which to run git-standup on for a list of your recent commits.
  repos: pipe(
    env(`TTC_REPOS`),
    split(`,`)
  )(`~/Code`),

  // Directory-depth to look for git repositories.
  depth: env(`TTC_REPOS_DEPTH`, 1),

  // Which method is to be used to read the git commits ('gitstandup' | 'gitlog').
  gitbot: env(`TTC_GITBOT`, `gitstandup`),

  // Where to check the weather for.
  // It's using weather.service.msn.com behind the curtains.
  weather: env(`TTC_WEATHER`, `San Francisco`),

  // Set to false if you're an imperial savage. <3
  celsius: env(`TTC_CELSIUS`, `false`) === `true`,

  terminal_title: (
    env(`TTC_TERMINAL_TITLE`, `true`) === `false` ?
      null :
      `🔥 OPEN-SOURCE 4 LYFE 🔥`
  ),

  updateInterval: pipe(
    env(`TTC_UPDATE_INTERVAL`),
    parseFloat
  )(5),

  keys: {
    consumer_key: eitherEnvOrNone(`TTC_CONSUMER_KEY`, `CONSUMER_KEY`),
    consumer_secret: eitherEnvOrNone(`TTC_CONSUMER_SECRET`, `CONSUMER_SECRET`),
    access_token: eitherEnvOrNone(`TTC_ACCESS_TOKEN`, `ACCESS_TOKEN`),
    access_token_secret: eitherEnvOrNone(`TTC_ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_SECRET`)
  },
  debug: eitherEnv(false, `TTC_DEBUG`, `DEBUG`)
}

export default config
