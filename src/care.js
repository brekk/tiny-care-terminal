#!/usr/bin/env node
import path from 'path'
// import {spawn} from 'child_process'
import ansiArt from 'ansi-art'
import blessed from 'blessed'
import bunnySay from 'sign-bunny'
import chalk from 'chalk'
import contrib from 'blessed-contrib'
import notifier from 'node-notifier'
import weather from 'weather-js'
import yosay from 'yosay'
import execa from 'execa'
import {pipe, merge, curry, map} from 'f-utility'

import barf from './barf'
import config from './config'
import twitterbot from './twitterbot'
import gitbot from './gitbot'
import pomodoro from './pomodoro'

let POMODORO_MODE = false
const WEATHER_CONFIG = {
  search: config.weather,
  degreeType: (config.celsius ? `C` : `F`)
}
const BLESSED_SCREEN_CONFIG = {
  fullUnicode: true, // emoji or bust
  smartCSR: true,
  autoPadding: true,
  title: config.terminal_title
}

const tomatoStyle = (fn) => (
  POMODORO_MODE && fn()
)

const pomodoroHandlers = map(tomatoStyle, {
  onTick: () => {
    const remainingTime = pom.getRemainingTime()
    const statusText = (
      pom.isInBreak() ?
        ` (Break Started) ` :
        pom.isStopped() ?
          ` (Press "s" to start) ` :
          ` (Press "s" to resume) `
    )
    const content = `In Pomodoro Mode: ${remainingTime} ${statusText}`
    const duration = `Duration: ${pom.getRunningDuration()} Minutes,`
    const breaktime = `Break Time: ${pom.getBreakDuration()} Minutes`
    const metaData = [
      `${duration} ${breaktime}`,
      `commands: `,
      `s - start/pause/resume `,
      `e - stop `,
      `u - update duration `,
      `b - update break time`
    ].join(`\n`)
    parrotBox.content = getAnsiArt(content) + metaData
    screen.render()
  },
  onBreakStarts: () => {
    notifier.notify({
      title: `Pomodoro Alert`,
      message: `Break Time!`,
      sound: true,
      timeout: 30
    })
  },
  onBreakEnds: () => {
    notifier.notify({
      title: `Pomodoro Alert`,
      message: `Break Time Ends!`,
      sound: true,
      timeout: 30
    })
  }
})

const pom = pomodoro(pomodoroHandlers)

const makeBox = (label) => ({
  label,
  tags: true,
  border: {
    type: `line`
  },
  style: {
    fg: `white`,
    border: { fg: `cyan` },
    hover: { border: { fg: `green` } }
  }
})

const makeScrollBox = pipe(
  makeBox,
  merge({
    scrollable: true,
    scrollbar: { ch: ` ` },
    style: {
      scrollbar: { bg: `green`, fg: `white` }
    },
    keys: true,
    vi: true,
    alwaysScroll: true,
    mouse: true
  })
)

const makeGraphBox = pipe(
  makeBox,
  merge({
    barWidth: 5,
    xOffset: 4,
    maxHeight: 10
  })
)

const updateCommitsGraph = (today, week) => commits.setData(
  {
    titles: [`today`, `week`],
    data: [today, week]
  }
)

const screen = blessed.screen(BLESSED_SCREEN_CONFIG)

// Quit on Escape, q, or Control-C.
screen.key([`escape`, `q`, `C-c`], () => process.exit(0))

// Refresh on r, or Control-R.
screen.key([`r`, `C-r`], tick)

screen.key([`s`, `C-s`], () => {
  if (!POMODORO_MODE) {
    return
  }
  if (pom.isStopped()) {
    pom.start()
  } else if (pom.isPaused()) {
    pom.resume()
  } else {
    pom.pause()
    pomodoroHandlers.onTick()
  }
})

screen.key([`e`, `C-e`], tomatoStyle(
  () => {
    pom.stop()
    pomodoroHandlers.onTick()
  }
))

screen.key([`u`, `C-u`], tomatoStyle(
  () => {
    pom.updateRunningDuration()
    pomodoroHandlers.onTick()
  }
))

screen.key([`b`, `C-b`], tomatoStyle(
  () => {
    pom.updateBreakDuration()
    pomodoroHandlers.onTick()
  }
))

