'use strict'

const TelegramBot = require('node-telegram-bot-api')

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
const jungleHuntBot = new TelegramBot(telegramBotToken, {polling: true})

module.exports = jungleHuntBot
