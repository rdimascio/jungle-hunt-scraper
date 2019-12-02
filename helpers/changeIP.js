'use strict'

require('dotenv').config()
const exec = require('child_process').exec

// Change the IP address using Tor
const changeIpAddress = () => {
	exec(
		process.env.NODE_ENV === 'development'
			? '(echo authenticate ""; echo signal newnym; echo quit) | nc localhost 9051'
			: 'sudo systemctl reload tor',
		async (error, stdout, stderr) => {
			if (stdout.match(/250/g).length === 3) {
				console.log('IP was changed')
			} else {
				console.log('IP tried to change but failed')
			}
		}
	)
}

module.exports = changeIpAddress
