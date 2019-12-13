'use strict'

require('dotenv').config()
const request = require('request')
const Logger = require('../../util/lib/Logger')
const Browser = require('../../util/lib/Browser')
const scrapeTerms = require('../../util/helpers/scrapeTerms')
const searchTermsList = require('../../../data/terms/keywordList')
const Mailgun = require('mailgun-js')({
	apiKey: process.env.MAILGUN_API_KEY,
	domain: process.env.MAILGUN_DOMAIN,
})

;(async () => {
	const logger = new Logger(`Search Term Scraper`)
	const headless = new Browser({logger})

	// We can handle our own termination signals, thank you
	// This is SUPER important since we're launching headless
	// with the handleSIGINT property set to false
	process.on('SIGINT', async () => {
		logger.send({
			emoji: '🚨',
			message: `Process terminated with SIGINT`,
			status: 'error',
		})
		await headless.shutdown()
	})

	// For each url in the category in the list
	for (let termIndex = 0; termIndex < searchTermsList.length; termIndex++) {
		const lastTerm = termIndex + 1 === searchTermsList.length

		// Scrape dat shit
		const termData = await scrapeTerms(
			searchTermsList[termIndex],
			headless,
			logger
		)

		await headless.cleanupBrowser()

		if (termData.status === 'OK') {
			logger.send({
				emoji: '🎉',
				message: `Finished scraping keyword: ${searchTermsList[termIndex].keyword}`,
				status: 'success',
			})

			const screenshot = request(termData.screenshot)
			const messageData = {
				subject: `Keyword Update: ${searchTermsList[termIndex].keyword}`,
				from: 'Visibly <postmaster@web.visibly.app>',
				to: searchTermsList[termIndex].emails
					.concat('ryand@channelbakers.com')
					.join(','),
				attachment: screenshot,
			}

			const failedMessageData = {
				...messageData,
				text: `Uh oh... Your ${searchTermsList[termIndex].placement} placement for the keyword "${searchTermsList[termIndex].keyword}" is not showing 😰`,
			}

			const successMessageData = {
				...messageData,
				text: `Woohoo! Your ${searchTermsList[termIndex].placement} placement for the keyword "${searchTermsList[termIndex].keyword}" is showing 🎉`,
			}

			const sendEmail = new Promise((resolve, reject) => {
				if (
					!termData.success &&
					(searchTermsList[termIndex].sendOn === 'fail' ||
						searchTermsList[termIndex].sendOn === 'all')
				) {
					Mailgun.messages().send(
						failedMessageData,
						async (error, body) => {
							if (error) {
								logger.send({
									emoji: '🚨',
									message: `Error sending email for keyword: ${searchTermsList[termIndex].keyword}`,
									status: 'error',
									error,
								})
							}

							resolve()
						}
					)
				} else if (
					searchTermsList[termIndex].sendOn === 'success' ||
					searchTermsList[termIndex].sendOn === 'all'
				) {
					Mailgun.messages().send(
						successMessageData,
						async (error, body) => {
							if (error) {
								logger.send({
									emoji: '🚨',
									message: `Error sending email for keyword: ${searchTermsList[termIndex].keyword}`,
									status: 'error',
									error,
								})
							}

							resolve()
						}
					)
					resolve()
				}
			})

			sendEmail.then(async () => {
				if (lastTerm) {
					await headless.shutdown()
					process.exit()
				}
			})

			// Save to the database
			// const dbResponse = await saveTerms(
			// 	listData.asins,
			// 	listData.list.type,
			// 	{
			// 		interval: listData.urls.index,
			// 		category: listData.category.current,
			// 	},
			// 	logger
			// )
		}
	}
})()
