'use strict'

const fs = require('fs')
const os = require('os')
require('dotenv').config()
const path = require('path')
const rimraf = require('rimraf')
const kill = require('tree-kill')
const psList = require('ps-list')
const {exec} = require('child_process')
const bot = require('./util/lib/Telegram')

// Matches "/start"
;(async () => {
	const jungleHuntBot = bot(true)

	jungleHuntBot.on('message', async (msg) => {
		if (msg.chat.id == process.env.TELEGRAM_USER_ID) {
			if (msg.text.includes('/start')) {
				if (msg.text.includes(':')) {
					const args = msg.text.split(':')
					const list = args[1]
					const category = args[2]
					const subCategory = args[3]

					if (args.length === 4) {
						exec(
							`node /app/src/scripts/scrape/main.js -s "${list}, ${category}, ${subCategory}"`,
							(error) => console.log(error)
						)
					} else {
						let launchArgs = `-l ${list}`
						launchArgs += category ? ` -c ${category}` : ''

						exec(
							`node /app/src/scripts/scrape/main.js ${launchArgs}`,
							(error) => console.log(error)
						)
					}
				} else {
					exec('node /app/src/scripts/scrape/main.js', (error) =>
						console.log(error)
					)
				}
			} else if (msg.text.includes('/stop')) {
				const processes = await psList()
				const puppeteer = processes.filter((ps) => ps.name === 'chrome')
				const scraper = processes.filter((ps) =>
					ps.cmd.includes('node /app/src/scripts/scrape/main.js')
				)
				const puppeteerPids = puppeteer.map((ps) => ps.pid)
				const scraperPid = scraper.map((ps) => ps.pid)

				kill(scraperPid, 'SIGKILL')
				puppeteerPids.forEach((pid) => {
					kill(pid, 'SIGKILL')
				})

				const removeDirectories = new Promise((resolve) => {
					const browserPath = path.join(`${os.tmpdir()}`, 'puppeteer')
					rimraf(browserPath, () => {
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
