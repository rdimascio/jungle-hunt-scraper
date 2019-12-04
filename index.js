'use strict'

const {exec} = require('child_process')
const bot = require('./src/util/modules/Telegram')

// Matches "/start best sellers"
bot.onText(/\/start best sellers/, (msg, match) => {
	exec('npm run start:best-sellers')
})
