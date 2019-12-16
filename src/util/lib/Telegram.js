'use strict'

const config = require('../../../config')
const TelegramBot = require('node-telegram-bot-api')
const telegramBotToken = config.TELEGRAM_BOT_TOKEN

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
