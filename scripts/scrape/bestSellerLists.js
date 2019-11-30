'use strict'

const colors = require('colors')
const notifier = require('node-notifier')
const puppeteer = require('puppeteer')
const changeIpAddress = require('../../helpers/changeIP')
const isObjectEmpty = require('../../helpers/object')
const generateRandomNumbers = require('../../helpers/randomNumbers')

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

// const DATE = new Date()
// const DAY = DATE.getDate()
// const MONTH = DATE.getMonth() + 1
// const YEAR = DATE.getFullYear()
// const DATE_PATH = `${MONTH}-${DAY}-${YEAR}`

const publicIps = ['12.205.195.90', '172.119.134.14']

const categoryList = require('../../helpers/categories')
const preparePageForTests = require('../../helpers/preparePageForTests')

;(async () => {
	const categories = Object.entries(categoryList)

	for (let [index, [category, urls]] of categories.entries()) {
		for (let i = 0; i < urls.length; i++) {
			// const batch = db.batch()

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

						if (response.ok() && !title !== 'Robot Check') {
							success = true
							await page.waitFor(3000)
							break
						}

						if (title === 'Robot Check') {
							changeIpAddress()
						}

						await delay(2000 * retryNumber)
					}

					if (!success) {
						// Send a message to Telegram

						console.log("We're blocked")
						return
					}

					const asinList = await page.evaluate(() => {
						const asins = []
						const grid = document.getElementById('zg-ordered-list')
						const items = grid.querySelectorAll('li')

						items.forEach((item, index) => {
							const subCategory = document.querySelector(
								'.category'
							)
								? document.querySelector('.category').innerText
								: null
							const rank = item.querySelector('.zg-badge-text')
								? item
										.querySelector('.zg-badge-text')
										.innerHTML.split('#')[1]
								: null
							const asin = item.querySelector(
								'.a-link-normal:not(.a-size-small)'
							)
								? new URL(
										item.querySelector(
											'.a-link-normal:not(.a-size-small)'
										).href
								  ).pathname.split('/')[3]
								: null
							const image = item.querySelector('img')
								? item.querySelector('img').src
								: null
							const price = item.querySelector('.p13n-sc-price')
								? item.querySelector('.p13n-sc-price').innerText
								: null
							const title = item.querySelector(
								'.p13n-sc-truncated'
							)
								? item.querySelector('.p13n-sc-truncated')
										.innerText
								: null
							const rating = item.querySelector('.a-icon-alt')
								? item
										.querySelector('.a-icon-alt')
										.innerText.split(' ')[0]
								: null
							const reviews = item.querySelector(
								'.a-icon-row > a:nth-child(2)'
							)
								? item
										.querySelector(
											'.a-icon-row > a:nth-child(2)'
										)
										.innerText.split(',')
										.join('')
								: null

							asins.push({
								asin,
								title,
								category: {secondary: subCategory},
								image,
								rank: parseFloat(rank),
								price: price,
								rating: parseFloat(rating),
								reviews: parseFloat(reviews),
							})
						})

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

				const asinList = [
					...(await scrapeAsins()),
					...(await scrapeAsins(2)),
				]

				if (!asinList.length) {
					console.log('No asins found')
				}

				// Save the asins to the database
				asinList.forEach((asin, index) => {
					if (isObjectEmpty(asin) || !asin.asin) {
						console.log(asin)
						return
					}

					// Need to set the primary category here,
					//otherwise it's out of context
					asin.category.primary = category

					// if (DATABASE === 'firebase') {
					// 	const categoryRef = productsRef.doc(category)

					// 	// categoryRef.get().then((doc) => {
					// 	// 	if (!doc.exists) {
					// 	// 		batch.set(
					// 	// 			categoryRef,
					// 	// 			{
					// 	// 				name: category,
					// 	// 			},
					// 	// 			{merge: true}
					// 	// 		)
					// 	// 	}
					// 	// })
					// 	// batch.set(
					// 	// 	categoryRef,
					// 	// 	{
					// 	// 		name: category,
					// 	// 	},
					// 	// 	{merge: true}
					// 	// )

					// 	const asinRef = categoryRef
					// 		.collection(asin.asin)
					// 		.doc('details')

					// 	// asinRef.get().then((doc) => {
					// 	// 	if (!doc.exists) {
					// 	// 		batch.set(
					// 	// 			asinRef,
					// 	// 			{
					// 	// 				asin: asin.asin,
					// 	// 				image: asin.image,
					// 	// 				title: asin.title,
					// 	// 				category: asin.subCategory,
					// 	// 			},
					// 	// 			{merge: true}
					// 	// 		)
					// 	// 	}
					// 	// })
					// 	batch.set(
					// 		asinRef,
					// 		{
					// 			asin: asin.asin,
					// 			image: asin.image,
					// 			title: asin.title,
					// 			category: asin.subCategory,
					// 		},
					// 		{merge: true}
					// 	)

					// 	const dateRef = categoryRef
					// 		.collection(asin.asin)
					// 		.doc(DATE_PATH)

					// 	// dateRef.get().then((doc) => {
					// 	// 	if (!doc.exists) {
					// 	// 		batch.set(
					// 	// 			dateRef,
					// 	// 			{
					// 	// 				price: asin.price,
					// 	// 				rank: parseFloat(asin.rank),
					// 	// 				rating: parseFloat(asin.rating),
					// 	// 				reviews: parseFloat(asin.reviews),
					// 	// 			},
					// 	// 			{merge: true}
					// 	// 		)
					// 	// 	}
					// 	// })
					// 	batch.set(
					// 		dateRef,
					// 		{
					// 			price: asin.price,
					// 			rank: parseFloat(asin.rank),
					// 			rating: parseFloat(asin.rating),
					// 			reviews: parseFloat(asin.reviews),
					// 		},
					// 		{merge: true}
					// 	)
					// }

					if (DATABASE === 'mongo') {
						mongo.connect(
							mongoUrl,
							{
								useNewUrlParser: true,
								useUnifiedTopology: true,
							},
							async (error, client) => {
								if (error) {
									console.error(error)

									// @TODO Send message to Telegram

									return
								}
								const db = client.db('jungleHunt')
								const collection = 'products'

								try {
									database.findDocuments(
										db,
										collection,
										{asin: asin.asin},
										(docs) => {
											// The product is already in the database, we need to update it
											if (docs.length) {
												docs.forEach((doc) => {
													database.updateProduct(
														db,
														collection,
														doc,
														asin,
														(result) => {
															if (
																index + 1 ===
																asinList.length
															) {
																console.log(
																	colors.green(
																		`Products updated for subcategory #${i +
																			1} in ${category}`
																	)
																)
															}
														}
													)
												})
											}

											// The product record doesn't exist yet, we need to create it
											else {
												database.insertDocument(
													db,
													collection,
													asin,
													(result) => {
														if (
															index + 1 ===
															asinList.length
														) {
															console.log(
																colors.green(
																	`Products updated for subcategory #${i +
																		1} in ${category}`
																)
															)
														}
													}
												)
											}
										}
									)
								} catch (error) {
									console.log(
										colors.green(
											`Error updating Products for subcategory #${i +
												1} in ${category}`
										)
									)
									console.log(error)

									// Error updating/inserting the ASIN
									// @TODO Send message to Telegram
								}

								try {
									const asinStats = {
										asin: asin.asin,
										price: asin.price,
										rank: asin.rank,
										rating: asin.rating,
										reviews: asin.reviews,
										timestamp: new Date().toISOString(),
									}

									database.insertDocument(
										db,
										'productStats',
										asinStats,
										(result) => {
											if (index + 1 === asinList.length) {
												console.log(
													colors.green(
														`Product Stats updated for subcategory #${i +
															1} in ${category}`
													)
												)
											}
										}
									)
								} catch (error) {
									console.log(
										colors.red(
											`Error updating Product Stats for subcategory #${i +
												1} in ${category}`
										)
									)
									console.log(error)

									// Error updating/inserting the ASIN stats
									// @TODO Send message to Telegram
								}
							}
						)
					}
				})

				// if (DATABASE === 'firebase') {
				// 	batch
				// 		.commit()
				// 		.then(() => {
				// 			console.log(
				// 				`DB updated for subcategory #${i +
				// 					1} in ${category}`
				// 			)

				// 			if (
				// 				index + 1 === categories.length &&
				// 				i + 1 === urls.length
				// 			) {
				// 				console.log('Done')
				// 				process.exit()
				// 			}
				// 		})
				// 		.catch((error) => {
				// 			console.log(
				// 				`Error updating subcategory #${i +
				// 					1} in ${category}`,
				// 				error
				// 			)
				// 		})
				// }
			} catch (error) {
				console.log(
					colors.red(
						`Error scraping subcategory #${i + 1} in ${category}`
					)
				)
				console.log(error)
			} finally {
				await page.close()
				await browser.close()
			}
		}
	}
})()

