const os = require('os')
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const kill = require('tree-kill')
const find = require('find-process')
const delay = require('../helpers/delay')
const mkdir = require('../helpers/mkdir')

const puppeteer = require('puppeteer-extra')
const pluginStealth = require('puppeteer-extra-plugin-stealth')
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')

class Browser {
	constructor(params) {
		this.params = params
		this._browser = null
		this._directory = null
		this.logger = params.logger
		this.maxRunningTime = 60 * 60 * 1000

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

		// return (async () => {
		// 	return await this.init()
		// })()

		return this
	}

	get browser() {
		return (async () => await this.browserInstance())()
	}

	set browser(instance) {
		this._browser = instance
	}

	get directory() {
		return this._directory
	}

	set directory(path) {
		this._directory = path
	}

	setupDirectory() {

		if (!fs.existsSync(`${os.tmpdir()}/puppeteer`))
			fs.mkdirSync(`${os.tmpdir()}/puppeteer`);

		const dataDir = path.join(`${os.tmpdir()}/puppeteer`, Date.now().toString())
		this.directory = dataDir
		mkdir(dataDir)

		this.logger.send({
			emoji: '📂',
			title: 'Best Seller List Scraper',
			message: `Set up temporary directory at ${dataDir}`,
			status: 'success',
		})

		return dataDir
	}

	cleanupDirectory(path) {
		return new Promise((resolve) => {
			rimraf(path, () => {
				this.logger.send({
					emoji: '📁',
					title: 'Best Seller List Scraper',
					message: `Removed temporary directory at ${path}`,
					status: 'success',
				})
				resolve()
			})
		})
	}

	async userDataDir() {
		return this.setupDirectory()
	}

	async browserInstance() {
		if (!this._browser) {
			try {
				const userDataDir = !this.directory
					? this.setupDirectory()
					: this.directory

				this.browser = await puppeteer.launch({
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
						'--disable-dev-shm-usage', // https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#tips
						'--disable-accelerated-2d-canvas',
						'--disable-gpu',
						'--proxy-server=socks5://127.0.0.1:9050',
						// '--proxy-bypass-list=*',
					],
				})

				this._browser.__BROWSER_START_TIME_MS__ = Date.now()

				this.logger.send({
					emoji: '🦄',
					message: `Browser launched at ${new Date().toLocaleString()}`,
					status: 'success',
				})
			} catch (error) {
				this.logger.send({
					emoji: '💀',
					message: `Error launching puppeteer`,
					status: 'error',
					error: error,
				})

				process.exit()
			}
		}

		return this._browser
	}

	async cleanupBrowser(newBrowser = true) {
		// Kill it if it's time
		if (
			this._browser &&
			this._browser.__BROWSER_START_TIME_MS__ &&
			Date.now() - this._browser.__BROWSER_START_TIME_MS__ >=
				this.maxRunningTime
		) {
			kill(this._browser.process().pid, 'SIGKILL')
			await this.cleanupDirectory(this.directory)
			this.browser = null

			if (newBrowser) {
				await this.browserInstance()
			}
		}
		// Cleanup the browser's pages
		const pages = this._browser ? await this._browser.pages() : null

		return pages
			? Promise.all(pages.map((page) => page && page.close()))
			: false
	}

	async close() {
		if (this._browser)
			kill(this._browser.process().pid, 'SIGKILL')

		find('name', 'puppeteer', true)
			.then(function (list) {
				list.forEach((process) => {
					kill(process.pid, 'SIGKILL')
				})
			})

		await this.cleanupDirectory(this.directory)

		this.logger.send({
			emoji: '💀',
			title: 'Best Seller List Scraper',
			message: `Browser has been killed and cleaned`,
			status: 'success',
		})
	}

	async shutdown(kill = true) {
		await this.cleanupBrowser(false)
		await this.close()

		await delay(2000)

		if (kill) process.exit()
	}

	// async init() {
	// 	// await this.browserInstance()

	// 	return this
	// }
}

module.exports = Browser
