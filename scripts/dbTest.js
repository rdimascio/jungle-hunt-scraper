'use strict'

const mongo = require('mongodb').MongoClient
const mongoUrl = 'mongodb://localhost:27017'

const database = require('../helpers/database')

mongo.connect(
	mongoUrl,
	{
		useNewUrlParser: true,
		useUnifiedTopology: true,
	},
	async (err, client) => {
		if (err) {
			console.error(err)
			return
		}
		const db = client.db('test')
		const collection = 'inventory'

		database.findProduct(db, collection, {asin: asin.asin}, (docs) => {

			// The product is already in the database, we need to update it
			if (docs.length) {
				docs.forEach((doc) => {
					database.updateProduct(db, collection, doc, asin, (result) => {
						console.log(`${asin.asin} updated`)
					})
				})
			}
			
			// The product record doesn't exist yet, we need to create it
			else {
				database.insertProduct(db, collection, asin, (result) => {
					console.log(`${asin.asin} created`)
				})
			}

			client.close()
		})
	}
)
