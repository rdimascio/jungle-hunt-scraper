require('dotenv').config()
const database = require('./database')
const mongo = require('mongodb').MongoClient
const mongoUrl =
	process.env.NODE_ENV === 'development'
		? 'mongodb://localhost:27017'
		: `mongodb://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_IP}/${process.env.DB_DATABASE}`

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
					const db = client.db(process.env.DB_DATABASE)

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
