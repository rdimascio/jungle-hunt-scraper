const config = require('../../../config')
const AWS = require('aws-sdk')
const AWS_PATH =
	config.NODE_ENV === 'development' ? './aws.json' : './../../../../aws.json'
AWS.config.loadFromPath(AWS_PATH)
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

const scrapeTerms = async (searchTerms, headless, logger) => {
	const data = []
	let isTerminated = false
	const BASE = 'https://www.amazon.com'
	const chrome = await headless.browser

	const processTerminated = () => {
		isTerminated = true
	}

	process.on('SIGINT', processTerminated)

	await Promise.all(
		searchTerms.map(async (searchTerm) => {
			const scrapeSearchTerm = await (async () => {
				let response

				try {
					const context = await chrome.createIncognitoBrowserContext()
					const page = await context.newPage()

					const buildURL = () =>
						BASE +
						`/s?k=${searchTerm.keyword
							.split(' ')
							.join('+')}&ref=nb_sb_noss`

					await preparePageForTor(page, buildURL())
					await preparePageForTests(page)

					//////////////////////////////////
					// Check to see if Tor is working
					/////////////////////////////////
					// First we're going to check our IP address
					// to make sure we're not using our public IP
					if (
						!(await isBrowserUsingTor(page, logger)) &&
						!isTerminated
					) {
						await page.close()
					}

					///////////////////
					// Scrape the page
					///////////////////
					// Now we're getting the heart of the scraper
					const requestNewSearchPage = async () => {
						const response = {}
						const URL = buildURL()
						const newFileName = `${searchTerm.keyword.split(' ').join('-')}-sponsored-${
							searchTerm.placement
						}-${new Date().toISOString()}.png`

						// Try 5 times to get to the page undetected
						if (
							!(await passBotDetection(page, URL, logger)) &&
							!isTerminated
						) {
							logger.send({
								emoji: '🚨',
								message: `Tor IP retry limit reached. Shutting down`,
								status: 'error',
							})

							await page.close()
						}

						// Mock user actions
						// Hover over random product links in the grid
						// await mockUserActions(page)

						const screenshotOptions = {}

						if (searchTerm.placement !== 'brand') {
							screenshotOptions.fullPage = true
						}

						// Get the data from the page and return it
						const searchTermData = await getTermData(page)
						const screenshot = await page.screenshot(
							screenshotOptions
						)

						const s3params = {
							Bucket: `jungle-hunt/search-terms/${searchTerm.keyword.split(' ').join('-')}`,
							Key: newFileName,
							Body: screenshot,
						}

						await s3.putObject(s3params).promise()

						if (
							searchTermData.ads[searchTerm.placement].asins
								.length
						) {
							const adAsins = searchTermData.ads[
								searchTerm.placement
							].asins.map((asin) => asin.asin)

							const matchingAsins = searchTerm.asins.some((asin) => adAsins.includes(asin))

							response.ads = searchTermData.ads
							response.success = matchingAsins
							response.screenshot = `https://jungle-hunt.s3-us-west-1.amazonaws.com/search-terms/${
								searchTerm.keyword.split(' ').join('-')
							}/${newFileName}`
						}

						return response
					}

					response = await requestNewSearchPage()
					response.status = 'OK'
				} catch (error) {
					if (!isTerminated) {
						logger.send({
							emoji: '🚨',
							message: `Error scraping search term "${searchTerm.keyword}"`,
							status: 'error',
							error: error,
						})
					}

					console.log(error)

					response = {status: 'FAIL'}
				} finally {
					response.keyword = searchTerm.keyword
					return response
				}
			})()

			data.push(scrapeSearchTerm)
		})
	)

	process.removeListener('SIGINT', processTerminated)

	return data
}

module.exports = scrapeTerms
