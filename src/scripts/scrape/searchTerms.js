'use strict'

require('dotenv').config()
const request = require('request')
const Logger = require('../../util/lib/Logger')
const Browser = require('../../util/lib/Browser')
const delay = require('../../util/helpers/delay')
const args = require('minimist')(process.argv.slice(2))
const scrapeTerms = require('../../util/helpers/scrapeTerms')
const searchTermsList = require('../../../data/terms/keywordList')
const generateRandomNumbers = require('../../util/helpers/randomNumbers')
const Mailgun = require('mailgun-js')({
	apiKey: process.env.MAILGUN_API_KEY,
	domain: process.env.MAILGUN_DOMAIN,
})

;(async () => {
	const logger = new Logger(`Search Term Scraper`)
	let headless

	// We can handle our own termination signals, thank you
	// This is SUPER important since we're launching headless
	// with the handleSIGINT property set to false
	process.on('SIGINT', async () => {
		try {
			logger.send({
				emoji: '🚨',
				message: `Process terminated with SIGINT`,
				status: 'error',
			})
			await headless.shutdown()
		} catch (error) {
			process.exit()
		}
	})

	// For each url in the category in the list
	for (let termIndex = 0; termIndex < searchTermsList.length; termIndex++) {
		const lastTerm = termIndex + 1 === searchTermsList.length

		if (termIndex === 0) {
			// We don't want to run the scraper at the same time every single day,
			// so we're going to wait a random time betwen 1 and 20 minutes
			if (args.d || args.delay) {
				const randomWaitTimer = generateRandomNumbers(
					1000 * 60 * 1,
					1000 * 60 * 20,
					1
				)

				await delay(randomWaitTimer)
			}

			logger.send({
				emoji: '🚀',
				message: `Started scraping keywords`,
				status: 'success',
			})
		}

		headless = new Browser({logger})

		// Scrape dat shit
		const termData = await scrapeTerms(
			searchTermsList[termIndex],
			headless,
			logger
		)

		logger.send({
			emoji: '🎉',
			message: `Finished scraping keyword #${termIndex + 1}`,
			status: 'success',
		})

		console.log(termData)

		await headless.shutdown(false)
		headless = null

		if (termData.status === 'OK') {
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
				console.log(`Term #${termIndex + 1} out of ${searchTermsList.length}`)
				if (lastTerm) {
					logger.send({
						emoji: '🎉',
						message: `Finished scraping keywords`,
						status: 'success',
					})
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
