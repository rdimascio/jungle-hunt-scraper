const fs = require('fs')
const path = './logs/lastScrapeTime.txt'

const lastScrapeTime = () =>
	fs.existsSync(path) && fs.readFileSync(path, 'utf8', (err, data) =>
		err ? err : data
	)

module.exports = lastScrapeTime
