'use strict'

require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
// const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN

const bot = (polling = false) => {
	let bot

	if (polling) {
		bot = new TelegramBot('894036353:AAEch4kCYoS7AUdm2qXPtUaxPHgDVjVvn48', {polling: true})
	} else {
		bot = new TelegramBot('894036353:AAEch4kCYoS7AUdm2qXPtUaxPHgDVjVvn48')
	}

	return bot
}

module.exports = bot
