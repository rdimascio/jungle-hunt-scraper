'use strict'

const fs = require('fs')
const Logger = require('../../util/lib/Logger')
const Browser = require('../../util/lib/Browser')
const delay = require('../../util/helpers/delay')
const log = require('../../util/helpers/logMessages')
const args = require('minimist')(process.argv.slice(2))
const saveAsins = require('../../util/helpers/saveAsins')
const camelCase = require('../../util/helpers/camelCase')
const scrapeLists = require('../../util/helpers/scrapeLists')
const camelToClass = require('../../util/helpers/camelToClass')
const generateRandomNumbers = require('../../util/helpers/randomNumbers')
const getLastScrapeTime = require('../../util/helpers/getLastScrapeTime')
const bestSellerCategories = require('../../../data/categories/bestSeller')
const mostGiftedCategories = require('../../../data/categories/mostGifted')
const newReleaseCategories = require('../../../data/categories/newReleases')
const mostWishedForCategories = require('../../../data/categories/mostWishedFor')

;(async () => {
	let headless,
		logger,
		iteration = 0

	process.setMaxListeners(12)

	// We can handle our own termination signals, thank you
	// This is SUPER important since we're launching headless
	// with the handleSIGINT property set to false
	process.on('SIGINT', async () => {
		try {
			log.kill(logger)
			await headless.shutdown()
		} catch (error) {
			process.exit()
		}
	})

	let listArgs = args.l || args.list
	listArgs = listArgs && listArgs.split(',')
	let categoryArgs = args.c || args.cat
	categoryArgs = categoryArgs && categoryArgs.split(',')
	let startPosition = args.s || args.start
	startPosition = startPosition && startPosition.split(',')

	const listData = {}
	const start = new Date()
	const DEV = process.env.NODE_ENV === 'development'
	let lastScrapeTime = getLastScrapeTime()
	lastScrapeTime = lastScrapeTime ? parseFloat(lastScrapeTime) : false

	const listsToScrape = {
		bestSeller: {
			name: 'Best Seller',
			code: 'bs',
			categories: [...Object.entries(bestSellerCategories)],
		},
		mostGifted: {
			name: 'Most Gifted',
			code: 'mg',
			categories: [...Object.entries(mostGiftedCategories)],
		},
		newRelease: {
			name: 'New Release',
			code: 'bsnr',
			categories: [...Object.entries(newReleaseCategories)],
		},
		mostWishedFor: {
			name: 'Most Wished For',
			code: 'mw',
			categories: [...Object.entries(mostWishedForCategories)],
		},
	}

	const lists = Object.entries(listsToScrape)

	const getListIndex = (listName) => {
		let i = null
		lists.forEach((list, index) => {
			if (list.includes(listName)) {
				i = index
			}
		})

		return i
	}

	const getCategoryIndex = (listName, categoryName) => {
		let i = null

		listsToScrape[listName].categories.forEach((category, index) => {
			if (category.includes(categoryName)) {
				i = index
			}
		})

		return i
	}

	// For each list
	for (let [listIndex, [list, details]] of lists.entries()) {
		if (
			listArgs &&
			!listArgs.includes('all') &&
			!listArgs.includes(camelToClass(list))
		)
			continue

		if (
			startPosition &&
			getListIndex(camelCase(startPosition[0].split(' ').join(''))) >
				listIndex
		)
			continue

		logger = new Logger(`${details.name} List Scraper`)

		if (
			!DEV &&
			lastScrapeTime &&
			new Date(lastScrapeTime).setHours(0, 0, 0, 0) ===
				start.setHours(0, 0, 0, 0)
		) {
			logger.send({
				emoji: '🚨',
				message: `We've already ran the script today at ${new Date(
					lastScrapeTime
				)}`,
				status: 'error',
			})

			process.exit()
			break
		}

		listData.list = {
			type: list,
			index: listIndex + 1,
			name: details.name,
			code: details.code,
			start: new Date(),
			categories: details.categories,
		}

		// We don't want to run the scraper at the same time every single day,
		// so we're going to wait a random time betwen 10 minutes and 1 hour
		if ((args.d || args.delay) && iteration === 0) {
			const randomWaitTimer = generateRandomNumbers(
				1000 * 60 * 10,
				1000 * 60 * 60,
				1
			)

			await delay(randomWaitTimer)
		}

		log.start(logger, listData.list.name, listData.list.start)
		headless = new Browser({logger})

		// For each category in the list
		for (let [
			categoryIndex,
			[category, urls],
		] of details.categories.entries()) {
			if (
				categoryArgs &&
				!categoryArgs.includes('all') &&
				!categoryArgs.includes(category)
			) {
				continue
			}

			if (
				startPosition &&
				startPosition[1] &&
				camelCase(startPosition[0]) === listData.list.type &&
				getCategoryIndex(list, startPosition[1].split(' ').join('')) >
					categoryIndex
			)
				continue

			listData.category = {
				current: category,
				index: categoryIndex + 1,
				count: details.categories.length,
			}

			// For each url in the category in the list
			for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
				if (
					startPosition &&
					startPosition[2] &&
					camelCase(startPosition[0]) === listData.list.type &&
					startPosition[1].split(' ').join('') ===
						listData.category.current &&
					parseFloat(startPosition[2].split(' ').join('')) - 1 >
						urlIndex
				)
					continue

				listData.urls = {
					current: urls[urlIndex],
					count: urls.length,
					index: urlIndex + 1,
				}

				const lastCategory = categoryArgs
					? Math.max([
							...categoryArgs.map((category) =>
								getCategoryIndex(listData.list.type, category)
							),
					  ]) + 1
					: listData.category.index === listData.category.count

				const lastPage = listData.urls.index === listData.urls.count

				const lastList = listArgs
					? listData.list.index ===
					  Math.max([
							...listArgs.map((list) =>
								getListIndex(
									camelCase(list.split(' ').join(''))
								)
							),
					  ]) +
							1
					: listData.list.index === lists.length

				// Scrape dat shit
				const asins = await scrapeLists(listData, headless, logger)

				await headless.cleanupBrowser()

				iteration++

				// Save all that data to the base
				if (asins.length) {
					const dbResponse = await saveAsins(
						asins,
						listData.list.type,
						{
							interval: listData.urls.index,
							category: listData.category.current,
						},
						logger
					)

					if (dbResponse.success) log.database(logger, dbResponse, listData)
				}

				// This is the last url of the last category of this list,
				// so let's shutdown the browser while we wait for the next list to start
				if (lastCategory && lastPage) {
					await headless.shutdown(false)
					headless = null
					log.finish(logger, listData.list.name, listData.list.start)
				}

				// This is the very last url of the last category in the last list,
				// so let's exit the process when we're done, mmkay?
				if (
					lastList &&
					lastCategory &&
					lastPage &&
					(!startPosition || !listArgs)
				) {
					fs.writeFileSync(
						'./logs/lastScrapeTime.txt',
						start.getTime()
					)
					process.exit()
				}
			}
		}
	}
})()
