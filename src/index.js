'use strict'

const fs = require('fs')
const os = require('os')
require('dotenv').config()
const path = require('path')
const axios = require('axios')
const rimraf = require('rimraf')
const psList = require('ps-list')
const cron = require('node-cron')
const {exec} = require('child_process')
const system = require('node-os-utils')
const bot = require('./util/lib/Telegram')

;(async () => {
	const jungleHuntBot = bot(true)

	const toInfinityAndBeyond = (msg) => {
		if (!msg.text.includes(':')) {
			startListScraper([], true)
			startSearchTermScraper(true)
			return
		}

		if (msg.text.includes('search-terms')) {
			startSearchTermScraper()
		} else if (msg.text.includes('list')) {
			const args = msg.text.split(' ')
			startListScraper(args.slice(1))
		}
	}

	const killChrome = (processes) => {
		const puppeteer = processes.filter((ps) => ps.name === 'chrome')
		const puppeteerPids = puppeteer.map((ps) => ps.pid)
		puppeteerPids.forEach((pid) => {
			exec(`kill -9 ${pid}`, (error) => {
				if (error)
					jungleHuntBot.sendMessage(
						process.env.TELEGRAM_USER_ID,
						error
					)
			})
		})
	}

	const removeDirectories = () => {
		const deleteAll = new Promise((resolve) => {
			const browserPath = path.join(`${os.tmpdir()}`, 'puppeteer')
			rimraf(browserPath, () => {
				resolve()
			})
		})

		deleteAll.then(() => {
			fs.mkdirSync(`${os.tmpdir()}/puppeteer`)
		})
	}

	const killListScraper = (processes) => {
		const listScraper = processes.filter((ps) =>
			ps.cmd.includes('node /app/src/scripts/scrape/main.js')
		)
		const listScraperPid = listScraper.map((ps) => ps.pid)
		exec(`kill -9 ${listScraperPid}`, (error) => {
			if (error)
				jungleHuntBot.sendMessage(process.env.TELEGRAM_USER_ID, error)
		})
	}

	const killSearchTermScraper = (processes) => {
		const searchTermScraper = processes.filter((ps) =>
			ps.cmd.includes('node /app/src/scripts/scrape/searchTerms.js')
		)
		const searchTermScraperPid = searchTermScraper.map((ps) => ps.pid)
		exec(`kill -9 ${searchTermScraperPid}`, (error) => {
			if (error)
				jungleHuntBot.sendMessage(process.env.TELEGRAM_USER_ID, error)
		})
	}

	const killItWithFire = async () => {
		const ps = await psList()
		killChrome(ps)
		killListScraper(ps)
		killSearchTermScraper(ps)
		removeDirectories()
	}

	const startListScraper = (args = [], delay = false) => {
		let initArgs = ''

		switch (args.length) {
			case 0:
				break
			case 1:
				initArgs = ` -l ${args[0]}`
			case 2:
				initArgs = ` -l ${args[0]} -c ${args[1]}`
			case 3:
				initArgs = ` -s "${args.join(', ')}"`
		}

		exec(
			`node /app/src/scripts/scrape/main.js
				${initArgs}
				${delay ? ' -d' : ''}
			`,
			async (error) => {
				if (error) {
					jungleHuntBot.sendMessage(
						process.env.TELEGRAM_USER_ID,
						'Houston, we have a problem with the list scraper'
					)

					await killItWithFire()
				}
			}
		)
	}

	const startSearchTermScraper = (delay = false) => {
		exec(
			`node /app/src/scripts/scrape/searchTerms.js${delay ? ' -d' : ''}`,
			async (error) => {
				if (error) {
					jungleHuntBot.sendMessage(
						process.env.TELEGRAM_USER_ID,
						'Houston, we have a problem with the search term scraper'
					)

					await killItWithFire()
				}
			}
		)
	}

	const showServerStats = async (msg) => {
		const command = msg.text.split(':')[1]

		switch (command) {
			case 'cpu':
				const cpu = system.cpu
				const usedCpuPercentage = await cpu.usage().then((info) => info)

				jungleHuntBot.sendMessage(
					msg.chat.id,
					`We're currently using ${usedCpuPercentage}% CPU`
				)
				break
			case 'memory':
				const memory = system.mem
				const usedMemoryPercentage = await memory
					.used()
					.then(
						(info) =>
							(parseFloat(info.usedMemMb) /
								parseFloat(info.totalMemMb)) *
							100
					)

				jungleHuntBot.sendMessage(
					msg.chat.id,
					`We're currently using ${usedMemoryPercentage}% memory`
				)
				break
			case 'processes':
				const ps = await psList()
				const puppeteer = ps.filter(
					(process) => process.name === 'chrome'
				)
				const puppeteerPids = puppeteer.map((process) => process.pid)

				const searchTermScraper = ps.filter((process) =>
					process.cmd.includes(
						'node /app/src/scripts/scrape/searchTerms.js'
					)
				)
				const searchTermScraperPid = searchTermScraper.map(
					(process) => process.pid
				)

				const listScraper = ps.filter((process) =>
					process.cmd.includes('node /app/src/scripts/scrape/main.js')
				)
				const listScraperPid = listScraper.map((process) => process.pid)

				jungleHuntBot.sendMessage(
					msg.chat.id,
					`
					Puppeteer:
						[${puppeteerPids.join(', ')}]
					
					Search Term Scraper:
						[${searchTermScraperPid.join(', ')}]
					
					List Scraper:
						[${listScraperPid.join(', ')}]
					`
				)
				break
		}
	}

	const killProcess = (pid) => {
		exec(`kill -9 ${pid}`, (error) => {
			if (error)
				jungleHuntBot.sendMessage(process.env.TELEGRAM_USER_ID, error)
		})
	}

	const getRandomGiphy = async (searchTerm) => {
		const response = {}

		const url = [
			'https://api.giphy.com/v1/gifs/random',
			'?api_key=',
			process.env.GIPHY_API_KEY,
		]

		if (searchTerm) url.push(`&tag=${searchTerm}`)

		return await axios
			.get(url.join(''))
			.then((res) => {
				response.success = true
				response.image = res.data.data.image_url
			})
			.catch((err) => {
				response.success = false
			})
			.then(() => response)
	}

	const messageHandler = async (msg) => {
		if (msg.chat.id != process.env.TELEGRAM_USER_ID) {
			jungleHuntBot.sendMessage(msg.chat.id, 'Do I know you?')
			return
		}

		if (!msg.text.includes('/')) {
			jungleHuntBot.sendMessage(msg.chat.id, 'At your service, master.')
			return
		}

		if (msg.text.includes('/start')) {
			jungleHuntBot.sendMessage(msg.chat.id, 'You got it boss 👍')
			toInfinityAndBeyond(msg)
		} else if (msg.text.includes('/stop')) {
			jungleHuntBot.sendMessage(msg.chat.id, 'Hammer time 👇')
			jungleHuntBot.sendDocument(
				msg.chat.id,
				'https://i.giphy.com/media/kgKrO1A3JbWTK/source.gif'
			)
			await killItWithFire()
		} else if (msg.text.includes('/show')) {
			showServerStats(msg)
		} else if (msg.text.includes('/kill')) {
			const process = msg.text.split(' ')[1]
			killProcess(process)
		} else if (msg.text.includes('/giphy')) {
			const giphy = await getRandomGiphy(msg.text.split(' ')[1])
			if (giphy.success) {
				jungleHuntBot.sendDocument(msg.chat.id, giphy.image)
			} else {
				jungleHuntBot.sendMessage(msg.chat.id, 'I failed you...')
			}
		} else {
			jungleHuntBot.sendMessage(msg.chat.id, 'Huh?')
		}
	}

	jungleHuntBot.on('message', async (msg) => {
		await messageHandler(msg)
	})

	// Run the search term scraper hourly
	cron.schedule('17 * * * *', () => {
		startSearchTermScraper(true)
	})

	// Run the list scraper daily
	cron.schedule('45 17 * * *', () => {
		startListScraper([], true)
	})
})()
