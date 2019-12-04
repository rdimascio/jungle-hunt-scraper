'use strict'

const {exec} = require('child_process')
const bot = require('./src/util/modules/Telegram')

// Matches "/start"
;(async () => {
	bot.onText(/\/start/, (msg, match) => {

		const chatId = msg.chat.id;

		bot.sendMessage(chatId, 'yo');
		// exec('node ./src/scripts/scrape/bestSellerLists.js')
	})
})()
