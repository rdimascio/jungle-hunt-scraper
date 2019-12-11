const find = require('find-process')
const {exec} = require('child_process')

;(async () => {
	find('name', 'test.js', true).then(function(list) {
		list.forEach((process) => {
			exec(`kill -9 ${process.pid}`)
		})
	})
})()
