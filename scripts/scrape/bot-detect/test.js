'use strict'

const puppeteer = require('puppeteer-extra')
const pluginStealth = require('puppeteer-extra-plugin-stealth')
const preparePageForTests = require('../../../helpers/preparePageForTests')

;(async () => {
	puppeteer.use(pluginStealth())

	const browser = await puppeteer.launch({
		// ignoreHTTPSErrors: true,
		// dumpio: false,
		// // headless: true,
		// devtools: false,
		// // ignoreDefaultArgs: true,
		// ignoreDefaultFlags: true,
		// defaultViewport: {
		// 	//--window-size in args
		// 	width: 1280,
		// 	height: 1024,
		// },
		args: [
			/* TODO : https://peter.sh/experiments/chromium-command-line-switches/
			there is still a whole bunch of stuff to disable
			*/
			//'--crash-test', // Causes the browser process to crash on startup, useful to see if we catch that correctly
			// not idea if those 2 aa options are usefull with disable gl thingy
			// '--disable-canvas-aa', // Disable antialiasing on 2d canvas
			// '--disable-2d-canvas-clip-aa', // Disable antialiasing on 2d canvas clips
			// '--disable-gl-drawing-for-tests', // BEST OPTION EVER! Disables GL drawing operations which produce pixel output. With this the GL output will not be correct but tests will run faster.
			// // '--disable-dev-shm-usage', // ???
			// // '--no-zygote', // wtf does that mean ?
			// '--use-gl=desktop', // better cpu usage with --use-gl=desktop rather than --use-gl=swiftshader, still needs more testing.
			// '--enable-webgl',
			// '--hide-scrollbars',
			// '--mute-audio',
			// '--no-first-run',
			// '--disable-infobars',
			// '--disable-breakpad',
			// '--ignore-gpu-blacklist',
			// '--window-size=1280,1024', // see defaultViewport
			// '--no-sandbox',
			// '--disable-setuid-sandbox',
			// '--ignore-certificate-errors',
			// '--disable-dev-shm-usage',
			// '--disable-accelerated-2d-canvas',
			// '--disable-gpu',
			'--proxy-server=socks5://127.0.0.1:9050',
			// '--proxy-bypass-list=*',
		],
	})

	const page = await browser.newPage()

	// enable request interception
	// await page.setRequestInterception(true)
	// await page.setDefaultNavigationTimeout(0)
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

	await page.goto('https://bot.sannysoft.com')
	await page.waitFor(5000)
	await page.screenshot({path: './scripts/scrape/bot-detect/testresult.png', fullPage: true})
	await browser.close()
})()
