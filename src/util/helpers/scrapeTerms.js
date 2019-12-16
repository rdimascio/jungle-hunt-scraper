const config = require('../../../config')
const AWS = require('aws-sdk')
const AWS_PATH = config.NODE_ENV === 'development'
	? '../../../aws.json'
	: '../../../../aws.json'
AWS.config.loadFromPath(__dirname + AWS_PATH)
const s3 = new AWS.S3()
const browser = require('../helpers/headlessHelpers')
const {
	getTermData,
	// mockUserActions,
	passBotDetection,
	isBrowserUsingTor,
	preparePageForTor,
	preparePageForTests,
} = browser

const scrapeTerms = async (termData, headless, logger) => {
	let response
	let isTerminated = false
	const BASE = 'https://www.amazon.com'

	const processTerminated = () => {
		isTerminated = true
	}

	process.on('SIGINT', processTerminated)

	try {
		const chrome = await headless.browser
		const page = await chrome.newPage()

		const buildURL = () =>
			BASE + `/s?k=${encodeURIComponent(termData.keyword)}&ref=nb_sb_noss`

		await preparePageForTor(page, buildURL())
		await preparePageForTests(page)

		//////////////////////////////////
		// Check to see if Tor is working
		/////////////////////////////////
		// First we're going to check our IP address
		// to make sure we're not using our public IP
		if (!(await isBrowserUsingTor(page, logger)) && !isTerminated) {
			await headless.shutdown()
		}

		///////////////////
		// Scrape the page
		///////////////////
		// Now we're getting the heart of the scraper
		const requestNewSearchPage = async () => {
			const response = {}
			const URL = buildURL()
			const newFileName = `${termData.keyword}-sponsored-${
				termData.placement
			}-${new Date().toISOString()}.png`

			// Try 5 times to get to the page undetected
			if (!(await passBotDetection(page, URL, logger)) && !isTerminated) {
				logger.send({
					emoji: '🚨',
					message: `Tor IP retry limit reached. Shutting down`,
					status: 'error',
				})

				await headless.shutdown()
			}

			// Mock user actions
			// Hover over random product links in the grid
			// await mockUserActions(page)

			const screenshotOptions = {}

			if (termData.placement !== 'brand') {
				screenshotOptions.fullPage = true
			}

			// Get the data from the page and return it
			const searchTermData = await getTermData(page)
			const screenshot = await page.screenshot(screenshotOptions)

			const s3params = {
				Bucket: `jungle-hunt/search-terms/${termData.keyword}`,
				Key: newFileName,
				Body: screenshot,
			}

			await s3.putObject(s3params).promise()

			if (searchTermData.ads[termData.placement].asins.length) {
				const adAsins = searchTermData.ads[
					termData.placement
				].asins.map((asin) => asin.asin)

				const matchingAsins = termData.asins.some((asin) =>
					adAsins.includes(asin)
				)

				response.ads = searchTermData.ads
				response.success = matchingAsins
				response.screenshot = `https://jungle-hunt.s3-us-west-1.amazonaws.com/search-terms/${termData.keyword}/${newFileName}`
			}

			return response
		}

		response = await requestNewSearchPage()
		response.status = 'OK'
	} catch (error) {
		if (!isTerminated) {
			logger.send({
				emoji: '🚨',
				message: `Error scraping search term "${termData.keyword}"`,
				status: 'error',
				error: error,
			})
		}

		console.log(error)

		response = {status: 'FAIL'}
	} finally {
		process.removeListener('SIGINT', processTerminated)
		return response
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

module.exports = scrapeTerms
