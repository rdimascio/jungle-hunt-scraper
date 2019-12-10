'use strict'

// Packages
require('dotenv').config()
const fs = require('fs')
const os = require('os')
const path = require('path')
const util = require('util')
const rimraf = require('rimraf')
const kill = require('tree-kill')

// Mongo
const mongo = require('mongodb').MongoClient

// Puppeteer
const puppeteer = require('puppeteer-extra')
const pluginStealth = require('puppeteer-extra-plugin-stealth')
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')

// Helpers
const database = require('../../util/helpers/database')
const changeIpAddress = require('../../util/helpers/changeIP')
const generateRandomNumbers = require('../../util/helpers/randomNumbers')
const delay = require('../../util/helpers/delay')

const getListType = require('../../util/helpers/getListType')
const getLastScrapeTime = require('../../util/helpers/getLastScrapeTime')
const bestSellerCategories = require('../../../data/categories/bestSeller')
const mostGiftedCategories = require('../../../data/categories/mostGifted')
const newReleaseCategories = require('../../../data/categories/newReleases')
const mostWishedForCategories = require('../../../data/categories/mostWishedFor')
const Logger = require('../../util/modules/Logger')
const logger = new Logger('Best Seller List Scraper')

// Variables
const DEV = process.env.NODE_ENV === 'development'
const BASE = 'https://www.amazon.com'
const publicIps = ['12.205.195.90', '172.119.134.14', '167.71.144.15']
const mongoUrl = DEV
	? 'mongodb://localhost:27017'
	: `mongodb://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_IP}/${process.env.DB_DATABASE}`

