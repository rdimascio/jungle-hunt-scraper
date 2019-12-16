'use strict'

require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '894036353:AAEch4kCYoS7AUdm2qXPtUaxPHgDVjVvn48'

const bot = (polling = false) => {
	let bot

	if (polling) {
		bot = new TelegramBot(telegramBotToken, {polling: true})
	} else {
		bot = new TelegramBot(telegramBotToken)
	}

	return bot
}

module.exports = bot
