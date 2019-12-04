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
	})

	// Pass the Chrome Test.
	await page.evaluateOnNewDocument(() => {
		// We can mock this in as much depth as we need for the test.
		window.navigator.chrome = {
			runtime: {},
			// etc.
		}
	})

	// Pass the Permissions Test.
	await page.evaluateOnNewDocument(() => {
		const originalQuery = window.navigator.permissions.query
		return (window.navigator.permissions.query = (parameters) =>
			parameters.name === 'notifications'
				? Promise.resolve({state: Notification.permission})
				: originalQuery(parameters))
	})

	// Pass the Plugins Length Test.
	await page.evaluateOnNewDocument(() => {
		// Overwrite the `plugins` property to use a custom getter.
		Object.defineProperty(navigator, 'plugins', {
			// This just needs to have `length > 0` for the current test,
			// but we could mock the plugins too if necessary.
			get: () => [1, 2, 3, 4, 5],
		})
	})

	// Pass the Languages Test.
	await page.evaluateOnNewDocument(() => {
		// Overwrite the `plugins` property to use a custom getter.
		Object.defineProperty(navigator, 'languages', {
			get: () => ['en-US', 'en'],
		})
	})
}

module.exports = preparePageForTests
