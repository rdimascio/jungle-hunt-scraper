'use strict'

require('dotenv').config()
const request = require('request')
const Logger = require('../../util/lib/Logger')
const Browser = require('../../util/lib/Browser')
const scrapeTerms = require('../../util/helpers/scrapeTerms')
const searchTermsList = require('../../../data/terms/keywordList')
const Mailgun = require('mailgun-js')({
	apiKey: process.env.MAILGUN_API_KEY,
	domain: 'app.junglehunt.io',
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

		// Save all that data to the base
		if (termData.status === 'OK') {
			// const dbResponse = await saveAsins(
			// 	listData.asins,
			// 	listData.list.type,
			// 	{
			// 		interval: listData.urls.index,
			// 		category: listData.category.current,
			// 	},
			// 	logger
			// )

			logger.send({
				emoji: '🚀',
				message: `Finished scraping keyword: ${searchTermsList[termIndex].keyword}`,
				status: 'success',
			})

			const screenshot = request(termData.screenshot)

			const data = {
				from: 'Jungle Hunt <no-reply@app.junglehunt.io>',
				to: 'jessicas@channelbakers.com, norab@channelbakers.com',
				subject: 'Keyword Update',
				text: `Your ${
					searchTermsList[termIndex].placement
				} placement for the keyword "${searchTermsList[termIndex].keyword}" is ${
					termData.success ? '' : 'not '
				}showing`,
				attachment: screenshot
			}

			Mailgun.messages().send(data, async (error, body) => {
				if (error) {
					console.log(error)
				}

				if (lastTerm) {
					console.log(body)
					await headless.shutdown()
					process.exit()
				}
			})
		}

		// if (lastTerm) {
		// 	await headless.shutdown()
		// 	process.exit()
		// }
	}
})()
