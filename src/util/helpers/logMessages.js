const fs = require('fs')

const logMessages = {
	start: (logger, listName, startTime) => {
		logger.send({
			emoji: '🚀',
			message: `Started scraping ${listName} at ${startTime.toLocaleString()}`,
			status: 'success',
		})
	},
	database: (logger, response, listData) => {
		if (response.success) {
			logger.send({
				emoji: '✅',
				message: `${
					response.asinsInserted ? response.asinsInserted : 0
				} products inserted, ${
					response.asinsUpdated ? response.asinsUpdated : 0
				} products updated, and ${
					response.asinStatsInserted ? response.asinStatsInserted : 0
				} product stats inserted for subcategory #${
					listData.urls.index
				} in ${listData.category.current} in ${listData.list.name}`,
				status: 'success',
			})
		} else {
			logger.send({
				emoji: '🚨',
				message: `Error updating the database for subcategory #${listData.urls.index} in ${listData.category.current} in ${listData.list.name}`,
				status: 'error',
				error: response.error,
			})
		}
	},
	finish: (logger, listName, startTime) => {
		const DATE_FINISHED = new Date()
		const TIME_ELAPSED = DATE_FINISHED - startTime

		// Remainder of TIME_ELAPSED / days divided by hours
		const HOURS_ELAPSED = Math.floor(
			(TIME_ELAPSED % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
		)

		// Remainder of TIME_ELAPSED / hours divided by minutes
		const MINUTES_ELAPSED = Math.floor(
			(TIME_ELAPSED % (1000 * 60 * 60)) / (1000 * 60)
		)

		// Remainder of TIME_ELAPSED / minutes divided by seconds
		const SECONDS_ELAPSED = Math.floor((TIME_ELAPSED % (1000 * 60)) / 1000)

		logger.send({
			emoji: '🎉',
			message: `Finished scraping ${listName} in ${
				HOURS_ELAPSED > 0 ? `${HOURS_ELAPSED} hours, ` : ''
			}${MINUTES_ELAPSED} minutes and ${SECONDS_ELAPSED} seconds`,
			status: 'success',
		})

		fs.writeFileSync('./logs/lastScrapeTime.txt', startTime.getTime())
	},
	kill: (logger) => {
		logger.send({
			emoji: '🚨',
			message: `Process terminated with SIGINT`,
			status: 'error',
		})
	},
}

module.exports = logMessages