// ;(async () => {
// 	Object.entries(categories).forEach(([category, urls]) => {
// 		urls.forEach(async (url) => {
// 			const batch = db.batch()

// 			const browser = await puppeteer.launch({
// 				ignoreHTTPSErrors: true,
// 				dumpio: false,
// 				// headless: true,
// 				devtools: false,
// 				// ignoreDefaultArgs: true,
// 				ignoreDefaultFlags: true,
// 				defaultViewport: {
// 					//--window-size in args
// 					width: 1280,
// 					height: 1024,
// 				},
// 				args: [
// 					/* TODO : https://peter.sh/experiments/chromium-command-line-switches/
// 					there is still a whole bunch of stuff to disable
// 					*/
// 					//'--crash-test', // Causes the browser process to crash on startup, useful to see if we catch that correctly
// 					// not idea if those 2 aa options are usefull with disable gl thingy
// 					// '--disable-canvas-aa', // Disable antialiasing on 2d canvas
// 					// '--disable-2d-canvas-clip-aa', // Disable antialiasing on 2d canvas clips
// 					'--disable-gl-drawing-for-tests', // BEST OPTION EVER! Disables GL drawing operations which produce pixel output. With this the GL output will not be correct but tests will run faster.
// 					// '--disable-dev-shm-usage', // ???
// 					// '--no-zygote', // wtf does that mean ?
// 					'--use-gl=desktop', // better cpu usage with --use-gl=desktop rather than --use-gl=swiftshader, still needs more testing.
// 					'--enable-webgl',
// 					'--hide-scrollbars',
// 					'--mute-audio',
// 					'--no-first-run',
// 					'--disable-infobars',
// 					'--disable-breakpad',
// 					'--ignore-gpu-blacklist',
// 					'--window-size=1280,1024', // see defaultViewport
// 					'--no-sandbox',
// 					'--disable-setuid-sandbox',
// 					'--ignore-certificate-errors',
// 					'--proxy-server=socks5://127.0.0.1:9050',
// 					'--proxy-bypass-list=*',
// 				],
// 			})

