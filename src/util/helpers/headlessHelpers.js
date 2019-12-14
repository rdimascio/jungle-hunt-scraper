require('dotenv').config()
const delay = require('./delay')
const {exec} = require('child_process')
const generateRandomNumbers = require('../../util/helpers/randomNumbers')

// Change the IP address using Tor
const changeIP = () => {
	exec(
		process.env.NODE_ENV === 'development'
			? '(echo authenticate ""; echo signal newnym; echo quit) | nc localhost 9051'
			: 'systemctl reload tor'
		// async (error, stdout, stderr) => {
		// 	if (stdout.match(/250/g).length === 3) {
		// 		console.log('IP was changed')
		// 	} else {
		// 		console.log('IP tried to change but failed')
		// 	}
		// }
	)
}

const isBrowserUsingTor = async (page, logger) => {
	const publicIps = ['12.205.195.90', '172.119.134.14', '167.71.144.15']

	try {
		await page.goto('https://checkip.amazonaws.com/')
		const IP = await page.evaluate(() => document.body.textContent.trim())

		if (IP && !publicIps.includes(IP)) {
			return true
		}

		logger.send({
			emoji: '🚨',
			message: `Tor failed to anonymize our IP. Using IP: ${IP}`,
			status: 'error',
		})

		return false
	} catch (error) {
		logger.send({
			emoji: '🚨',
			message: `There was an error checking our IP`,
			status: 'error',
			error
		})
		return false
	}
}

const mockUserActions = async (page) => {
	const randomNumbers = generateRandomNumbers(0, 49, 5)
	const delayTimer = 3000

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
			`ul.a-pagination ${pg === 1 ? '.a-last' : 'li:nth-child(1)'}`
		)
	} catch (error) {
		// silently fail
	}

	// Set a delay
	await page.waitFor(delayTimer - 1000)
}

const passBotDetection = async (page, url, logger, data = false) => {
	let proxy = false
	let success = false

	const PROXY = proxy ? 'https://jungle-hunt-proxy.herokuapps.com/' : ''
	const MAX_ATTEMPT = 5

	for (let attempt = 1; attempt <= MAX_ATTEMPT; attempt++) {
		try {
			const response = await page.goto(PROXY + url, {
				waitUntil: 'networkidle2',
				timeout: 0,
			})
	
			const title = await page.title()
	
			if (response.ok() && title !== 'Robot Check') {
				success = true
	
				if (process.env.NODE_ENV === 'development') {
					logger.send({
						emoji: '👍',
						message: `We've avoided detection${data ? ` on subcategory #${data.urls.index} in ${data.category.current}` : ''}`,
						status: 'info',
					})
				}
	
				await page.waitFor(3000)
				break
			} else if (title === 'Robot Check') {
				logger.send({
					emoji: '🚨',
					message: `We hit a captcha page. Changing IP and waiting 10 minutes...`,
					status: 'error',
				})
	
				proxy = true
	
				changeIP()
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

			proxy = true

			changeIP()
			await delay(4000 * retryNumber)
		} catch(error) {
			logger.send({
				emoji: '🚨',
				message: `Error passing bot detection`,
				status: 'error',
				error
			})
			return
		}
	}

	return success
}

const preparePageForTests = async (page) => {
	// Pass the User-Agent Test.
	const userAgents = [
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36',
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:70.0) Gecko/20100101 Firefox/70.0',
		'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/18.17763',
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/603.3.8 (KHTML, like Gecko)',
	]

	await page.setUserAgent(
		userAgents[Math.floor(Math.random() * userAgents.length)]
	)

	await page.setViewport({
		width: 1280 + Math.floor(Math.random() * 100),
		height: 1024 + Math.floor(Math.random() * 100),
	})

	// Pass the Webdriver Test.
	await page.evaluateOnNewDocument(() => {
		Object.defineProperty(navigator, 'webdriver', {
			get: () => false,
		})

		// Pass the Chrome Test.
		// We can mock this in as much depth as we need for the test.
		window.navigator.chrome = {
			runtime: {},
			// etc.
		}
		
		// Pass the Plugins Length Test.
		// Overwrite the `plugins` property to use a custom getter.
		Object.defineProperty(navigator, 'plugins', {
			// This just needs to have `length > 0` for the current test,
			// but we could mock the plugins too if necessary.
			get: () => [1, 2, 3, 4, 5],
		})

		// Pass the Languages Test.
		// Overwrite the `plugins` property to use a custom getter.
		Object.defineProperty(navigator, 'languages', {
			get: () => ['en-US', 'en'],
		})

		// Pass the Permissions Test.
		const originalQuery = window.navigator.permissions.query
		return (window.navigator.permissions.query = (parameters) =>
			parameters.name === 'notifications'
				? Promise.resolve({state: Notification.permission})
				: originalQuery(parameters))


	})
}

const preparePageForTor = async (page, url) => {
	await page.setDefaultNavigationTimeout(0)

	page.on('response', (response) => {
		// Ignore requests that aren't the one we are explicitly doing
		if (
			response
				.request()
				.url()
				.split('ref')[0] === url.split('ref')[0] &&
			!response.ok()
		) {
			// If the response isn't ok, change our IP
			changeIP()
		}
	})
}

const getAsinData = async (page) => {
	return await page.evaluate(() => {
		const asins = []

		const grid = document.getElementById('zg-ordered-list')
		const items = grid.querySelectorAll('li')

		const scrapeAsinData = (element) => {
			const asinData = {}
			asinData.category = {}

			asinData.category.secondary = document.querySelector('.category')
				? document.querySelector('.category').innerText
				: null
			asinData.rank = element.querySelector('.zg-badge-text')
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
			asinData.price = element.querySelector('.a-color-price')
				? element.querySelector('.a-color-price').innerText
				: null
			asinData.title = element.querySelector('.p13n-sc-truncated')
				? element.querySelector('.p13n-sc-truncated').innerText
				: null
			asinData.rating = element.querySelector('.a-icon-alt')
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
							.querySelector('.a-icon-row > a:nth-child(2)')
							.innerText.split(',')
							.join('')
				  )
				: null

			return asinData
		}

		items.forEach((item) => asins.push(scrapeAsinData(item)))

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
}

const getTermData = async (page) => {
	return await page.evaluate(() => {
		const response = {}
		const asins = {
			brand: [],
			product: [],
		}

		const brand = document.querySelector('span[data-component-type="s-top-slot"]')
		const brandAsins = brand.querySelectorAll('[data-asin]')

		const searchResults = document.querySelector('span[data-component-type="s-search-results"]')
		const sponsoredProducts = searchResults.querySelectorAll('[data-component-type="sp-sponsored-result"]')

		const getBrandData = (element) => element.getAttribute('data-asin')
		const getProductData = (element) => element.closest('.s-result-item').getAttribute('data-asin')

		brandAsins.forEach((asin) => asins.brand.push(getBrandData(asin)))
		sponsoredProducts.forEach((asin) => asins.product.push(getProductData(asin)))

		response.asins = asins

		return response
	})
}

module.exports = {
	changeIP,
	getAsinData,
	getTermData,
	mockUserActions,
	passBotDetection,
	isBrowserUsingTor,
	preparePageForTor,
	preparePageForTests
}