screen.key([`p`, `C-p`], () => {
  if (POMODORO_MODE) {
    pom.stop()
    POMODORO_MODE = false
    doTheTweets()
    parrotBox.removeLabel(``)
  } else {
    parrotBox.setLabel(` 🍅 `)
    POMODORO_MODE = true
    pomodoroHandlers.onTick()
  }
})
const of = curry((props, X) => new X(props))

const grid = of({rows: 12, cols: 12, screen: screen}, contrib.grid)
// grid.set(row, col, rowSpan, colSpan, obj, opts)

const weatherBox = grid.set(0, 8, 2, 4, blessed.box, makeScrollBox(` 🌤 `))
const todayBox = grid.set(0, 0, 4, 6, blessed.box, makeScrollBox(` 📝  Last 24 Hours `))
const weekBox = grid.set(4, 0, 8, 6, blessed.box, makeScrollBox(` 📝  Week `))
const commits = grid.set(0, 6, 6, 2, contrib.bar, makeGraphBox(`Commits`))
const parrotBox = grid.set(6, 6, 6, 6, blessed.box, makeScrollBox(` 🔥  @${config.twitter[0]}`))

const tweetBoxes = {
  [config.twitter[1]]: grid.set(2, 8, 1, 4, blessed.box, makeBox(` 💖  @${config.twitter[1]}`)),
  [config.twitter[2]]: grid.set(3, 8, 1, 4, blessed.box, makeBox(` 💬  @${config.twitter[2]}`)),
  [config.twitter[3]]: grid.set(4, 8, 1, 4, blessed.box, makeBox(` 👆🏻  @${config.twitter[3]}`)),
  [config.twitter[4]]: grid.set(5, 8, 1, 4, blessed.box, makeBox(` 🖼  @${config.twitter[4]}`))
}

tick()
setInterval(tick, 1000 * 60 * config.updateInterval)

function tick() {
  doTheWeather()
  doTheTweets()
  doTheCodes()
}

function doTheWeather() {
  weather.find(WEATHER_CONFIG, function grabWeather(_, result) {
    if (result && result[0] && result[0].current) {
      let json = result[0]
      // TODO: add emoji for this thing.
      let skytext = json.current.skytext.toLowerCase()
      let currentDay = json.current.day
      let degreetype = json.location.degreetype
      let forecastString = ``
      json.forecast
        .filter((forecast) => (forecast.day === currentDay))
        .map((forecast) => {
          let skytextforecast = forecast.skytextday.toLowerCase()
          return [
            `Today, it will be ${skytextforecast} with a forecast high of ${forecast.high}`,
            `°${degreetype} and a low of ${forecast.low}°${degreetype}.`
          ].join(``)
        })
      weatherBox.content = [
        `In ${json.location.name} it's ${json.current.temperature}°`,
        `${degreetype} and ${skytext} right now. ${forecastString}`
      ].join(``)
    } else {
      weatherBox.content = `Having trouble fetching the weather for you :(`
    }
  })
}

function doTheTweets() {
  for (let which in config.twitter) {
    // Gigantor hack: first twitter account gets spoken by the party parrot.
    // eslint-disable-next-line eqeqeq
    if (which == 0) {
      if (POMODORO_MODE) {
        return
      }
      const primaryRender = (tweet = {}) => {
        const {text = `You're doing just fine!`} = tweet
        parrotBox.content = getAnsiArt(text)
        screen.render()
      }
      twitterbot.getTweet(config.twitter[which]).fork(primaryRender, primaryRender)
    } else {
      twitterbot.getTweet(config.twitter[which]).fork(() => {
        tweetBoxes[config.twitter[1]].content = tweetBoxes[config.twitter[2]].content = (
          `Can't read Twitter without some API keys  🐰. Maybe try the scraping version instead?`
        )
      }, (tweet) => {
        tweetBoxes[tweet.bot.toLowerCase()].content = tweet.text
        screen.render()
      })
    }
  }
}

