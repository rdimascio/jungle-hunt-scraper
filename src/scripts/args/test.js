const args = require('minimist')(process.argv.slice(2))

;(async () => {
	console.log(args.l.split(','))
})()
