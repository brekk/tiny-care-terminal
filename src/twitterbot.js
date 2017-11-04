import Twit from 'twit'
import scraperjs from 'scraperjs'
import {pipe, random, indexOf} from 'f-utility'
import Future from 'fluture'

import config from './config'
import barf from './barf'

const T = new Twit({
  consumer_key: config.keys.consumer_key,
  consumer_secret: config.keys.consumer_secret,
  access_token: config.keys.access_token,
  access_token_secret: config.keys.access_token_secret,
  timeout_ms: 60 * 1000 // optional HTTP request timeout to apply to all requests.
})

const options = {
  exclude_replies: true, include_rts: false, count: 1
}

function getTweet(who) {
  who = who || `tinycarebot`
  return config.apiKeys ? apiTweet(who) : scrapeTweet(who)
}

function apiTweet(who) {
  options.screen_name = who
  return new Future((reject, resolve) => {
    T.get(`statuses/user_timeline`, options, function getData(err, data) {
      if (err) {
        reject(`This didn't work. Maybe you didn't set up the twitter API keys?`)
      } else {
        resolve({text: data[0].text, bot: data[0].user.screen_name})
      }
    })
  })
}

const scrapeTweets = ($) => $(`.js-tweet-text.tweet-text`).map(
  function perTweet() {
    return $(this).text()
  }
).get()

const fixLinks = (x) => {
  const pics = indexOf(`pic.twitter`, x)
  return (
    pics === -1 ?
      x :
      x.substr(0, pics) + ` ` + x.substr(pics)
  )
}
const futurify = (x) => new Future((reject, resolve) => {
  x.then(resolve, reject)
})

function scrapeTweet(bot) {
  const url = `https://twitter.com/${bot}`
  barf(`scraping ${url} ...`)
  const promise = scraperjs.StaticScraper.create(url).scrape(scrapeTweets)
  return futurify(promise)
    .map(pipe(
      random.pick,
      fixLinks,
      (text) => ({
        text,
        bot
      })
    ))
    .mapRej(
      () => new Error(`Can't scrape tweets. Maybe the user is private or doesn't exist?`)
    )
}

module.exports.getTweet = getTweet
