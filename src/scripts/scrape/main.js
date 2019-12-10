'use strict'

const Logger = require('../../util/lib/Logger')
const Browser = require('../../util/lib/Browser')
const delay = require('../../util/helpers/delay')
const log = require('../../util/helpers/logMessages')
const args = require('minimist')(process.argv.slice(2))
const saveAsins = require('../../util/helpers/saveAsins')
const scrapeLists = require('../../util/helpers/scrapeLists')
const generateRandomNumbers = require('../../util/helpers/randomNumbers')
const getLastScrapeTime = require('../../util/helpers/getLastScrapeTime')
const bestSellerCategories = require('../../../data/categories/bestSeller')
const mostGiftedCategories = require('../../../data/categories/mostGifted')
const newReleaseCategories = require('../../../data/categories/newReleases')
const mostWishedForCategories = require('../../../data/categories/mostWishedFor')

;(async () => {
	let headless, logger

	// We can handle our own termination signals, thank you
	// This is SUPER important since we're launching headless
	// with the handleSIGINT property set to false
	process.on('SIGINT', async () => {
		if (log && logger) log.kill(logger)
		if (headless) await headless.shutdown()
	})

	const listArg = args.l
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

	// For each list
	for (let [listIndex, [list, details]] of lists.entries()) {
		if (listArg && list !== camelCase(listArg)) {
			continue
		}

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
		const randomWaitTimer = generateRandomNumbers(
			1000 * 60 * 10,
			1000 * 60 * 60,
			1
		)

		await delay(randomWaitTimer)

		log.start(logger, listData.list.name, listData.list.start)
		headless = new Browser({logger})

		// For each category in the list
		for (let [
			categoryIndex,
			[category, urls],
		] of details.categories.entries()) {
			listData.category = {
				current: category,
				index: categoryIndex + 1,
				count: details.categories.length,
			}

			// For each url in the category in the list
			for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
				listData.urls = {
					current: urls[urlIndex],
					count: urls.length,
					index: urlIndex + 1,
				}

				const lastList =
					listData.list.index === lists.length &&
					listData.category.index === listData.category.count &&
					listData.urls.index === listData.urls.count
				const lastPage =
					listData.category.index === listData.category.count &&
					listData.urls.index === listData.urls.count

				// Scrape dat shit
				listData.asins = await scrapeLists(listData, headless, logger)

				await headless.cleanupBrowser()

				// Save all that data to the base
				if (listData.asins.length) {
					const dbResponse = await saveAsins(
						listData.asins,
						listData.list.type,
						{
							interval: listData.urls.index,
							category: listData.category.current,
						},
						logger
					)

					if (dbResponse) log.database(logger, dbResponse, listData)
				}

				// This is the last url of the last category of this list,
				// so let's shutdown the browser while we wait for the next list to start
				if (lastPage) {
					await headless.shutdown()
					log.finish(logger, listData.list.name, listData.list.start)
				}

				// This is the very last url of the last category in the last list,
				// so let's exit the process when we're done, mmkay?
				if (lastList) {
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
