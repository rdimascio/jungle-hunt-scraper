'use strict'

const fs = require('fs')
const os = require('os')
require('dotenv').config()
const rimraf = require('rimraf')
const kill = require('tree-kill')
const psList = require('ps-list')
const {exec} = require('child_process')
const bot = require('./util/lib/Telegram')

// Matches "/start"
;(async () => {
	const jungleHuntBot = bot(true)
	let command

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
					exec('node /app/src/scripts/scrape/main.js')
				}
			} else if (msg.text.includes('/stop')) {
				const processes = await psList()
				const puppeteer = processes.filter(ps => ps.name === 'chrome')
				const scraper = processes.filter(ps => ps.cmd === command)
				const puppeteerPids = puppeteer.map(ps => ps.pid)
				const scraperPid = scraper.map(ps => ps.id)

				kill(scraperPid, 'SIGINT')
				puppeteerPids.forEach(pid => {
					kill(pid, 'SIGKILL')
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