;(async () => {
	const now = new Date()
	const lastScrapeTime = parseFloat(getLastScrapeTime())

	if (
		!DEV &&
		new Date(lastScrapeTime).setHours(0, 0, 0, 0) ===
			now.setHours(0, 0, 0, 0)
	) {
		logger.send({
			emoji: '🚨',
			message: `We've already ran the script today at ${new Date(
				lastScrapeTime
			)}`,
			status: 'error',
		})

		process.exit()
	}

	let terminated = false

	const randomWaitTimer = generateRandomNumbers(
		1000 * 60 * 10,
		1000 * 60 * 60 * 2,
		1
	)
	const maxRunningTime = 60 * 60 * 1000

	const DATE = now
	// const HOURS = DATE.getHours()
	// const MINUTES = DATE.getMinutes()
	// const DAY = DATE.getDate()
	// const MONTH = DATE.getMonth() + 1
	// const YEAR = DATE.getFullYear()
	// const DATE_PATH = `${MONTH}-${DAY}-${YEAR}-${HOURS}-${MINUTES}`

	// const failedAsinData = fs.existsSync(`./data/failed/${DATE_PATH}.json`)
	// 	? fs.readFileSync(`./data/failed/${DATE_PATH}.json`, 'utf8')
	// 	: []

	// let failedAsins = failedAsinData.length ? JSON.parse(failedAsinData) : []

	// const categories = [
	// 	...Object.entries(bestSellerCategories),
	// 	...Object.entries(mostGiftedCategories),
	// 	...Object.entries(newReleaseCategories),
	// 	...Object.entries(mostWishedForCategories),
	// ]

	const categories = {
		bestSeller: [...Object.entries(bestSellerCategories)],
		mostGifted: [...Object.entries(mostGiftedCategories)],
		newReleases: [...Object.entries(newReleaseCategories)],
		mostWishedFor: [...Object.entries(mostWishedForCategories)],
	}

	// We don't want to run the scraper at the same time every single day,
	// so we're going to wait a random time betwen 10 minutes and 2 hours
	// await delay(randomWaitTimer)

	logger.send({
		emoji: '🚀',
		title: 'Best Seller List Scraper',
		message: `Started scraping at ${DATE.toLocaleString()}`,
		status: 'success',
	})

	const mkdirAsync = util.promisify(fs.mkdir)
	const setup = async () => {
		const dataDir = path.join(os.tmpdir(), Date.now().toString())
		await mkdirAsync(dataDir)

		logger.send({
			emoji: '📂',
			title: 'Best Seller List Scraper',
			message: `Set up temporary directory at ${dataDir}`,
			status: 'success',
		})

		return dataDir
	}
	const cleanup = (path) => {
		return new Promise((resolve) => {
			rimraf(path, () => {
				logger.send({
					emoji: '📁',
					title: 'Best Seller List Scraper',
					message: `Removed temporary directory at ${path}`,
					status: 'success',
				})
				resolve()
			})
		})
	}
	const userDataDir = await setup()

	///////////////////////////
	// Puppeteer Functions
	///////////////////////////
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

	////////////////////////////////
	// Browser Functions
	///////////////////////////////
	let browser = null

	const getBrowser = async () => {
		if (!browser) {
			try {
				browser = await puppeteer.launch({
					userDataDir,
					ignoreHTTPSErrors: true,
					handleSIGINT: false,
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
					emoji: '🦄',
					message: `Browser launched at ${new Date().toLocaleString()}`,
					status: 'success',
				})
			} catch (error) {
				logger.send({
					emoji: '💀',
					message: `Error launching puppeteer`,
					status: 'error',
					error: error,
				})

				process.exit()
			}
		}

		return browser
	}

	const cleanupBrowser = async (browser, newBrowser = true) => {
		// Kill it if it's time
		if (
			browser.__BROWSER_START_TIME_MS__ &&
			Date.now() - browser.__BROWSER_START_TIME_MS__ >= maxRunningTime
		) {
			kill(browser.process().pid, 'SIGKILL')
			await cleanup(userDataDir)
			browser = null

			if (newBrowser) {
				await getBrowser()
			}
		}
		// Cleanup the browser's pages
		const pages = browser ? await browser.pages() : null

		return pages
			? Promise.all(pages.map((page) => page && page.close()))
			: false
	}

	const killBrowser = async (browser) => {
		kill(browser.process().pid, 'SIGKILL')
		await cleanup(userDataDir)

		logger.send({
			emoji: '💀',
			title: 'Best Seller List Scraper',
			message: `Browser has been killed and cleaned`,
			status: 'success',
		})
	}

	const shutdown = async (browser) => {
		await cleanupBrowser(browser, false)
		await killBrowser(browser)
		await delay(2000)

		process.exit()
	}

	// We can handle our own termination signals
	process.on('SIGINT', async () => {
		logger.send({
			emoji: '🚨',
			message: `Process terminated with SIGINT`,
			status: 'error',
		})

		terminated = true
		await shutdown(browser)
	})

	////////////////////////
	// Database Functions
	///////////////////////
	/**
	 *
	 * @param {Array} asins the list of 100 asins from the page we just scraped
	 * @param {String} listType the type of list we just scraped. i.e. Best Seller, Most Gifted, etc. Determines the collection we save the data
	 * @param {Object} loopPosition the position we're at in the loop. properties include iterator and category
	 */
	const findAsins = async (asins, listType, loopPosition) => {
		const asinCollection = {
			found: [],
			notFound: [],
		}

		const lookForAsins = new Promise((resolve) => {
			mongo.connect(
				mongoUrl,
				{
					useNewUrlParser: true,
					useUnifiedTopology: true,
				},
				async (error, client) => {
					if (error) {
						logger.send({
							emoji: '🚨',
							message: `Error connecting to the database for subcategory #${loopPosition.interval +
								1} in ${loopPosition.category}`,
							status: 'error',
						})

						if (!terminated) await shutdown(browser)
					}

					try {
						const db = client.db(process.env.DB_DATABASE)

						asins.forEach((asin, index) => {
							database.findProducts(
								db,
								`${listType}Products`,
								{asin: asin.asin},
								(docs) => {
									if (docs.length) {
										asinCollection.found.push(asin)
									} else {
										asinCollection.notFound.push(asin)
									}

									if (index + 1 === asins.length) {
										client.close()
										resolve()
									}
								}
							)
						})
					} catch (error) {
						logger.send({
							emoji: '🚨',
							message: `Error reading Products for subcategory #${loopPosition.interval +
								1} in ${loopPosition.category}`,
							status: 'error',
						})

						if (!terminated) await shutdown(browser)
					}
				}
			)
		})

		return lookForAsins.then(() => asinCollection)
	}

	const saveAsins = async (asins, listType, loopPosition) => {
		let success = false

		const save = new Promise((resolve) => {
			mongo.connect(
				mongoUrl,
				{
					useNewUrlParser: true,
					useUnifiedTopology: true,
				},
				async (error, client) => {
					if (error) {
						logger.send({
							emoji: '🚨',
							message: `Error connecting to the database for subcategory #${loopPosition.interval +
								1} in ${loopPosition.category}`,
							status: 'error',
							error: error,
						})

						client.close()
						if (!terminated) await shutdown(browser)
					}

					const db = client.db(process.env.DB_DATABASE)

					if (asins.insert.length || asins.update.length) {
						try {
							database.insertStats(
								db,
								`${listType}Stats`,
								[
									...(asins.insert ? asins.insert : []),
									...(asins.update ? asins.update : []),
								],
								(result) => {
									logger.send({
										emoji: '✅',
										message: `Product Stats inserted for subcategory #${loopPosition.interval +
											1} in ${loopPosition.category}`,
										status: 'success',
									})
								}
							)
						} catch (error) {
							logger.send({
								emoji: '🚨',
								message: `Error inserting Product Stats for subcategory #${loopPosition.interval +
									1} in ${loopPosition.category}`,
								status: 'error',
							})

							client.close()
							if (!terminated) await shutdown(browser)
						}
					} else {
						client.close()
						resolve()
					}

					if (asins.update.length) {
						try {
							database.updateProducts(
								db,
								`${listType}Products`,
								asins.update,
								(result) => {
									logger.send({
										emoji: '✅',
										message: `Products updated for subcategory #${loopPosition.interval +
											1} in ${loopPosition.category}`,
										status: 'success',
									})

									if (!asins.insert.length) {
										success = true
										client.close()
										resolve()
									}
								}
							)
						} catch (error) {
							logger.send({
								emoji: '🚨',
								message: `Error updating Products for subcategory #${loopPosition.interval +
									1} in ${loopPosition.category}`,
								status: 'error',
							})

							client.close()
							if (!terminated) await shutdown(browser)
						}
					}

					if (asins.insert.length) {
						try {
							database.insertProducts(
								db,
								`${listType}Products`,
								asins.insert,
								(result) => {
									logger.send({
										emoji: '✅',
										message: `Products inserted for subcategory #${loopPosition.interval +
											1} in ${loopPosition.category}`,
										status: 'success',
									})

									success = true
									client.close()
									resolve()
								}
							)
						} catch (error) {
							logger.send({
								emoji: '🚨',
								message: `Error inserting Products for subcategory #${loopPosition.interval +
									1} in ${loopPosition.category}`,
								status: 'error',
							})

							client.close()

							if (!terminated) await shutdown(browser)
						}
					}
				}
			)
		})

		return save.then(() => success)
	}

	for (let [index, [category, urls]] of categories.entries()) {
		for (let i = 0; i < urls.length; i++) {
			const asinList = []
			const asinsToUpdate = []
			const asinsToInsert = []
			const LIST_TYPE = getListType(urls[i].split('/')[2])

			const browser = await getBrowser()
			const page = await browser.newPage()

			await page.setDefaultNavigationTimeout(0)

			page.on('response', (response) => {
				// Ignore requests that aren't the one we are explicitly doing
				if (
					response
						.request()
						.url()
						.split('ref')[0] === urls[i].split('ref')[0] &&
					!response.ok()
				) {
					// If the response isn't ok, change our IP
					changeIpAddress()
				}
			})

			//////////////////////////////////
			// Check to see if Tor is working
			//////////////////////////////////
			// First we're going to check our IP address to make sure we're not using our public IP
			try {
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

					if (!terminated) await shutdown(browser)
				} else {
					logger.send({
						emoji: '👻',
						message: `Tor successfully anonymized our IP. Using IP: ${IP}`,
						status: 'success',
						loggers: ['logger', 'console', 'notify'],
					})
				}
			} catch (error) {
				logger.send({
					emoji: '🚨',
					message: `There was an error checking Tor`,
					status: 'error',
					error: error,
				})

				if (!terminated) await shutdown(browser)
			}

			////////////////////
			// Scrape the page
			///////////////////
			// Now we're getting the heart of the scraper
			try {
				const requestNewBestSellerPage = async (pg = 1) => {
					let proxy = false
					let success = false

					const randomNumbers = generateRandomNumbers(0, 49, 5)
					const delayTimer = 3000
					const maxRetryNumber = 5
					const ref = LIST_TYPE.ref
					const PROXY = proxy
						? 'https://cors-anywhere.herokuapps.com/'
						: ''
					const path =
						pg === 1
							? urls[i]
							: `${
									urls[i].split('ref')[0]
							  }ref=zg_${ref}_pg_2?_encoding=UTF8&pg=2`
					const url = PROXY + BASE + path

					for (
						let retryNumber = 1;
						retryNumber <= maxRetryNumber;
						retryNumber++
					) {
						const response = await page.goto(url, {
							waitUntil: 'networkidle2',
							timeout: 0,
						})

						const title = await page.title()

						if (response.ok() && title !== 'Robot Check') {
							success = true

							logger.send({
								emoji: '👍',
								message: `We've avoided detection`,
								status: 'info',
							})

							await page.waitFor(3000)
							break
						}

						if (title === 'Robot Check') {
							logger.send({
								emoji: '🚨',
								message: `We hit a captcha page. Changing IP and waiting 10 minutes...`,
								status: 'error',
							})

							proxy = true

							changeIpAddress()
							await delay(6000000)

							// logger.send({
							// 	emoji: '🚨',
							// 	message: `We hit a captcha page. Trying to crack it...`,
							// 	status: 'error',
							// })

							// await page.solveRecaptchas()

							// await Promise.all([
							// 	page.waitForNavigation(),
							// 	page.click(`button[type="submit"]`),
							// ])
						}

						await delay(2000 * retryNumber)
					}

					if (!success) {
						logger.send({
							emoji: '🚨',
							message: `Tor IP retry limit reached. Shutting down`,
							status: 'error',
						})

						if (!terminated) await shutdown(browser)

						// logger.send({
						// 	emoji: '🚨',
						// 	message: `Tor IP retry limit reached. Changing IP, waiting 10 minutes and trying again`,
						// 	status: 'error',
						// })

						// changeIpAddress()
						// return delay(6000000).then(() =>
						// 	requestNewBestSellerPage(pg)
						// )
					}

					const asinList = await page.evaluate(() => {
						const asins = []
						const failedAsins = []
						const grid = document.getElementById('zg-ordered-list')
						const items = grid.querySelectorAll('li')

						const scrapeAsinData = (element) => {
							const asinData = {}
							asinData.category = {}

							// switch (window.location.pathname.split('/')[2]) {
							// 	case 'zgbs':
							// 		asinData.type = 'bestSeller'
							// 		break
							// 	case 'most-wished-for':
							// 		asinData.type = 'mostWishedFor'
							// 		break
							// 	case 'most-gifted':
							// 		asinData.type = 'mostGifted'
							// 		break
							// 	case 'new-releases':
							// 		asinData.type = 'newReleases'
							// 		break
							// }

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

						// if (failedAsins.length) {
						// 	// logger.send({
						// 	// 	emoji: '🚨',
						// 	// 	message:
						// 	// 		'We have failed asins, waiting 3 seconds to retry',
						// 	// 	status: 'error',
						// 	// 	loggers: ['logger', 'console'],
						// 	// })

						// 	setTimeout(() => {
						// 		// silently continue
						// 	}, 3000)

						// 	// Try one last time to scrape the asins that failed
						// 	failedAsins.forEach((item) => {
						// 		const asinData = scrapeAsinData(item)

						// 		if (
						// 			!asinData.asin ||
						// 			!asinData.price ||
						// 			!asinData.rating ||
						// 			!asinData.reviews ||
						// 			!asinData.rank
						// 		) {
						// 			// Write to the failed.json
						// 			if (
						// 				!failedAsins.some(
						// 					(item) =>
						// 						item.asin === asinData.asin
						// 				)
						// 			) {
						// 				failedAsins.push(asinData)
						// 			}
						// 		} else {
						// 			asins.push(asinData)
						// 		}
						// 	})
						// }

						return asins
					})

					/////////////////////
					// Mock user actions
					/////////////////////
					// Hover over random product links in the grid
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

					// Hover over the Next or Previous page links,
					// depending on wait page we're currently on
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

					// Set a delay
					await page.waitFor(delayTimer - 1000)

					return asinList
				}

				asinList.push(...(await requestNewBestSellerPage()))
				asinList.push(...(await requestNewBestSellerPage(2)))

				if (!asinList.length) {
					logger.send({
						emoji: '🚨',
						message: `No asins found for subcategory #${i +
							1} in ${category}`,
						status: 'error',
					})

					break
				}

				const asinLookup = await findAsins(asinList, LIST_TYPE.name, {
					interval: i,
					category,
				})

				asinsToUpdate.push(...asinLookup.found)
				asinsToInsert.push(...asinLookup.notFound)

				// Need to set the primary category here,
				//otherwise it's out of context
				asinList.forEach((asin) => (asin.category.primary = category))
			} catch (error) {
				logger.send({
					emoji: '🚨',
					message: `Error scraping subcategory #${i +
						1} in ${category}`,
					status: 'error',
					error: error,
				})

				if (!terminated) await shutdown(browser)
			} finally {
				await saveAsins(
					{
						insert: asinsToInsert,
						update: asinsToUpdate,
					},
					LIST_TYPE.name,
					{
						interval: i,
						category,
					}
				)

				// if (failedAsins.length) {
				// 	fs.writeFileSync(
				// 		`./data/failed/${DATE_PATH}.json`,
				// 		JSON.stringify(failedAsins)
				// 	)
				// }

				if (!terminated) await cleanupBrowser(browser)

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
						}${MINUTES_ELAPSED} minutes and ${SECONDS_ELAPSED} seconds`,
						status: 'success',
					})

					fs.writeFileSync('./logs/lastScrapeTime.txt', now.getTime())

					if (!terminated) await killBrowser(browser)
				}
			}
		}
	}
})()
