var https = require("https");
const Twit = require('twit');
const Sentiment = require('sentiment');
const firebase = require('firebase');
var yahooStockPrices = require('yahoo-stock-prices');
var sentiment = new Sentiment();

var firapp = firebase.initializeApp({
    apiKey: "AIzaSyBRM0NZOn-dmrcovBxHyAXkNx0rtafRe6A",
    authDomain: "cxa-dashboard.firebaseapp.com",
    databaseURL: "https://cxa-dashboard.firebaseio.com",
    projectId: "cxa-dashboard",
    storageBucket: "",
    messagingSenderId: "79033749207"
});

const CONSUMER_KEY='XDcRHZ8Z6FqcEnyvtZbHiI4Rn'
const CONSUMER_SECRET='AMX6tyRbciK61AVtfWKP7HNDkNUwxmHt0SG1lcNu2FAyyYhW5l'
const ACCESS_TOKEN='877763988389363715-YPAKELFQSHsi33FVQklvX8Rf9h39MIO'
const ACCESS_TOKEN_SECRET='q3ljEXdL0GlKEzR7Rq7d9goIjBih7wWOdDEaExHyHwzp9'

let Tsen;
let Nsen;

const config_twitter = {
    consumer_key: CONSUMER_KEY,
    consumer_secret: CONSUMER_SECRET,
    access_token: ACCESS_TOKEN,
    access_token_secret: ACCESS_TOKEN_SECRET,
    timeout_ms: 60*1000
}

let api = new Twit(config_twitter);

// Filtering tweet text for repost links and unwanted terms
function get_text(tweet) {
    let txt = tweet.retweeted_status ? tweet.retweeted_status.full_text : tweet.full_text;
    return txt.split(/ |\n/).filter(v => !v.startsWith('http')).join(' ');
}

// Loading tweets from API
async function get_tweets(q, count) {
    let tweets = await api.get('search/tweets', {
        q: q,
        count: count,
        tweet_mode: 'extended',
        lang: 'en',
        result_type: 'mixed'
    });
    return tweets.data.statuses.map(get_text);
}

// Getting dates of past 7 days
var getDateArray = function(nDays) {
    var sdate = new Date();
    var slast = new Date(sdate.getTime() - (nDays * 24 * 60 * 60 * 1000));
    var sday = slast.getDate();
    var smonth = slast.getMonth()+1;
    var syear = slast.getFullYear();
    if (smonth < 9) {
        smonth = '0' + smonth;
    }
    if (sday < 9) {
        sday = '0' + sday;
    }
    var startDate = syear + '-' + smonth + '-' + sday;
    startDate = new Date(startDate);

    var edate = new Date();
    var eday = edate.getDate();
    var emonth = edate.getMonth()+1;
    var eyear = edate.getFullYear();
    if (emonth < 9) {
        emonth = '0' + emonth;
    }
    if (eday < 9) {
        eday = '0' + eday;
    }
    var endDate = eyear + '-' + emonth + '-' + eday;
    endDate = new Date(endDate);

    var arr = new Array();
    var dt = new Date(startDate);
    while (dt <= endDate) {
        var date = new Date(dt);
        datetime = date.getFullYear() + '-';
        if (date.getMonth() < 9) {
            datetime += '0' + date.getMonth() + '-'  + date.getDate();
        } else {
            datetime += date.getMonth() + '-'  + date.getDate();
        }
        arr.push(datetime);
        dt.setDate(dt.getDate() + 1);
    }
    return arr;
}

// Getting overall sentiment for past 7 days
async function main(keyword, nDays) {
    let dateArr = getDateArray(nDays);

    for (var cdate = 0; cdate < dateArr.length; cdate++) {
        var query = keyword + ' since:' + dateArr[cdate];
        var tweets = await get_tweets(query, 200);
        var tempSentimentArr = [];
        for (var t=0; t < tweets.length; t++) {
            var current_tweet = tweets[t];
            sendTweetToDB(current_tweet);
            sendScoretoDB(current_tweet);
        }
    }
}

function sendTweetToDB(tweet) {
    firebase.database().ref().child('TWEETS').push().set(tweet);
    console.log('Sent tweet to DB!');
}

function sendScoretoDB(tweet) {
    var result = sentiment.analyze(tweet).score;
    firebase.database().ref().child('SCORES').push().set(result);
}

function sendAvgScoreToDB() {
    let sum = 0;
    let arr;
    firebase.database().ref().child('SCORES').once('value', function(snapshot) {
        let score = Object.values(snapshot.val());
        sum += score;
        arr.push(score);
    })
}

async function retrieveTweets() {
    var tweets = [];
    firebase.database().ref().child('TWEETS').once('value').then(async function(snapshot) {
        var data = await snapshot.val();
        await tweets.push(data)
    })
    return await tweets;
}

function retrieveScores() {
    var sum = 0
    let scores = [];
    var ref = firebase.database().ref().child('SCORES');
    
    var scoresPromise = new Promise(function(resolve, reject) {
      ref.once('value').then(function(snapshot) {
        var score = Object.values(snapshot.val());
        scores.push(score);
        if (scores.length === snapshot.length) {
          resolve(scores);
        }
      })
    })
    
    scoresPromise.then(function(scoreList) {
      var data = JSON.stringify(scoreList);
      console.log(data)
    })
}

function getStocks(symbol) {
    var username = "0bca326376c9a37eb5221012d5d7952c";
    var password = "deea5fe806b7df4c31761b1bb43467d6";
    var auth = "Basic " + new Buffer(username + ':' + password).toString('base64');
    
    var request = https.request({
        method: "GET",
        host: "api.intrinio.com",
        path: "/companies?ticker=" + symbol,
        headers: {
            "Authorization": auth
        }
    }, function(response) {
        var json = "";
        response.on('data', function (chunk) {
            json += chunk;
        });
        response.on('end', function() {
            var company = JSON.parse(json);
            console.log(company);
            // for (var t = 0; t < company.securities.length; t++) {
            //     if (company.securities[t].ticker == 'AAPL') {
            //         console.log(company.securities[t].ticker);
            //     }
            // }
        });
    });
    
    request.end();    
}

function getStocks(nDays) {
    var sdate = new Date();
    var slast = new Date(sdate.getTime() - (nDays * 24 * 60 * 60 * 1000));
    var sday = slast.getDate();
    var smonth = slast.getMonth();
    var syear = slast.getFullYear();
    if (smonth < 9) {
        smonth = '0' + smonth;
    }
    if (sday < 9) {
        sday = '0' + sday;
    }

    var edate = new Date();
    var eday = edate.getDate();
    var emonth = edate.getMonth();
    var eyear = edate.getFullYear();
    if (emonth < 9) {
        emonth = '0' + emonth;
    }
    if (eday < 9) {
        eday = '0' + eday;
    }

    yahooStockPrices.getHistoricalPrices(smonth, sday, syear, emonth, eday, eyear, 'AAPL', '1d', function(err, prices) {
        console.log(prices);
        sendStocksToDB(prices, 'STOCK30');
    });
}

function sendStocksToDB(stocks, path) {
    for (var s = 0; s < stocks.length; s++) {
        firebase.database().ref().child(path).push().set(stocks[s]);
    }
    console.log('Sent stocks to DB');
}