function doTheCodes() {
  let todayCommits = 0
  let weekCommits = 0

  function getCommits(data = ``, container) {
    const content = colorizeLog(data)
    container.content += content
    const commitRegex = /(.......) (- .*)/g
    return (
      container && container.content ?
        (container.content.match(commitRegex) || []).length :
        `0`
    )
  }

  const helper = `sh ${path.resolve(`standup-helper.sh`)}`
  if (config.gitbot.toLowerCase() === `gitstandup`) {
    const today = execa(helper, [`-m ` + config.depth, config.repos])
    const week = execa(helper, [`-m ` + config.depth + ` -d 7`, config.repos])
    todayBox.content = ``
    weekBox.content = ``
    today.then((data) => {
      todayCommits = getCommits(`${data}`, todayBox)
      updateCommitsGraph(todayCommits, weekCommits)
      screen.render()
    })
    week.then((data) => {
      weekCommits = getCommits(`${data}`, weekBox)
      updateCommitsGraph(todayCommits, weekCommits)
      screen.render()
    })
  } else {
    gitbot.findGitRepos(config.repos, config.depth - 1, (findErr, allRepos) => {
      if (findErr) {
        todayBox.content = findErr
        screen.render()
        return findErr
      }
      gitbot.getCommitsFromRepos(allRepos, 1, (commitError, data) => {
        if (commitError) {
          todayBox.content = commitError
          screen.render()
          return commitError
        }
        todayBox.content = ``
        todayCommits = getCommits(`${data}`, todayBox)
        updateCommitsGraph(todayCommits, weekCommits)
        screen.render()
      })
      gitbot.getCommitsFromRepos(allRepos, 7, (commitError, data) => {
        if (commitError) {
          weekBox.content = commitError
          screen.render()
          return commitError
        }
        weekBox.content = ``
        weekCommits = getCommits(`${data}`, weekBox)
        updateCommitsGraph(todayCommits, weekCommits)
        screen.render()
      })
    })
  }
}

function colorizeLog(text) {
  let lines = text.split(`\n`)
  let regex = /(.......) (- .*) (\(.*\)) (<.*>)/i
  let nothingRegex = /Seems like .* did nothing/i
  for (let i = 0; i < lines.length; i++) {
    // If it's a path
    if (lines[i][0] === `/`) {
      lines[i] = formatRepoName(lines[i], `/`)
    } else if (lines[i][0] === `\\`) {
      lines[i] = formatRepoName(lines[i], `\\`)
    } else {
      // It may be a mean "seems like .. did nothing!" message. Skip it
      let nothing = lines[i].match(nothingRegex)
      if (nothing) {
        lines[i] = ``
        continue
      }

      // It's a commit.
      let matches = lines[i].match(regex)
      if (matches) {
        lines[i] = chalk.red(matches[1]) + ` ` + matches[2] + ` ` +
            chalk.green(matches[3])
      }
    }
  }
  return lines.join(`\n`)
}

function formatRepoName(line, divider) {
  const l = line.split(divider)
  return `\n` + chalk.yellow(l[l.length - 1])
}

/* eslint-disable no-irregular-whitespace */
const llamaSay = (text) => `
    ${text}
    ∩∩
　（･ω･）
　　│ │
　　│ └─┐○
　  ヽ　　　丿
　　 　∥￣∥`

const catSay = (text) => `
      ${text}

      ♪ ガンバレ! ♪
  ミ ゛ミ ∧＿∧ ミ゛ミ
  ミ ミ ( ・∀・ )ミ゛ミ
   ゛゛ ＼　　　／゛゛
   　　 　i⌒ヽ ｜
  　　 　 (＿) ノ
   　　　　　 ∪`

/* eslint-enable no-irregular-whitespace */

function getAnsiArt(textToSay) {
  let artFileRegex = /.ansi$/
  // If config.say is custom art file path, then return custom art
  if (artFileRegex.test(config.say)) {
    return ansiArt.get({ filePath: config.say, speechText: textToSay })
  }
  barf(`ansi art?`, textToSay, config.say)
  switch (config.say) {
  case `bunny` : return bunnySay(textToSay)
  case `llama` : return llamaSay(textToSay)
  case `cat` : return catSay(textToSay)
  case `yeoman`: return yosay(textToSay)
  default : return ansiArt.get({ artName: config.say, speechText: textToSay })
  }
}
