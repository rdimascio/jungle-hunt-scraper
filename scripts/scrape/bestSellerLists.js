'use strict'

// Packages
const fs = require('fs')
const util = require('util')
const os = require('os')
const path = require('path')
const rimraf = require('rimraf')
require('dotenv').config()
const kill = require('tree-kill')
const puppeteer = require('puppeteer-extra')
const pluginStealth = require('puppeteer-extra-plugin-stealth')
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')

// Database
const mongoClient = require('mongodb').MongoClient
const mongoUrl = DEV
	? 'mongodb://localhost:27017'
	: `mongodb://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_IP}/${process.env.DB_DATABASE}`
const mongoOptions = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
}
const mongo = new MongoClient(mongoUrl, mongoOptions)

// Modules
const database = require('../../helpers/database')
const changeIpAddress = require('../../helpers/changeIP')
const isObjectEmpty = require('../../helpers/object')
const generateRandomNumbers = require('../../helpers/randomNumbers')
const delay = require('../../helpers/delay')
const Logger = require('../../helpers/Logger')
const categoryList = require('../../helpers/categories')
const logger = new Logger('Best Seller List Scraper')
// const preparePageForTests = require('../../helpers/preparePageForTests')

// Variables
const DEV = process.env.NODE_ENV === 'development'
const publicIps = ['12.205.195.90', '172.119.134.14', '167.71.144.15']

// const mkdirAsync = util.promisify(fs.mkdir)
// const setup = async () => {
// 	const dataDir = path.join(os.tmpdir(), Date.now())
// 	await mkdirAsync(dataDir)
// 	return dataDir
// }

// const cleanup = (path) => rimraf(path)

