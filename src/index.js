'use strict'

const fs = require('fs')
const os = require('os')
require('dotenv').config()
const path = require('path')
const axios = require('axios')
const rimraf = require('rimraf')
const kill = require('tree-kill')
const psList = require('ps-list')
const {exec} = require('child_process')
const bot = require('./util/lib/Telegram')

;(async () => {
	const jungleHuntBot = bot(true)

	const toInfinityAndBeyond = (msg) => {
		if (!msg.text.includes(':')) {
			startListScraper(msg, [], true)
			startSearchTermScraper(msg, true)
			return
		}

		if (msg.text.includes('search-terms')) {
			startSearchTermScraper(msg)
		} else if (msg.text.includes('list')) {
			const args = msg.text.split(' ')
			startListScraper(msg, args.slice(1))
		}
	}

	const startListScraper = (msg, args = [], delay = false) => {
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
			(error) => {
				jungleHuntBot.sendMessage(
					msg.chat.id,
					'Houston, we have a problem with the list scraper'
				)
				jungleHuntBot.sendMessage(msg.chat.id, error)
			}
		)
	}

	const startSearchTermScraper = (msg, delay = false) => {
		exec(
			`node /app/src/scripts/scrape/searchTerms.js${delay ? ' -d' : ''}`,
			(error) => {
				jungleHuntBot.sendMessage(
					msg.chat.id,
					'Houston, we have a problem with the search term scraper'
				)
				jungleHuntBot.sendMessage(msg.chat.id, error)
			}
		)
	}

	const killChrome = (processes) => {
		const puppeteer = processes.filter((ps) => ps.name === 'chrome')
		const puppeteerPids = puppeteer.map((ps) => ps.pid)
		puppeteerPids.forEach((pid) => {
			kill(pid, 'SIGKILL')
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
		kill(listScraperPid, 'SIGKILL')
	}

	const killSearchTermScraper = (processes) => {
		const searchTermScraper = processes.filter((ps) =>
			ps.cmd.includes('node /app/src/scripts/scrape/searchTerms.js')
		)
		const searchTermScraperPid = searchTermScraper.map((ps) => ps.pid)
		kill(searchTermScraperPid, 'SIGKILL')
	}

	const killItWithFire = async () => {
		const ps = await psList()
		killChrome(ps)
		killListScraper(ps)
		killSearchTermScraper(ps)
		removeDirectories()
	}

	const getRandomGiphy = async (searchTerm) => {
		const response = {}

		const url = [
			'https://api.giphy.com/v1/gifs/random',
			'?api_key=',
			process.env.GIPHY_API_KEY,
		]

		if (searchTerm) url.push(`&q=${searchTerm}`)

		return await axios
			.get(url.join(''))
			.then((res) => {
				response.success = true
				response.image = res.data.image_url
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

		const command = msg.text.split('/')[1]

		if (command === 'start') {
			jungleHuntBot.sendMessage(msg.chat.id, 'You got it boss 👍')
			toInfinityAndBeyond(msg)
		} else if (command === 'stop') {
			jungleHuntBot.sendMessage(msg.chat.id, 'Hammer time 👇')
			jungleHuntBot.sendAnimation(
				msg.chat.id,
				'https://i.giphy.com/media/kgKrO1A3JbWTK/source.gif'
			)
			await killItWithFire()
		} else if (command === 'giphy') {
			const giphy = await getRandomGiphy(msg.text.split(' ')[1])
			if (giphy.success) {
				jungleHuntBot.sendAnimation(
					msg.chat.id,
					giphy.image
				)
			} else {
				jungleHuntBot.sendMessage(
					msg.chat.id,
					'I failed you...'
				)
			}
		} else {
			jungleHuntBot.sendMessage(
				msg.chat.id,
				'What do you want'
			)
		}
	}

	jungleHuntBot.on('message', async (msg) => {
		await messageHandler(msg)
	})
})()