// 			const page = await browser.newPage()

// 			// @TODO Set a random user agent from array
// 			await page.setUserAgent(
// 				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36'
// 			)

// 			// enable request interception
// 			await page.setRequestInterception(true)

// 			page.on('request', (request) => {
// 				// Do nothing in case of non-navigation requests.
// 				if (!request.isNavigationRequest()) {
// 					request.continue()
// 					return
// 				}

// 				// Add a new header for navigation request.
// 				const headers = request.headers()
// 				headers['X-Requested-With'] = 'XMLHttpRequest'
// 				request.continue({headers})
// 			})

// 			page.on('response', (response) => {
// 				// Ignore requests that aren't the one we are explicitly doing
// 				if (
// 					response
// 						.request()
// 						.url()
// 						.split('?')[0] === url
// 				) {
// 					if (response.status() > 399) {
// 						exec(
// 							'(echo authenticate \'""\'; echo signal newnym; echo quit) | nc localhost 9051',
// 							async (error, stdout, stderr) => {
// 								if (stdout.match(/250/g).length === 3) {
// 									console.log('IP was changed')
// 								} else {
// 									console.log('IP tried to change but failed')
// 								}
// 							}
// 						)
// 					} else {
// 						console.log('IP remains the same')
// 					}
// 				}
// 			})

