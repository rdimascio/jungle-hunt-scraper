'use strict'

require('dotenv').config({path: require('find-config')('.env')})
const colors = require('colors')
const {createLogger, format, transports} = require('winston')
const {combine, timestamp, label, printf} = format
const notifier = require('node-notifier')
const bot = require('./Telegram')

const DATE = new Date()
const DAY = DATE.getDate()
const MONTH = DATE.getMonth() + 1
const YEAR = DATE.getFullYear()

const DEV = process.env.NODE_ENV === 'development'

class Logger {
	constructor(title) {
		this.title = title
		this.notify = notifier
		this.bot = bot()
		this.format = this._loggerFormat()
		this.logger = this._createLogger()
	}

	_loggerFormat() {
		return printf(
			({level, message, label, timestamp}) =>
				`${timestamp} [${label}] ${level}: ${message}`
		)
	}

	_createLogger() {
		return createLogger({
			level: 'info',
			format: combine(
				label({label: this.title}),
				timestamp(),
				this.format
			),
			defaultMeta: {service: 'user-service'},
			transports: [
				new transports.File({
					filename: `./logs/error-${MONTH}-${DAY}-${YEAR}.log`,
					level: 'error',
				}),
				new transports.File({
					filename: `./logs/info-${MONTH}-${DAY}-${YEAR}.log`,
				}),
			],
		})
	}

	send(options) {
		const INCLUDE_ALL = !options.loggers || options.loggers === 'all'

		if (!DEV) {
			if (INCLUDE_ALL || options.loggers.includes('telegram')) {
				try {
					this.bot.sendMessage(
						process.env.TELEGRAM_USER_ID,
						[options.emoji, `[${this.title}]:`, options.message].join(' ')
					)
				} catch (error) {
					this.logger.error('Failed to send message to Telegram')
				}
			}
	
			if (INCLUDE_ALL || options.loggers.includes('logger')) {
				this.logger[options.status === 'error' ? 'error' : 'info'](options.message)
	
				if (options.error) {
					this.logger.error(options.error)
				}
			}
		} else {
			if (INCLUDE_ALL || options.loggers.includes('console')) {
				console.log(
					colors[options.status === 'error' ? 'red' : 'green'](
						[`${options.emoji} `, options.message].join(' ')
					)
				)

				if (options.error) {
					console.error(options.error)
				}
			}

			if (INCLUDE_ALL || options.loggers.includes('notify')) {
				this.notify.notify({
					title: this.title,
					message: [options.emoji, options.message].join(' '),
				})
			}
		}
	}
}

module.exports = Logger
