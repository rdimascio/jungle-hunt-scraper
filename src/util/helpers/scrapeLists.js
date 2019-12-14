const browser = require('../helpers/headlessHelpers')
const {
	getAsinData,
	mockUserActions,
	passBotDetection,
	isBrowserUsingTor,
	preparePageForTor,
	preparePageForTests,
} = browser

const scrapeLists = async (data, headless, logger) => {
	let isTerminated = false

	const BASE = 'https://www.amazon.com'
	const ASINS = []

	const processTerminated = () => {
		isTerminated = true
	}

	process.on('SIGINT', processTerminated)

	try {
		const chrome = await headless.browser
		const page = await chrome.newPage()

		await preparePageForTor(page, data.urls.current)
		await preparePageForTests(page)

		//////////////////////////////////
		// Check to see if Tor is working
		/////////////////////////////////
		// First we're going to check our IP address
		// to make sure we're not using our public IP
		if (!(await isBrowserUsingTor(page, logger)) && !isTerminated) {
			logger.send({
				emoji: '🚨',
				message: `Tor failed to anonymize our IP. Using IP: ${IP}`,
				status: 'error',
			})

			await headless.shutdown()
		}

		// Focus down here 👇

		const buildURL = (pageNumber) =>
			pageNumber === 1
				? BASE + data.urls.current
				: BASE +
				  `${data.urls.current.split('ref')[0]}ref=zg_${
						data.list.code
				  }_pg_2?encoding=UTF8&pg=2`

		///////////////////
		// Scrape the page
		//////////////////
		// Now we're getting the heart of the scraper
		const requestNewBestSellerPage = async (pageNumber = 1) => {
			// Build the URL
			const URL = buildURL(pageNumber)

			// Try 5 times to get to the page undetected
			if (!(await passBotDetection(page, URL, logger, data)) && !isTerminated) {
				logger.send({
					emoji: '🚨',
					message: `Tor IP retry limit reached. Shutting down`,
					status: 'error',
				})

				await headless.shutdown()
			}

			// Mock user actions
			// Hover over random product links in the grid
			await mockUserActions(page)

			// Get the data from the page and return it
			return await getAsinData(page)
		}

		ASINS.push(...(await requestNewBestSellerPage()))
		ASINS.push(...(await requestNewBestSellerPage(2)))

		// const asinLookup = await findAsins(asinList, LIST_TYPE.name, {
		// 	interval: i,
		// 	category,
		// })

		// ASINS.update.push(...asinLookup.found)
		// ASINS.insert.push(...asinLookup.notFound)

		// Need to set the primary category here,
		//otherwise it's out of context
		ASINS.forEach((asin) => (asin.category.primary = data.category.current))

		await headless.cleanupBrowser()

		return ASINS
	} catch (error) {
		if (!isTerminated) {
			logger.send({
				emoji: '🚨',
				message: `Error scraping subcategory #${data.urls.index} in ${data.category.current}`,
				status: 'error',
				error,
			})
			await headless.shutdown()
		}
	} finally {
		process.removeListener('SIGINT', processTerminated)
	}
	
	// finally {
		// await saveAsins(
		// 	{
		// 		insert: asinsToInsert,
		// 		update: asinsToUpdate,
		// 	},
		// 	LIST_TYPE.name,
		// 	{
		// 		interval: i,
		// 		category,
		// 	}
		// )

		// if (failedAsins.length) {
		// 	fs.writeFileSync(
		// 		`./data/failed/${DATE_PATH}.json`,
		// 		JSON.stringify(failedAsins)
		// 	)
		// }

		// if (!isTerminated) await headless.shutdown(false)
		// if (!isTerminated) await headless.cleanupBrowser()

		// if (index + 1 === categories.length && i + 1 === urls.length) {
		// 	const DATE_FINISHED = new Date()
		// 	const TIME_ELAPSED = DATE_FINISHED - DATE

		// 	// Remainder of TIME_ELAPSED / days divided by hours
		// 	const HOURS_ELAPSED = Math.floor(
		// 		(TIME_ELAPSED % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
		// 	)

		// 	// Remainder of TIME_ELAPSED / hours divided by minutes
		// 	const MINUTES_ELAPSED = Math.floor(
		// 		(TIME_ELAPSED % (1000 * 60 * 60)) / (1000 * 60)
		// 	)

		// 	// Remainder of TIME_ELAPSED / minutes divided by seconds
		// 	const SECONDS_ELAPSED = Math.floor(
		// 		(TIME_ELAPSED % (1000 * 60)) / 1000
		// 	)

		// 	logger.send({
		// 		emoji: '🎉',
		// 		message: `Finished in ${
		// 			HOURS_ELAPSED > 0 ? `${HOURS_ELAPSED} hours, ` : ''
		// 		}${MINUTES_ELAPSED} minutes and ${SECONDS_ELAPSED} seconds`,
		// 		status: 'success',
		// 	})

		// 	fs.writeFileSync('./logs/lastScrapeTime.txt', now.getTime())

		// 	if (!isTerminated) await headless.shutdown()
		// }
	// }
}

module.exports = scrapeLists
