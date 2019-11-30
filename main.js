'use strict'

const firebase = require('firebase/app')
require('firebase/firestore')

// const ASINS = require('./asinList')
const chunk = require('./helpers/chunk')
const scrape = require('./helpers/scrape')

;(async () => {
	// const asins = Object.entries(ASINS)

	

	for (let [key, value] of asins) {
		const CHUNKED_ASIN_LIST = chunk(value.asinList, 1)
		// const FILE_NAME = key
		const DATE = new Date()
		const DAY = DATE.getDate()
		const MONTH = DATE.getMonth() + 1
		const YEAR = DATE.getFullYear()
		const DATE_PATH = `${MONTH}-${DAY}-${YEAR}`

		for (let i = 0; i < CHUNKED_ASIN_LIST.length; i++) {
			try {
				const data = await scrape(CHUNKED_ASIN_LIST[i])

				if (!data) return

				// if (!fs.existsSync(`./asins/${DATE_PATH}`)) {
				// 	fs.mkdirSync(`./asins/${DATE_PATH}`)
				// }

				// const fileData = fs.existsSync(
				// 	`./asins/${DATE_PATH}/${FILE_NAME}.json`
				// )
				// 	? fs.readFileSync(
				// 			`./asins/${DATE_PATH}/${FILE_NAME}.json`,
				// 			'utf8'
				// 	  )
				// 	: []
				// const failedAsinData = fs.existsSync(
				// 	`./asins/${DATE_PATH}/failedAsins.json`
				// )
				// 	? fs.readFileSync(
				// 			`./asins/${DATE_PATH}/failedAsins.json`,
				// 			'utf8'
				// 	  )
				// 	: []

				// let asins = fileData.length ? JSON.parse(fileData) : []
				// let failedAsins = failedAsinData.length
				// 	? JSON.parse(failedAsinData)
				// 	: []

				data.forEach((asin) => {
					if (
						asin.asin &&
						asin.offeringID &&
						asin.offeringID.length
					) {
						// Save to DB
					}
				})

				// fs.writeFileSync(
				// 	`./asins/${DATE_PATH}/${FILE_NAME}.json`,
				// 	JSON.stringify(asins)
				// )
				// fs.writeFileSync(
				// 	`./asins/${DATE_PATH}/failedAsins.json`,
				// 	JSON.stringify(failedAsins)
				// )
			} catch (error) {
				console.log(error)
			}
		}
	}
})()
