'use strict'

const fs = require('fs')
const os = require('os')
require('dotenv').config()
const rimraf = require('rimraf')
const kill = require('tree-kill')
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
				if (msg.text.includes(':')) {
					const args = msg.text.split(':')
					const list = args[1]
					const category = args[2]
					const subCategory = args[3]

					if (args.length === 4) {
						exec(`node /app/src/scripts/scrape/main.js -s "${list}, ${category}, ${subCategory}"`)
					} else {
						let launchArgs = `-l ${list}`
						launchArgs += category ? ` -c ${category}` : ''

						exec(`node /app/src/scripts/scrape/main.js ${launchArgs}`)
					}
				} else {
					exec('node scripts/scrape/main.js')
				}
			} else if (msg.text.includes('/stop')) {
				find('name', 'main.js', true).then(function(list) {
					list.forEach((process) => {
						kill(process.pid, 'SIGKILL')
					})
				})

				find('name', 'puppeteer', true).then(function(list) {
					list.forEach((process) => {
						kill(process.pid, 'SIGKILL')
					})
				})

				const removeDirectories = new Promise((resolve) => {
					rimraf(`${os.tmpdir()}/puppeteer`, () => {
						resolve()
					})
				})

				removeDirectories.then(() => {
					fs.mkdirSync(`${os.tmpdir()}/puppeteer`)
				})
			}
		}
	})
})()
