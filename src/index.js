'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const axios = require('axios')
const rimraf = require('rimraf')
const psList = require('ps-list')
const cron = require('node-cron')
const config = require('../config')
const {exec} = require('child_process')
const system = require('node-os-utils')
const bot = require('./util/lib/Telegram')
const getLastAlertTime = require('./util/helpers/getLastAlertTime')
const telegramUserId = config.TELEGRAM_USER_ID

;(async () => {
	const jungleHuntBot = bot(true)

	const toInfinityAndBeyond = (msg) => {
		if (!msg.text.includes(':')) {
			startListScraper([], true)
			startSearchTermScraper(true)
			return
		}

		if (msg.text.includes('keywords')) {
			startSearchTermScraper()
		} else if (msg.text.includes('lists')) {
			const args = msg.text.split(' ')
			startListScraper(args.slice(1))
		} else {
			jungleHuntBot.sendMessage(msg.chat.id, "That's not a valid command")
		}
	}

	const killChrome = (processes) => {
		const puppeteer = processes.filter((ps) => ps.name === 'chrome')
		const puppeteerPids = puppeteer.map((ps) => ps.pid)
		puppeteerPids.forEach((pid) => {
			exec(`kill -9 ${pid}`, (error) => {
				if (error)
					jungleHuntBot.sendMessage(
						telegramUserId,
						'There was an error killing the process'
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
		const listScraperPids = listScraper.map((ps) => ps.pid)
		listScraperPids.forEach((pid) => {
			exec(`kill -9 ${pid}`, (error) => {
				if (error)
					jungleHuntBot.sendMessage(
						telegramUserId,
						'There was an error killing the process'
					)
			})
		})
	}

	const killSearchTermScraper = (processes) => {
		const searchTermScraper = processes.filter((ps) =>
			ps.cmd.includes('node /app/src/scripts/scrape/searchTerms.js')
		)
		const searchTermScraperPids = searchTermScraper.map((ps) => ps.pid)
		searchTermScraperPids.forEach((pid) => {
			exec(`kill -9 ${pid}`, (error) => {
				if (error)
					jungleHuntBot.sendMessage(
						telegramUserId,
						'There was an error killing the process'
					)
			})
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

		if (args.length > 0) {
			if (args.length === 1) {
				initArgs = ` -l ${args[0]}`
			} else if (args.length === 2) {
				initArgs = ` -l ${args[0]} -c ${args[1]}`
			} else if (args.length === 3) {
				initArgs = ` -s "${args.join(', ')}"`
			}

			jungleHuntBot.sendMessage(
				telegramUserId,
				`Starting list scraper with arguments: ${initArgs}`
			)
		}

		// switch (args.length) {
		// 	case 0:
		// 		break
		// 	case 1:
		// 		initArgs = ` -l ${args[0]}`
		// 	case 2:
		// 		initArgs = ` -l ${args[0]} -c ${args[1]}`
		// 	case 3:
		// 		initArgs = ` -s "${args.join(', ')}"`
		// }

		exec(
			`node /app/src/scripts/scrape/main.js${initArgs}${
				delay ? ' -d' : ''
			}`,
			async (error) => {
				if (error) {
					jungleHuntBot.sendMessage(
						telegramUserId,
						'👨‍🚀 Houston, we have a problem with the list scraper'
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
						telegramUserId,
						'👨‍🚀 Houston, we have a problem with the search term scraper'
					)

					await killItWithFire()
				}
			}
		)
	}

	const getCurrentMemoryUsage = async () => {
		const memory = system.mem

		return await memory
			.used()
			.then((info) =>
				Math.ceil(
					(parseFloat(info.usedMemMb) / parseFloat(info.totalMemMb)) *
						100
				)
			)
	}

	const getCurrentCpuUsage = async () => {
		const cpu = system.cpu

		return await cpu.usage().then((info) => info.toFixed(2))
	}

	const showServerStats = async (msg) => {
		const command = msg.text.split(':')[1]

		switch (command) {
			case 'cpu':
				const usedCpuPercentage = await getCurrentCpuUsage()

				jungleHuntBot.sendMessage(
					msg.chat.id,
					`We're currently using ${usedCpuPercentage}% CPU`
				)
				break
			case 'ram':
				const usedMemoryPercentage = await getCurrentMemoryUsage()

				jungleHuntBot.sendMessage(
					msg.chat.id,
					`We're currently using ${usedMemoryPercentage}% memory`
				)
				break
			case 'ps':
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
					`<b>Puppeteer:</b> ${puppeteerPids.join(
						', '
					)}<pre>\n</pre><b>Search Term Scraper:</b> ${searchTermScraperPid.join(
						', '
					)}<pre>\n</pre><b>List Scraper:</b> ${listScraperPid.join(
						', '
					)}`,
					{parse_mode: 'HTML'}
				)
				break
		}
	}

	const checkServerStats = async () => {
		const lastAlert = getLastAlertTime()
		const stats = {}

		stats.memory = await getCurrentMemoryUsage()
		stats.CPU = await getCurrentCpuUsage()

		Object.entries(stats).forEach(([metric, stat]) => {
			if (stat >= 75) {
				jungleHuntBot.sendMessage(
					telegramUserId,
					`🚨 Our ${metric} usage is currently at ${stat}`
				)
			}
		})
	}

	const killProcess = async (pid) => {
		const ps = await psList()

		switch (pid) {
			case 'chrome':
				killChrome(ps)
				removeDirectories()
				break
			case 'lists':
				killListScraper(ps)
				break
			case 'keywords':
				killSearchTermScraper(ps)
				break
			default:
				if (isNaN(parseFloat(pid))) {
					return
				}

				exec(`kill -9 ${pid}`, (error) => {
					if (error)
						jungleHuntBot.sendMessage(
							telegramUserId,
							'There was an error killing the process'
						)
				})
		}
	}

	const getRandomGiphy = async (searchTerm) => {
		const response = {}

		const url = [
			'https://api.giphy.com/v1/gifs/random',
			'?api_key=',
			config.GIPHY_API_KEY,
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
		if (msg.chat.id != telegramUserId) {
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
			if (!msg.text.includes(':')) {
				killItWithFire()
			}
			const process = msg.text.split(':')[1]
			await killProcess(process)
		} else if (msg.text.includes('/giphy')) {
			const giphy = await getRandomGiphy(msg.text.split(' ')[1])
			if (giphy.success) {
				jungleHuntBot.sendDocument(msg.chat.id, giphy.image)
			} else {
				jungleHuntBot.sendMessage(msg.chat.id, 'I failed you...')
			}
		} else if (msg.text === '😍') {
			jungleHuntBot.sendMessage(msg.chat.id, '😘')
		} else if (msg.text === '/help') {
			jungleHuntBot.sendMessage(
				msg.chat.id,
				'Available commands:<pre>\n\n</pre><b>/start</b><pre>\n</pre>:keywords<pre>\n</pre>:lists<pre>\n</pre><b>/stop</b><pre>\n</pre><b>/show</b><pre>\n</pre>:ram<pre>\n</pre>:cpu<pre>\n</pre>:ps<pre>\n</pre><b>/kill</b><pre>\n</pre>:chrome<pre>\n</pre>:keywords<pre>\n</pre>:lists<pre>\n</pre>:{pid}',
				{parse_mode: 'HTML'}
			)
		} else {
			jungleHuntBot.sendMessage(msg.chat.id, 'Huh?')
		}
	}

	jungleHuntBot.on('message', async (msg) => {
		await messageHandler(msg)
	})

	cron.schedule('* * * * *', () => {
		checkServerStats()
	})
})()
