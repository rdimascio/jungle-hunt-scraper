'use strict'

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
					const asinStats = {
						asin: doc.asin,
						price: doc.price.total,
						rank: doc.rank.total,
						rating: doc.rating.total,
						reviews: doc.reviews.total,
						timestamp: doc.price.timestamp,
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
							}
						}
					)
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
