'use strict'

const fs = require('fs')
const colors = require('colors')
const notifier = require('node-notifier')
const puppeteer = require('puppeteer')
const TelegramBot = require('node-telegram-bot-api')
const changeIpAddress = require('../../helpers/changeIP')
const isObjectEmpty = require('../../helpers/object')
const generateRandomNumbers = require('../../helpers/randomNumbers')
const telegramBotToken = '894036353:AAEch4kCYoS7AUdm2qXPtUaxPHgDVjVvn48'
const jungleHuntBot = new TelegramBot(telegramBotToken)

const DATABASE = 'mongo'
const mongo = require('mongodb').MongoClient
const mongoUrl = 'mongodb://localhost:27017'
const database = require('../../helpers/database')

// const firebase = require('firebase/app')
// require('firebase/firestore')

// const firebaseConfig = {
// 	apiKey: 'AIzaSyDQoN-wHRM4L18unBDZJqg3GItWZJjoV28',
// 	authDomain: 'jungle-hunt.firebaseapp.com',
// 	// databaseURL: 'https://jungle-hunt.firebaseio.com',
// 	projectId: 'jungle-hunt',
// 	// storageBucket: 'jungle-hunt.appspot.com',
// 	// messagingSenderId: '608123474522',
// 	// appId: '1:608123474522:web:d6a274aaf2e8b6a5433e63',
// }

// const app = firebase.initializeApp(firebaseConfig)
// const db = app.firestore()
// const productsRef = db.collection('products')

const DATE = new Date()
const HOURS = DATE.getHours()
const MINUTES = DATE.getMinutes()
const DAY = DATE.getDate()
const MONTH = DATE.getMonth() + 1
const YEAR = DATE.getFullYear()
const DATE_PATH = `${MONTH}-${DAY}-${YEAR}-${HOURS}-${MINUTES}`

const publicIps = ['12.205.195.90', '172.119.134.14']

const categoryList = require('../../helpers/categories')
const preparePageForTests = require('../../helpers/preparePageForTests')

;(async () => {
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
						console.log('IP remains the same')
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
					// Send a message to Telegram

					console.log("We're not using Tor. IP:", IP)
					return
				} else {
					console.log('Using Tor with IP:', IP)
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

						console.log("We're blocked")
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
								console.log(
									'We have a failed asin, waiting 3 seconds to retry'
								)
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
					console.log('No asins found')
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
							console.log(`Failed to scrape ${asin.asin}`)
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
								console.error(error)

								// Send message to Telegram
								jungleHuntBot.sendMessage(
									605686296,
									`🚨 Best Seller List Scaper: MongoDB failed to query for ${asin}.`
								)

								jungleHuntBot.sendMessage(605686296, error)

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
				console.log(
					colors.red(
						`Error scraping subcategory #${i + 1} in ${category}`
					)
				)
				console.log(error)

				jungleHuntBot.sendMessage(
					605686296,
					`🚨 Best Seller List Scaper: Error scraping subcategory #${i +
						1} in ${category}`
				)

				jungleHuntBot.sendMessage(605686296, error)
			} finally {
				mongo.connect(
					mongoUrl,
					{
						useNewUrlParser: true,
						useUnifiedTopology: true,
					},
					(error, client) => {
						if (error) {
							console.error(error)

							// Send message to Telegram
							jungleHuntBot.sendMessage(
								605686296,
								`🚨 Best Seller List Scaper: Error scraping subcategory #${i +
									1} in ${category}`
							)
			
							jungleHuntBot.sendMessage(605686296, error)

							return
						}
						const db = client.db('jungleHunt')

						if (asinList.length) {
							try {
								database.insertProductStats(
									db,
									asinList,
									(result) => {
										console.log(
											colors.green(
												`Product Stats inserted for subcategory #${i +
													1} in ${category}`
											)
										)
									}
								)
							} catch (error) {
								console.log(
									colors.red(
										`Error inserting Product Stats for subcategory #${i +
											1} in ${category}`
									)
								)
								console.log(error)

								// Send message to Telegram
								jungleHuntBot.sendMessage(
									605686296,
									`🚨 Best Seller List Scaper: Error inserting Product Stats for subcategory #${i +
										1} in ${category}`
								)

								jungleHuntBot.sendMessage(605686296, error)
							}
						}

						if (asinsToUpdate.length) {
							try {
								database.updateProducts(
									db,
									asinsToUpdate,
									(result) => {
										console.log(
											colors.green(
												`Products updated for subcategory #${i +
													1} in ${category}`
											)
										)
									}
								)
							} catch (error) {
								console.log(
									colors.red(
										`Error updating Products for subcategory #${i +
											1} in ${category}`
									)
								)
								console.log(error)

								// Send message to Telegram
								jungleHuntBot.sendMessage(
									605686296,
									`🚨 Best Seller List Scaper: Error updating Products for subcategory #${i +
										1} in ${category}`
								)

								jungleHuntBot.sendMessage(605686296, error)
							}
						}

						if (asinsToInsert.length) {
							try {
								database.insertProducts(
									db,
									asinsToInsert,
									(result) => {
										console.log(
											colors.green(
												`Products inserted for subcategory #${i +
													1} in ${category}`
											)
										)
									}
								)
							} catch (error) {
								console.log(
									colors.red(
										`Error inserting Products for subcategory #${i +
											1} in ${category}`
									)
								)
								console.log(error)

								// Error updating/inserting the ASIN stats
								// Send message to Telegram
								jungleHuntBot.sendMessage(
									605686296,
									`🚨 Best Seller List Scaper: Error inserting Products for subcategory #${i +
										1} in ${category}`
								)

								jungleHuntBot.sendMessage(605686296, error)
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
			}
		}
	}
})()