;(async () => {
	// We don't want to run the scraper at the same time every single day,
	// so we're going to wait a random time betwen 10 minutes and 2 hours
	const randomWaitTimer = generateRandomNumbers(
		1000 * 60 * 10,
		1000 * 60 * 60 * 2,
		1
	)
	await delay(randomWaitTimer)

	const DATE = new Date()
	const HOURS = DATE.getHours()
	const MINUTES = DATE.getMinutes()
	const DAY = DATE.getDate()
	const MONTH = DATE.getMonth() + 1
	const YEAR = DATE.getFullYear()
	const DATE_PATH = `${MONTH}-${DAY}-${YEAR}-${HOURS}-${MINUTES}`

	logger.send({
		emoji: '🚀',
		title: 'Best Seller List Scraper',
		message: `Started scraping at ${DATE.toLocaleString()}`,
		status: 'success',
	})

	const categories = Object.entries(categoryList)
	const maxRunningTime = 60 * 60 * 1000
	let browser = null

	// const userDataDir = await setup()

	// Use our plugins
	puppeteer.use(pluginStealth())
	puppeteer.use(require('puppeteer-extra-plugin-anonymize-ua')())
	puppeteer.use(
		RecaptchaPlugin({
			provider: {
				id: '2captcha',
				token: '5a48a12a57d25d67de11e965dba8a655',
			},
			visualFeedback: true,
		})
	)

	const getBrowser = async () => {
		if (!browser) {
			try {
				browser = await puppeteer.launch({
					// userDataDir,
					ignoreHTTPSErrors: true,
					dumpio: false,
					// headless: true,
					devtools: false,
					// ignoreDefaultArgs: true,
					ignoreDefaultFlags: true,
					defaultViewport: {
						//--window-size in args
						width: 1280,
						height: 1024,
					},
					args: [
						/* TODO : https://peter.sh/experiments/chromium-command-line-switches/
						there is still a whole bunch of stuff to disable
						*/
						//'--crash-test', // Causes the browser process to crash on startup, useful to see if we catch that correctly
						// not idea if those 2 aa options are usefull with disable gl thingy
						// '--disable-canvas-aa', // Disable antialiasing on 2d canvas
						// '--disable-2d-canvas-clip-aa', // Disable antialiasing on 2d canvas clips
						'--disable-gl-drawing-for-tests', // BEST OPTION EVER! Disables GL drawing operations which produce pixel output. With this the GL output will not be correct but tests will run faster.
						// '--disable-dev-shm-usage', // ???
						// '--no-zygote', // wtf does that mean ?
						'--use-gl=desktop', // better cpu usage with --use-gl=desktop rather than --use-gl=swiftshader, still needs more testing.
						'--enable-webgl',
						'--hide-scrollbars',
						'--mute-audio',
						'--no-first-run',
						'--disable-infobars',
						'--disable-breakpad',
						'--ignore-gpu-blacklist',
						'--window-size=1280,1024', // see defaultViewport
						'--no-sandbox',
						'--disable-setuid-sandbox',
						'--ignore-certificate-errors',
						'--disable-dev-shm-usage',
						'--disable-accelerated-2d-canvas',
						'--disable-gpu',
						'--proxy-server=socks5://127.0.0.1:9050',
						// '--proxy-bypass-list=*',
					],
				})

				browser.__BROWSER_START_TIME_MS__ = Date.now()

				logger.send({
					emoji: '🚀',
					message: `Browser launched at ${new Date().toLocaleString()}`,
					status: 'success',
				})
			} catch (error) {
				logger.send({
					emoji: '🚨',
					message: `Error launching puppeteer`,
					status: 'error',
					error: error,
				})

				process.exit()
			}
		}

		return browser
	}

	const cleanupBrowser = async (browser) => {
		// Kill it if it's time
		if (Date.now() - browser.__BROWSER_START_TIME_MS__ >= maxRunningTime) {
			treekill(browser.process().pid, 'SIGKILL')
			// cleanup(userDataDir)
			browser = null
			await getBrowser()
		}
		// Cleanup the browser's pages
		const pages = await browser.pages()

		return Promise.all(pages.map((page) => page.close()))
	}

	const killBrowser = async (browser) => {
		kill(browser.process().pid, 'SIGKILL')
		// cleanup(userDataDir)
	}

	for (let [index, [category, urls]] of categories.entries()) {
		for (let i = 0; i < urls.length; i++) {
			const asinList = []
			const asinsToUpdate = []
			const asinsToInsert = []

			const failedAsinData = fs.existsSync(
				`./data/failed/${DATE_PATH}.json`
			)
				? fs.readFileSync(`./data/failed/${DATE_PATH}.json`, 'utf8')
				: []

			let failedAsins = failedAsinData.length
				? JSON.parse(failedAsinData)
				: []

			const browser = await getBrowser()
			const page = await browser.newPage()

			// enable request interception
			// await page.setRequestInterception(true)
			await page.setDefaultNavigationTimeout(0)
			// await preparePageForTests(page)

			// page.on('request', (request) => {
			// 	// Do nothing in case of non-navigation requests.
			// 	if (!request.isNavigationRequest()) {
			// 		request.continue()
			// 		return
			// 	}

			// 	// Add a new header for navigation request.
			// 	const headers = request.headers()
			// 	headers['X-Requested-With'] = 'XMLHttpRequest'
			// 	headers['Accept'] =
			// 		'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3'
			// 	headers['Accept-Encoding'] = 'gzip, deflate, br'
			// 	headers['Accept-Language'] = 'en-US,en;q=0.9'
			// 	headers['Upgrade-Insecure-Requests'] = '1'
			// 	request.continue({headers})
			// })

			page.on('response', (response) => {
				// Ignore requests that aren't the one we are explicitly doing
				if (
					response
						.request()
						.url()
						.split('ref')[0] === urls[i].split('ref')[0]
				) {
					if (!response.ok()) {
						changeIpAddress()
					}
				}
			})

			try {
				// First we're going to check our IP address to make sure we're not using our public IP
				await page.goto('http://checkip.amazonaws.com/')

				const IP = await page.evaluate(() =>
					document.body.textContent.trim()
				)

				if (publicIps.includes(IP)) {
					logger.send({
						emoji: '🚨',
						message: `Tor failed to anonymize our IP. Using IP: ${IP}`,
						status: 'error',
					})

					await cleanupBrowser(browser)
					await killBrowser()

					process.exit()
				} else {
					logger.send({
						emoji: '👻',
						message: `Tor successfully anonymized our IP. Using IP: ${IP}`,
						status: 'success',
						loggers: ['logger', 'console', 'notify'],
					})
				}

				const scrapeAsins = async (pg = 1) => {
					const randomNumbers = generateRandomNumbers(0, 49, 5)
					const delayTimer = 3000
					const maxRetryNumber = 5
					let success = false

					for (
						let retryNumber = 1;
						retryNumber <= maxRetryNumber;
						retryNumber++
					) {
						const url =
							pg === 1
								? urls[i]
								: `${
										urls[i].split('ref')[0]
								  }ref=zg_bs_pg_2?_encoding=UTF8&pg=2`

						const response = await page.goto(url, {
							waitUntil: 'networkidle2',
							timeout: 0,
						})

						const title = await page.title()

						if (response.ok() && title !== 'Robot Check') {
							success = true
							await page.waitFor(3000)
							break
						}

						if (title === 'Robot Check') {
							logger.send({
								emoji: '🚨',
								message: `We hit a captcha page. Trying to crack it...`,
								status: 'error',
							})

							await page.solveRecaptchas()

							await Promise.all([
								page.waitForNavigation(),
								page.click(`button[type="submit"]`),
							])

							// changeIpAddress()
							// await delay(6000000)
						}

						await delay(2000 * retryNumber)
					}

					if (!success) {
						logger.send({
							emoji: '🚨',
							message: `Tor IP retry limit reached. Cancelling connection`,
							status: 'error',
						})

						return
					}

					const asinList = await page.evaluate(() => {
						const asins = []
						const failedAsins = []
						const grid = document.getElementById('zg-ordered-list')
						const items = grid.querySelectorAll('li')

						const scrapeAsinData = (element) => {
							const asinData = {}
							asinData.category = {}

							asinData.category.secondary = document.querySelector(
								'.category'
							)
								? document.querySelector('.category').innerText
								: null
							asinData.rank = element.querySelector(
								'.zg-badge-text'
							)
								? parseFloat(
										element
											.querySelector('.zg-badge-text')
											.innerHTML.split('#')[1]
								  )
								: null
							asinData.asin = element.querySelector(
								'.a-link-normal:not(.a-size-small)'
							)
								? new URL(
										element.querySelector(
											'.a-link-normal:not(.a-size-small)'
										).href
								  ).pathname.split('/')[3]
								: null
							asinData.image = element.querySelector('img')
								? element.querySelector('img').src
								: null
							asinData.price = element.querySelector(
								'.a-color-price'
							)
								? element.querySelector('.a-color-price')
										.innerText
								: null
							asinData.title = element.querySelector(
								'.p13n-sc-truncated'
							)
								? element.querySelector('.p13n-sc-truncated')
										.innerText
								: null
							asinData.rating = element.querySelector(
								'.a-icon-alt'
							)
								? parseFloat(
										element
											.querySelector('.a-icon-alt')
											.innerText.split(' ')[0]
								  )
								: null
							asinData.reviews = element.querySelector(
								'.a-icon-row > a:nth-child(2)'
							)
								? parseFloat(
										element
											.querySelector(
												'.a-icon-row > a:nth-child(2)'
											)
											.innerText.split(',')
											.join('')
								  )
								: null

							return asinData
						}

						items.forEach((item, index) => {
							const asinData = scrapeAsinData(item)

							if (
								!asinData.asin ||
								!asinData.price ||
								!asinData.rating ||
								!asinData.reviews ||
								!asinData.rank
							) {
								failedAsins.push(item)
							} else {
								asins.push(asinData)
							}
						})

						if (failedAsins.length) {
							// logger.send({
							// 	emoji: '🚨',
							// 	message:
							// 		'We have a failed asin, waiting 3 seconds to retry',
							// 	status: 'error',
							// 	loggers: ['logger', 'console'],
							// })

							setTimeout(() => {
								// silently continue
							}, 3000)

							failedAsins.forEach((item) => {
								const asinData = scrapeAsinData(item)

								if (
									!asinData.asin ||
									!asinData.price ||
									!asinData.rating ||
									!asinData.reviews ||
									!asinData.rank
								) {
									// Write to the failed.json
									if (
										!failedAsins.some(
											(item) =>
												item.asin === asinData.asin
										)
									) {
										failedAsins.push(asinData)
									}
								} else {
									asins.push(asinData)
								}
							})
						}

						return asins
					})

					for (let i = 0; i < randomNumbers.length; i++) {
						await page.waitFor(delayTimer - 1000)
						try {
							await page.hover(
								`.zg-item-immersion:nth-child(${randomNumbers[i]}) .p13n-sc-truncated`
							)
						} catch (error) {
							// silently fail
						}
					}

					await page.waitFor(delayTimer)
					try {
						await page.hover(
							`ul.a-pagination ${
								pg === 1 ? '.a-last' : 'li:nth-child(1)'
							}`
						)
					} catch (error) {
						// silently fail
					}
					await page.waitFor(delayTimer - 1000)

					return asinList
				}

				asinList.push(...(await scrapeAsins()))
				asinList.push(...(await scrapeAsins(2)))

				if (!asinList.length) {
					logger.send({
						emoji: '🚨',
						message: `No asins found for subcategory #${i +
							1} in ${category}`,
						status: 'error',
					})
				}

				asinList.forEach((asin, index) => {
					if (
						isObjectEmpty(asin) ||
						!asin.asin ||
						!asin.price ||
						!asin.rating ||
						!asin.reviews ||
						!asin.rank
					) {
						// Write to the failed.json
						if (
							!failedAsins.some(
								(item) => item.asin === asinData.asin
							)
						) {
							logger.send({
								emoji: '🚨',
								message: `Failed to scrape ${
									asin.asin
								} for subcategory #${i +
									1} in ${category}. Pushing to failed.json`,
								status: 'error',
							})
						}

						return
					}

					// Need to set the primary category here,
					//otherwise it's out of context
					asin.category.primary = category

					mongo.connect(
						(error, client) => {
							if (error) {
								logger.send({
									emoji: '🚨',
									message: `Error connecting to the database for subcategory #${i +
										1} in ${category}`,
									status: 'error',
								})

								const killEverything = new Promise(
									async (resovle, reject) => {
										await cleanupBrowser(browser)
										await killBrowser(browser)
										resovle()
									}
								)

								killEverything.then(() => {
									process.exit()
								})
							}

							try {
								const db = client.db(process.env.DB_DATABASE)

								database.findDocuments(
									db,
									'products',
									{asin: asin.asin},
									(docs) => {
										if (docs.length) {
											asinsToUpdate.push(asin)
										} else {
											asinsToInsert.push(asin)
										}

										client.close()
									}
								)
							} catch (error) {
								logger.send({
									emoji: '🚨',
									message: `Error reading Products for subcategory #${i +
										1} in ${category}`,
									status: 'error',
								})

								const killEverything = new Promise(
									async (resovle, reject) => {
										await cleanupBrowser(browser)
										await killBrowser(browser)
										resovle()
									}
								)

								killEverything.then(() => {
									process.exit()
								})
							}
						}
					)
				})
			} catch (error) {
				logger.send({
					emoji: '🚨',
					message: `Error scraping subcategory #${i +
						1} in ${category}`,
					status: 'error',
					error: error,
				})

				await cleanupBrowser(browser)
				await killBrowser(browser)

				process.exit()
			} finally {
				mongo.connect(
					(error, client) => {
						if (error) {
							logger.send({
								emoji: '🚨',
								message: `Error connecting to the database for subcategory #${i +
									1} in ${category}`,
								status: 'error',
								error: error,
							})

							const killEverything = new Promise(
								async (resovle, reject) => {
									await cleanupBrowser(browser)
									await killBrowser(browser)
									resovle()
								}
							)

							killEverything.then(() => {
								process.exit()
							})
						}

						const db = client.db(process.env.DB_DATABASE)

						if (asinList.length) {
							try {
								database.insertProductStats(
									db,
									asinList,
									(result) => {
										logger.send({
											emoji: '✅',
											message: `Product Stats inserted for subcategory #${i +
												1} in ${category}`,
											status: 'success',
										})
									}
								)
							} catch (error) {
								logger.send({
									emoji: '🚨',
									message: `Error inserting Product Stats for subcategory #${i +
										1} in ${category}`,
									status: 'error',
								})

								const killEverything = new Promise(
									async (resovle, reject) => {
										await cleanupBrowser(browser)
										await killBrowser(browser)
										resovle()
									}
								)

								killEverything.then(() => {
									process.exit()
								})
							}
						}

						if (asinsToUpdate.length) {
							try {
								database.updateProducts(
									db,
									asinsToUpdate,
									(result) => {
										logger.send({
											emoji: '✅',
											message: `Products updated for subcategory #${i +
												1} in ${category}`,
											status: 'success',
										})
									}
								)
							} catch (error) {
								logger.send({
									emoji: '🚨',
									message: `Error updating Products for subcategory #${i +
										1} in ${category}`,
									status: 'error',
								})

								const killEverything = new Promise(
									async (resovle, reject) => {
										await cleanupBrowser(browser)
										await killBrowser(browser)
										resovle()
									}
								)

								killEverything.then(() => {
									process.exit()
								})
							}
						}

						if (asinsToInsert.length) {
							try {
								database.insertProducts(
									db,
									asinsToInsert,
									(result) => {
										logger.send({
											emoji: '✅',
											message: `Products inserted for subcategory #${i +
												1} in ${category}`,
											status: 'success',
										})
									}
								)
							} catch (error) {
								logger.send({
									emoji: '🚨',
									message: `Error inserting Products for subcategory #${i +
										1} in ${category}`,
									status: 'error',
								})
							}
						}

						client.close()
					}
				)

				if (failedAsins.length) {
					fs.writeFileSync(
						`./data/failed/${DATE_PATH}.json`,
						JSON.stringify(failedAsins)
					)
				}

				await cleanupBrowser(browser)

				if (index + 1 === categories.length && i + 1 === urls.length) {
					const DATE_FINISHED = new Date()
					const TIME_ELAPSED = DATE_FINISHED - DATE

					// Remainder of TIME_ELAPSED / days divided by hours
					const HOURS_ELAPSED = Math.floor(
						(TIME_ELAPSED % (1000 * 60 * 60 * 24)) /
							(1000 * 60 * 60)
					)

					// Remainder of TIME_ELAPSED / hours divided by minutes
					const MINUTES_ELAPSED = Math.floor(
						(TIME_ELAPSED % (1000 * 60 * 60)) / (1000 * 60)
					)

					// Remainder of TIME_ELAPSED / minutes divided by seconds
					const SECONDS_ELAPSED = Math.floor(
						(TIME_ELAPSED % (1000 * 60)) / 1000
					)

					logger.send({
						emoji: '🎉',
						message: `Finished in ${
							HOURS_ELAPSED > 0 ? `${HOURS_ELAPSED} hours, ` : ''
						} ${MINUTES_ELAPSED} minutes and ${SECONDS_ELAPSED} seconds`,
						status: 'success',
					})

					await killBrowser(browser)
					process.exit()
				}
			}
		}
	}
})()