// 			try {
// 				const scrapeAsins = async (pg = 1) => {
// 					await page.goto(`${url}?pg=${pg}`)

// 					// @TODO mock user actions on the page (scrolls, clicks, mouse movements, delays, hovers, etc.)

// 					const asinList = await page.evaluate(() => {
// 						const asins = []
// 						const grid = document.getElementById('zg-ordered-list')
// 						const items = grid.querySelectorAll('li')
// 						items.forEach((item) => {
// 							const subCategory = document.querySelector(
// 								'.category'
// 							)
// 								? document.querySelector('.category').innerText
// 								: null
// 							const rank = item.querySelector('.zg-badge-text')
// 								? item
// 										.querySelector('.zg-badge-text')
// 										.innerHTML.split('#')[1]
// 								: null
// 							const asin = item.querySelector(
// 								'.a-link-normal:not(.a-size-small)'
// 							)
// 								? new URL(
// 										item.querySelector(
// 											'.a-link-normal:not(.a-size-small)'
// 										).href
// 								  ).pathname.split('/')[3]
// 								: null
// 							const image = item.querySelector('img')
// 								? item.querySelector('img').src
// 								: null
// 							const price = item.querySelector('.p13n-sc-price')
// 								? item.querySelector('.p13n-sc-price').innerText
// 								: null
// 							const title = item.querySelector(
// 								'.p13n-sc-truncated'
// 							)
// 								? item.querySelector('.p13n-sc-truncated')
// 										.innerText
// 								: null
// 							const rating = item.querySelector('.a-icon-alt')
// 								? item
// 										.querySelector('.a-icon-alt')
// 										.innerText.split(' ')[0]
// 								: null
// 							const reviews = item.querySelector(
// 								'.a-icon-row > a:nth-child(2)'
// 							)
// 								? item.querySelector(
// 										'.a-icon-row > a:nth-child(2)'
// 								  ).innerText
// 								: null

// 							asins.push({
// 								asin,
// 								image,
// 								price,
// 								title,
// 								rank,
// 								rating,
// 								reviews,
// 								subCategory,
// 							})
// 						})

// 						return asins
// 					})

// 					return asinList
// 				}

// 				const asinList = [
// 					...(await scrapeAsins()),
// 					...(await scrapeAsins(2)),
// 				]

// 				if (!asinList.length) {
// 					console.log('No asins found')
// 				}

// 				// Save the asins to the database
// 				asinList.forEach((asin) => {
// 					if (isObjectEmpty(asin) || !asin.asin) {
// 						console.log(asin)
// 						return
// 					}

// 					const categoryRef = productsRef.doc(category)

// 					batch.set(
// 						categoryRef,
// 						{
// 							name: category,
// 						},
// 						{merge: true}
// 					)

// 					const asinRef = categoryRef
// 						.collection(asin.asin)
// 						.doc('details')

// 					batch.set(
// 						asinRef,
// 						{
// 							asin: asin.asin,
// 							image: asin.image,
// 							title: asin.title,
// 							category: asin.subCategory,
// 						},
// 						{merge: true}
// 					)

// 					const dateRef = categoryRef
// 						.collection(asin.asin)
// 						.doc(DATE_PATH)

// 					batch.set(
// 						dateRef,
// 						{
// 							price: asin.price,
// 							rank: asin.rank,
// 							rating: asin.rating,
// 							reviews: asin.reviews,
// 						},
// 						{merge: true}
// 					)
// 				})

// 				batch
// 					.commit()
// 					.then(() => {
// 						console.log('DB updated')
// 					})
// 					.catch((error) => {
// 						console.log(error)
// 					})
// 			} catch (error) {
// 				console.log(error)
// 			} finally {
// 				await browser.close()
// 				return false
// 			}
// 		})
// 	})
// })()
