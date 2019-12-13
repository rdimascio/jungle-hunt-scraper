const path = require('path')
const psList = require('ps-list')

;(async () => {
	console.log('Testing /stop command')
	const processes = await psList()
	const puppeteer = processes.filter((ps) => ps.name === 'chrome')
	const scraper = processes.filter((ps) =>
		ps.cmd.includes('node /app/src/scripts/scrape/main.js')
	)
	const puppeteerPids = puppeteer.map((ps) => ps.pid)
	const scraperPid = scraper.map((ps) => ps.pid)

	console.log('Scraper PID:', scraperPid)
	console.log('Chrome PIDs:', puppeteerPids)
	// kill(scraperPid, 'SIGKILL')
	// puppeteerPids.forEach((pid) => {
	// 	console.log(pid)
	// 	kill(pid, 'SIGKILL')
	// })

	// const puppeteerPids = puppeteer.map((ps) => ps.pid)
	// const scraperPid = scraper.map((ps) => ps.id)

	// kill(scraperPid, 'SIGINT')
	// puppeteerPids.forEach((pid) => {
	// 	kill(pid, 'SIGKILL')
	// })
})()
