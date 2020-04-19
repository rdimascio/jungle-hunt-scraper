'use strict'

require('dotenv').config()

const mongo = require('mongodb').MongoClient
const mongoUrl = `mongodb://${pricess.env.DB_USER}:${pricess.env.DB_PWD}@${pricess.env.DB_IP}:27017/${pricess.env.DB_DATABASE}`

const database = require('../../util/helpers/database')

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
		const collection = 'bestSellerProducts'

		database.findProducts(db, collection, {}, (docs) => {

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
