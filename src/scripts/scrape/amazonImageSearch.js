'use strict'

const puppeteer = require('puppeteer-extra')
const pluginStealth = require('puppeteer-extra-plugin-stealth')

;(async () => {
	puppeteer.use(pluginStealth())
	puppeteer.use(require('puppeteer-extra-plugin-anonymize-ua')())

	const browser = await puppeteer.launch({
		// userDataDir,
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

	const page = await browser.newPage()

	await page.goto(
		'https://www.amazon.com/Headphone-Wireless-Headphones-Matching-Detachable/dp/B01N1TCF1W',
		{
			waitUntil: 'networkidle2',
			timeout: 0,
		}
	)

	await page.waitFor(3000)

	const image = await page.evaluate(
		() => document.getElementById('landingImage').src
	)

	console.log(image)

	await browser.close()
})()
