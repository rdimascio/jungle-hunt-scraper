'use strict'

// Packages
const fs = require('fs')
require('dotenv').config()
const colors = require('colors')
const {createLogger, format, transports} = require('winston')
const {combine, timestamp, label, printf} = format
const notifier = require('node-notifier')
const mongo = require('mongodb').MongoClient
const puppeteer = require('puppeteer')
const TelegramBot = require('node-telegram-bot-api')

// Modules
const database = require('../../helpers/database')
const changeIpAddress = require('../../helpers/changeIP')
const isObjectEmpty = require('../../helpers/object')
const generateRandomNumbers = require('../../helpers/randomNumbers')
const delay = require('../../helpers/delay')
const categoryList = require('../../helpers/categories')
const preparePageForTests = require('../../helpers/preparePageForTests')

// Variables
const DEV = process.env.NODE_ENV === 'development'
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
const jungleHuntBot = new TelegramBot(telegramBotToken)
const publicIps = ['12.205.195.90', '172.119.134.14', '167.71.144.15']
const mongoUrl = DEV
	? 'mongo://localhost:27017'
	: `mongodb://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_IP}/${process.env.DB_TABLE}`

const DATE = new Date()
const HOURS = DATE.getHours()
const MINUTES = DATE.getMinutes()
const DAY = DATE.getDate()
const MONTH = DATE.getMonth() + 1
const YEAR = DATE.getFullYear()
const DATE_PATH = `${MONTH}-${DAY}-${YEAR}-${HOURS}-${MINUTES}`

// Logging
const myFormat = printf(
	({level, message, label, timestamp}) =>
		`${timestamp} [${label}] ${level}: ${message}`
)

const logger = createLogger({
	level: 'info',
	format: combine(label({label: 'Best Seller List'}), timestamp(), myFormat),
	defaultMeta: {service: 'user-service'},
	transports: [
		//
		// - Write to all logs with level `info` and below to `combined.log`
		// - Write all logs error (and below) to `error.log`.
		//
		new transports.File({
			filename: `./data/logs/${MONTH}-${DAY}-${YEAR}-error.log`,
			level: 'error',
		}),
		new transports.File({
			filename: `./data/logs/${MONTH}-${DAY}-${YEAR}-info.log`,
		}),
	],
})

