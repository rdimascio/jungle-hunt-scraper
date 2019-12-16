'use strict'

const request = require('request')
const config = require('../../../config')
const Logger = require('../../util/lib/Logger')
const Browser = require('../../util/lib/Browser')
const delay = require('../../util/helpers/delay')
const chunk = require('../../util/helpers/chunk')
const args = require('minimist')(process.argv.slice(2))
const saveTerms = require('../../util/helpers/saveTerms')
const scrapeTerms = require('../../util/helpers/scrapeTerms')
const searchTermsList = require('../../../data/terms/keywordList')
const generateRandomNumbers = require('../../util/helpers/randomNumbers')
const mailgunOptions = {
	apiKey: config.MAILGUN_API_KEY,
	domain: config.MAILGUN_DOMAIN,
}
const Mailgun = require('mailgun-js')(mailgunOptions)

;(async () => {
	const logger = new Logger(`Search Term Scraper`)
	let headless

	process.setMaxListeners(12)

	// // We can handle our own termination signals, thank you
	// // This is SUPER important since we're launching headless
	// // with the handleSIGINT property set to false
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

	// // We don't want to run the scraper at the same time every single day,
	// // so we're going to wait a random time betwen 1 and 20 minutes
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

	headless = new Browser({logger})

	const chunkedKeywordList = chunk(searchTermsList, 10)

	// For each url in the category in the list
	for (
		let chunkedTermIndex = 0;
		chunkedTermIndex < chunkedKeywordList.length;
		chunkedTermIndex++
	) {
		for (
			let termIndex = 0;
			termIndex < chunkedKeywordList[chunkedTermIndex].length;
			termIndex++
		) {
			const lastTerm =
				chunkedTermIndex + 1 === chunkedKeywordList.length &&
				termIndex + 1 === chunkedKeywordList[chunkedTermIndex].length

			// Scrape dat shit
			const termData = await scrapeTerms(
				chunkedKeywordList[chunkedTermIndex],
				headless,
				logger
			)

			console.log(termData)
			process.exit()

			termData.forEach(async (term) => {
				// logger.send({
				// 	emoji: term.success ? '🎉' : '😰',
				// 	message: `Keyword #${termIndex + 1} ${
				// 		term.success ? 'is' : 'is not'
				// 	} showing`,
				// 	status: 'success',
				// })

				if (term.status === 'OK') {
					const screenshot = request(term.screenshot)
					const messageData = {
						subject: `Keyword Update: ${chunkedKeywordList[chunkedTermIndex].keyword}`,
						from: 'Visibly <postmaster@web.visibly.app>',
						to: chunkedKeywordList[chunkedTermIndex].emails
							.concat('ryand@channelbakers.com')
							.join(','),
						attachment: screenshot,
					}

					const failedMessageData = {
						...messageData,
						text: `Uh oh... Your ${chunkedKeywordList[chunkedTermIndex].placement} placement for the keyword "${chunkedKeywordList[chunkedTermIndex].keyword}" is not showing 😰`,
					}

					const successMessageData = {
						...messageData,
						text: `Woohoo! Your ${chunkedKeywordList[chunkedTermIndex].placement} placement for the keyword "${chunkedKeywordList[chunkedTermIndex].keyword}" is showing 🎉`,
					}

					const sendEmail = new Promise((resolve, reject) => {
						if (
							!term.success &&
							(chunkedKeywordList[chunkedTermIndex].sendOn ===
								'fail' ||
								chunkedKeywordList[chunkedTermIndex].sendOn ===
									'all')
						) {
							Mailgun.messages().send(
								failedMessageData,
								async (error, body) => {
									if (error) {
										logger.send({
											emoji: '🚨',
											message: `Error sending email for keyword: ${chunkedKeywordList[chunkedTermIndex].keyword}`,
											status: 'error',
											error,
										})
									}

									resolve()
								}
							)
						} else if (
							chunkedKeywordList[chunkedTermIndex].sendOn ===
								'success' ||
							chunkedKeywordList[chunkedTermIndex].sendOn ===
								'all'
						) {
							Mailgun.messages().send(
								successMessageData,
								async (error, body) => {
									if (error) {
										logger.send({
											emoji: '🚨',
											message: `Error sending email for keyword: ${chunkedKeywordList[chunkedTermIndex].keyword}`,
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
							logger.send({
								emoji: '🎉',
								message: `Finished scraping keywords`,
								status: 'success',
							})
							await headless.shutdown(false)
							headless = null
						}
					})

					// Save to the database
					const dbResponse = await saveTerms(term)

					if (dbResponse.success) {
						logger.send({
							emoji: '✅',
							message: `Saved keyword "${chunkedKeywordList[chunkedTermIndex].keyword}" to the database`,
							status: 'success',
						})
					}
				} else {
					if (lastTerm) {
						await headless.shutdown(false)
						headless = null
						process.exit()
					}
				}
			})
		}
	}
})()
