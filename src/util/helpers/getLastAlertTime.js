const fs = require('fs')
const path = './logs/lastAlertTime.txt'

const lastAlertTime = () =>
	fs.existsSync(path) && fs.readFileSync(path, 'utf8', (err, data) =>
		err ? err : data
	)

module.exports = lastAlertTime