;(async () => {
	// We don't want to run the scraper at the same time every single day,
	// so we're going to wait a random time betwen 10 minutes and an hour
	const randomWaitTimer = generateRandomNumbers(600000, 3600000, 1)
	await delay(randomWaitTimer)

	jungleHuntBot.sendMessage(605686296, '🚀 Best Seller List Scraper: Started')

	logger.info('🚀 Started scraping')

	if (DEV) {
		console.log(colors.green('🚀 Started scraping'))

		notifier.notify({
			title: 'Jungle Hunt',
			message: '🚀 Started scraping Best Seller Lists',
		})
	}

	const categories = Object.entries(categoryList)

	for (let [index, [category, urls]] of categories.entries()) {
		for (let i = 0; i < urls.length; i++) {
			// const batch = db.batch()

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

			const browser = await puppeteer.launch({
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

			const page = await browser.newPage()

			// enable request interception
			await page.setRequestInterception(true)
			await page.setDefaultNavigationTimeout(0)
			await preparePageForTests(page)

			page.on('request', (request) => {
				// Do nothing in case of non-navigation requests.
				if (!request.isNavigationRequest()) {
					request.continue()
					return
				}

				// Add a new header for navigation request.
				const headers = request.headers()
				headers['X-Requested-With'] = 'XMLHttpRequest'
				headers['Accept'] =
					'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3'
				headers['Accept-Encoding'] = 'gzip, deflate, br'
				headers['Accept-Language'] = 'en-US,en;q=0.9'
				headers['Upgrade-Insecure-Requests'] = '1'
				request.continue({headers})
			})

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
					} else {
						// We're in, no need to change the IP
						logger.info('IP remains the same')
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
					jungleHuntBot.sendMessage(
						605686296,
						'🚨 Best Seller List Scraper: Tor failed to anonymize our IP'
					)

					logger.error(
						`Tor failed to anonymize our IP. Using IP: ${IP}`
					)

					if (DEV) {
						console.log(
							colors.red(
								`Tor failed to anonymize our IP. Using IP: ${IP}`
							)
						)

						notifier.notify({
							title: 'Jungle Hunt',
							message: `🚨 Tor failed to anonymize our IP. Using IP: ${IP}`,
						})
					}
					return
				} else {
					logger.info(
						`Tor successfully anonymized our IP. Using IP: ${IP}`
					)

					if (DEV) {
						console.log(
							colors.green(
								`Tor successfully anonymized our IP. Using IP: ${IP}`
							)
						)

						notifier.notify({
							title: 'Jungle Hunt',
							message: `🎉 Tor successfully anonymized our IP. Using IP: ${IP}`,
						})
					}
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
							jungleHuntBot.sendMessage(
								605686296,
								'Best Seller List Scraper: We hit a captcha page. Changing IP and waiting 10 minutes'
							)
							changeIpAddress()
							await delay(6000000)
						}

						await delay(2000 * retryNumber)
					}

					if (!success) {
						// Send a message to Telegram
						jungleHuntBot.sendMessage(
							605686296,
							'🚨 Best Seller List Scaper: Tor IP retry limit reached. Cancelling connection'
						)

						logger.error(
							'Tor IP retry limit reached. Cancelling connection'
						)

						if (DEV) {
							console.log(
								colors.red(
									'Tor IP retry limit reached. Cancelling connection'
								)
							)

							notifier.notify({
								title: 'Jungle Hunt',
								message: `🚨 Tor IP retry limit reached. Cancelling connection`,
							})
						}
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
							setTimeout(() => {
								logger.log(
									'We have a failed asin, waiting 3 seconds to retry'
								)

								if (DEV) {
									console.log(
										colors.red(
											'We have a failed asin, waiting 3 seconds to retry'
										)
									)
								}
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
					logger.error(
						`No asins found for subcategory #${i +
							1} in ${category}`
					)

					if (DEV) {
						console.log(
							colors.red(
								`No asins found for subcategory #${i +
									1} in ${category}`
							)
						)

						notifier.notify({
							title: 'Jungle Hunt',
							message: `🚨 No asins found for subcategory #${i +
								1} in ${category}`,
						})
					}
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
							jungleHuntBot.sendMessage(
								605686296,
								`🚨 Best Seller List Scaper: Failed to scrape ${
									asin.asin
								} for subcategory #${i +
									1} in ${category}. Pushing to failed.json`
							)

							logger.error(
								`Failed to scrape ${
									asin.asin
								} for subcategory #${i +
									1} in ${category}. Pushing to failed.json`
							)

							if (DEV) {
								console.log(
									colors.red(
										`Failed to scrape ${
											asin.asin
										} for subcategory #${i +
											1} in ${category}. Pushing to failed.json`
									)
								)

								notifier.notify({
									title: 'Jungle Hunt',
									message: `🚨 Failed to scrape ${
										asin.asin
									} for subcategory #${i +
										1} in ${category}. Pushing to failed.json`,
								})
							}
						}

						return
					}

					// Need to set the primary category here,
					//otherwise it's out of context
					asin.category.primary = category

					mongo.connect(
						mongoUrl,
						{
							useNewUrlParser: true,
							useUnifiedTopology: true,
						},
						async (error, client) => {
							if (error) {
								// Send message to Telegram
								jungleHuntBot.sendMessage(
									605686296,
									`🚨 Best Seller List Scaper: MongoDB failed to query for ${asin}`
								)

								logger.error(
									`MongoDB failed to query for ${asin.asin}`
								)

								logger.error(error)

								if (DEV) {
									console.log(
										colors.red(
											`MongoDB failed to query for ${asin.asin}`
										)
									)

									console.error(error)

									notifier.notify({
										title: 'Jungle Hunt',
										message: `🚨 MongoDB failed to query for ${asin.asin}`,
									})
								}

								return
							}

							const db = client.db('jungleHunt')
							const collection = 'products'

							database.findDocuments(
								db,
								collection,
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
						}
					)
				})
			} catch (error) {
				jungleHuntBot.sendMessage(
					605686296,
					`🚨 Best Seller List Scaper: Error scraping subcategory #${i +
						1} in ${category}`
				)

				logger.error(
					`Error scraping subcategory #${i + 1} in ${category}`
				)
				logger.error(error)

				if (DEV) {
					console.log(
						colors.red(
							`Error scraping subcategory #${i +
								1} in ${category}`
						)
					)
					console.error(error)

					notifier.notify({
						title: 'Jungle Hunt',
						message: `🚨 Error scraping subcategory #${i +
							1} in ${category}`,
					})
				}
			} finally {
				mongo.connect(
					mongoUrl,
					{
						useNewUrlParser: true,
						useUnifiedTopology: true,
					},
					(error, client) => {
						if (error) {
							// Send message to Telegram
							jungleHuntBot.sendMessage(
								605686296,
								`🚨 Best Seller List Scaper: Error scraping subcategory #${i +
									1} in ${category}`
							)

							logger.error(
								`Error scraping subcategory #${i +
									1} in ${category}`
							)
							logger.error(error)

							if (DEV) {
								console.log(
									colors.red(
										`Error scraping subcategory #${i +
											1} in ${category}`
									)
								)
								console.error(error)

								notifier.notify({
									title: 'Jungle Hunt',
									message: `🚨 Error scraping subcategory #${i +
										1} in ${category}`,
								})
							}

							return
						}
						const db = client.db('jungleHunt')

						if (asinList.length) {
							try {
								database.insertProductStats(
									db,
									asinList,
									(result) => {
										logger.log(
											`Product Stats inserted for subcategory #${i +
												1} in ${category}`
										)
									}
								)
							} catch (error) {
								// Send message to Telegram
								jungleHuntBot.sendMessage(
									605686296,
									`🚨 Best Seller List Scaper: Error inserting Product Stats for subcategory #${i +
										1} in ${category}`
								)

								logger.error(
									`Error inserting Product Stats for subcategory #${i +
										1} in ${category}`
								)
								logger.error(error)

								if (DEV) {
									console.log(
										colors.red(
											`Error inserting Product Stats for subcategory #${i +
												1} in ${category}`
										)
									)
									console.error(error)

									notifier.notify({
										title: 'Jungle Hunt',
										message: `🚨 Error inserting Product Stats for subcategory #${i +
											1} in ${category}`,
									})
								}
							}
						}

						if (asinsToUpdate.length) {
							try {
								database.updateProducts(
									db,
									asinsToUpdate,
									(result) => {
										logger.log(
											`Products updated for subcategory #${i +
												1} in ${category}`
										)
									}
								)
							} catch (error) {
								// Send message to Telegram
								jungleHuntBot.sendMessage(
									605686296,
									`🚨 Best Seller List Scaper: Error updating Products for subcategory #${i +
										1} in ${category}`
								)

								logger.error(
									`Error updating Products for subcategory #${i +
										1} in ${category}`
								)
								logger.log(error)

								if (DEV) {
									console.log(
										colors.red(
											`Error updating Products for subcategory #${i +
												1} in ${category}`
										)
									)
									console.log(error)

									notifier.notify({
										title: 'Jungle Hunt',
										message: `🚨 Error updating Products for subcategory #${i +
											1} in ${category}`,
									})
								}
							}
						}

						if (asinsToInsert.length) {
							try {
								database.insertProducts(
									db,
									asinsToInsert,
									(result) => {
										logger.log(
											`Products inserted for subcategory #${i +
												1} in ${category}`
										)
									}
								)
							} catch (error) {
								jungleHuntBot.sendMessage(
									605686296,
									`🚨 Best Seller List Scaper: Error inserting Products for subcategory #${i +
										1} in ${category}`
								)

								logger.error(
									`Error inserting Products for subcategory #${i +
										1} in ${category}`
								)
								logger.error(error)

								if (DEV) {
									console.log(
										colors.red(
											`Error inserting Products for subcategory #${i +
												1} in ${category}`
										)
									)
									console.error(error)

									notifier.notify({
										title: 'Jungle Hunt',
										message: `🚨 Error inserting Products for subcategory #${i +
											1} in ${category}`,
									})
								}
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

				await page.close()
				await browser.close()

				const DATE_FINISHED = new Date()
				const TIME_ELAPSED = DATE_FINISHED - DATE
				const MINUTES_ELAPSED = TIME_ELAPSED / 1000 / 60
				const SECONDS_ELAPSED = MINUTES_ELAPSED % 60
				const HOURS_ELAPSED =
					MINUTES_ELAPSED >= 60 ? MINUTES_ELAPSED / 60 : 0

				jungleHuntBot.sendMessage(
					605686296,
					`🎉 Best Seller List Scraper: Finished in ${
						HOURS_ELAPSED > 0 ? `${HOURS_ELAPSED} hours, ` : ''
					} ${MINUTES_ELAPSED} minutes and ${SECONDS_ELAPSED} seconds`
				)

				logger.info(
					`🎉 Best Seller List Scraper: Finished in ${
						HOURS_ELAPSED > 0 ? `${HOURS_ELAPSED} hours, ` : ''
					} ${MINUTES_ELAPSED} minutes and ${SECONDS_ELAPSED} seconds`
				)

				if (DEV) {
					console.log(
						colors.green(
							`🎉 Best Seller List Scraper: Finished in ${
								HOURS_ELAPSED > 0
									? `${HOURS_ELAPSED} hours, `
									: ''
							} ${MINUTES_ELAPSED} minutes and ${SECONDS_ELAPSED} seconds`
						)
					)

					notifier.notify({
						title: 'Jungle Hunt',
						message: `🎉 Best Seller List Scraper: Finished in ${
							HOURS_ELAPSED > 0 ? `${HOURS_ELAPSED} hours, ` : ''
						} ${MINUTES_ELAPSED} minutes and ${SECONDS_ELAPSED} seconds`,
					})
				}
			}
		}
	}
})()
