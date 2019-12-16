'use strict'

require('dotenv').config({path: require('find-config')('.env')})
const mongo = require('mongodb').MongoClient
const mongoUrl = `mongodb://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_IP}/${process.env.DB_DATABASE}`

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
