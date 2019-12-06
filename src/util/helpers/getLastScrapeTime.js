const fs = require('fs')

const lastScrapeTime = () =>
	fs.readFileSync('./lastScrapeTime.txt', 'utf8', (err, data) =>
		err ? err : data
	)

module.exports = lastScrapeTime
