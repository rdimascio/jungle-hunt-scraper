'use strict'

const config = require('../../../config')
const mongo = require('mongodb').MongoClient
const mongoUrl = `mongodb://${config.DB_USER}:${config.DB_PWD}@${config.DB_IP}/${config.DB_DATABASE}`

const database = require('../../helpers/database')

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
		const db = client.db('jungleHunt')
		const collection = 'products'

		database.findDocuments(db, collection, {}, (docs) => {

			// The product is already in the database, we need to update it
			if (docs.length) {
				console.log('Found docs')
				// docs.forEach((doc) => {
				// 	// database.updateProduct(db, collection, doc, asin, (result) => {
				// 	// 	console.log(`${asin.asin} updated`)
				// 	// })
				// 	console.log(doc)
				// })
			} else {
				console.log('Found nothing')
			}
			
			// The product record doesn't exist yet, we need to create it
			// else {
			// 	database.insertProduct(db, collection, asin, (result) => {
			// 		console.log(`${asin.asin} created`)
			// 	})
			// }

			client.close()
		})
	}
)
