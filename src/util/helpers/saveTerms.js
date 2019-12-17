const database = require('./database')
const config = require('../../../config')
const mongo = require('mongodb').MongoClient
const mongoUrl =
	config.NODE_ENV === 'development'
		? 'mongodb://localhost:27017'
		: `mongodb://${config.DB_USER}:${config.DB_PWD}@${config.DB_IP}/${config.DB_DATABASE}`

const saveTerms = async (keywords) => {
	let mongoClient
	let response = {success: false}

	try {
		const save = new Promise((resolve) => {
			mongo.connect(
				mongoUrl,
				{
					useNewUrlParser: true,
					useUnifiedTopology: true,
				},
				async (error, client) => {
					if (error) client.close()

					mongoClient = client
					const db = client.db(config.DB_DATABASE)

					database.insertKeywords(
						db,
						'searchTerms',
						keywords,
						(result) => {
							response.success = true
							client.close()
							resolve()
						}
					)
				}
			)
		})

		return save.then(() => response)
	} catch (error) {
		response.error = error
		mongoClient.close()

		return response
	}
}

module.exports = saveTerms
