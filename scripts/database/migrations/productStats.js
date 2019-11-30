'use strict'

const colors = require('colors')
const mongo = require('mongodb').MongoClient
const mongoUrl = 'mongodb://localhost:27017'
const database = require('../../../helpers/database')

mongo.connect(
	mongoUrl,
	{
		useNewUrlParser: true,
		useUnifiedTopology: true,
	},
	async (error, client) => {
		if (error) {
			console.error(error)
			return
		}
		const db = client.db('jungleHunt')

		try {
			database.findDocuments(db, 'products', {}, (docs) => {
				docs.forEach((doc, index) => {
					if (
						doc.price[0].total !== null &&
						doc.rank[0].total !== null &&
						doc.rating[0].total !== null &&
						doc.reviews[0].total !== null
					) {
						const asinStats = {
							asin: doc.asin,
							price: doc.price[0].total,
							rank: doc.rank[0].total,
							rating: doc.rating[0].total,
							reviews: doc.reviews[0].total,
							timestamp: doc.price[0].timestamp,
						}

						database.insertDocument(
							db,
							'productStats',
							asinStats,
							(result) => {
								if (index + 1 === docs.length) {
									console.log(
										colors.green(
											`Done migrating Products into Product Stats`
										)
									)

									client.close()
								}
							}
						)
					}
				})
			})
		} catch (error) {
			console.log(
				colors.green(`Error migrating Products into Product Stats`)
			)
			console.log(error)
		}
	}
)
