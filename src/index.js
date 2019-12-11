'use strict'

require('dotenv').config()
const find = require('find-process')
const {exec} = require('child_process')
const bot = require('./util/lib/Telegram')
// const TelegramBot = require('node-telegram-bot-api')

// const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
// const jungleHuntBot = new TelegramBot(telegramBotToken, {polling: true})

// Matches "/start"
;(async () => {
	const jungleHuntBot = bot(true)

	jungleHuntBot.on('message', (msg) => {
		if (msg.chat.id == process.env.TELEGRAM_USER_ID) {
			if (msg.text.includes('/start')) {
				let flag = msg.text.includes(':')
					? msg.text.split(':')[1]
					: false
				flag = flag ? ` -l ${flag}` : ''

				jungleHuntBot.sendMessage(msg.chat.id, `Started with: ${flag}`)
				flag
					? exec(`node scripts/scrape/main.js${flag}`)
					: exec('node scripts/scrape/main.js')
			} else if (msg.text.includes('/stop')) {
				find('name', 'main.js', true).then(function(list) {
					list.forEach((process) => {
						exec(`kill -9 ${process.pid}`)
					})
				})

				find('name', 'puppeteer', true).then(function(list) {
					list.forEach((process) => {
						exec(`kill -9 ${process.pid}`)
					})
				})
			}
		}
	})
})()
