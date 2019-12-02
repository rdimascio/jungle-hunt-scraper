const cron = require('node-cron')
const exec = require('child_process').exec

cron.schedule('45 9 0 0 0', () => {
	exec('npm run start:best-sellers')
})

// cron.schedule('45 12 0 0 0', () => {
// 	exec('npm run start:detail-pages')
// })
