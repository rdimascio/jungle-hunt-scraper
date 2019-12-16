require('dotenv').config()
const database = require('./database')
const mongo = require('mongodb').MongoClient
const mongoUrl =
	process.env.NODE_ENV === 'development'
		? 'mongodb://localhost:27017'
		: `mongodb://${process.env.DB_USER || 'jungle_hunt'}:${process.env
				.DB_PWD ||
				'2%40u%40#GV+%g0WhMbIc+wt2|(>G3+)%3Fh|m[q&LXLzQ#g$+f4ZI;ZST0HY(g|K-&VO'}@${process
				.env.DB_IP || '138.68.46.225'}/${process.env.DB_DATABASE ||
				'jungleHunt'}`

const saveKeyword = async (keywordData) => {
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
					const db = client.db(
						process.env.DB_DATABASE || 'jungleHunt'
					)

					database.insertKeyword(
						db,
						'searchTerms',
						keywordData,
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

module.exports = saveKeyword
