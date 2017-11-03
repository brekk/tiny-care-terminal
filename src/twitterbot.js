import Twit from 'twit'
import scraperjs from 'scraperjs'
import {random, indexOf} from 'f-utility'

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
  return new Promise(function apiTweetAsync(resolve, reject) {
    T.get(`statuses/user_timeline`, options, function getData(err, data) {
      if (err) {
        reject(`This didn't work. Maybe you didn't set up the twitter API keys?`)
      } else {
        resolve({text: data[0].text, bot: data[0].user.screen_name})
      }
    })
  })
}

function scrapeTweet(who) {
  const url = `https://twitter.com/${who}`
  barf(`scraping ${url} ...`)
  return new Promise((resolve, reject) => {
    scraperjs.StaticScraper.create(url)
      .scrape(($) => {
        return $(`.js-tweet-text.tweet-text`).map(function mapFn() {
          return $(this).text()
        }).get()
      })
      .then((tweets) => {
        const tweet = random.pick(tweets)
        const pics = indexOf(`pic.twitter`, tweet)
        const fix = (x) => (
          pics === -1 ?
            x :
            x.substr(0, pics) + ` ` + x.substr(pics)
        )
        resolve({text: fix(tweet), bot: who})
      }, () => {
        reject(`Can't scrape tweets. Maybe the user is private or doesn't exist?`)
      })
  })
}

module.exports.getTweet = getTweet
