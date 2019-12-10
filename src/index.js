'use strict'

require('dotenv').config()
const {exec} = require('child_process')
const bot = require('./util/lib/Telegram')
// const TelegramBot = require('node-telegram-bot-api')

// const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
// const jungleHuntBot = new TelegramBot(telegramBotToken, {polling: true})

// Matches "/start"
;(async () => {
	const jungleHuntBot = bot(true)

	jungleHuntBot.on('message', (msg) => {
		if (msg.chat.id == process.env.TELEGRAM_USER_ID) {

			switch (msg.text) {
				case '/start:best-sellers':
					exec('node scripts/scrape/bestSellerLists.js')
					break
				case '/start:most-wished':
					exec('node scripts/scrape/mostWishedFor.js')
			}

		}
	})
})()
