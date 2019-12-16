require('dotenv').config({path: require('find-config')('.env')})
const database = require('./database')
const mongo = require('mongodb').MongoClient
const mongoUrl =
	process.env.NODE_ENV === 'development'
		? 'mongodb://localhost:27017'
		: `mongodb://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_IP}/${process.env.DB_DATABASE}`

/**
 *
 * @param {Array} asins the list of 100 asins from the page we just scraped
 * @param {String} listType the type of list we just scraped. i.e. Best Seller, Most Gifted, etc. Determines the collection we save the data
 * @param {Object} loopPosition the position we're at in the loop. properties include iterator and category
 */
const findAsins = async (asins, listType) => {
	const found = []

	const find = new Promise((resolve) => {
		mongo.connect(
			mongoUrl,
			{
				useNewUrlParser: true,
				useUnifiedTopology: true,
			},
			async (error, client) => {
				const db = client.db(process.env.DB_DATABASE)

				asins.forEach((asin, index) => {
					database.findProducts(
						db,
						`${listType}Products`,
						{asin: asin.asin},
						(docs) => {
							if (docs.length) {
								found.push(asin)
							}

							if (index + 1 === asins.length) {
								client.close()
								resolve()
							}
						}
					)
				})
			}
		)
	})

	return find.then(() => found)
}

const saveAsins = async (asins, listType, loopPosition) => {
	let mongoClient
	let response = {success: false}

	try {
		const asinsToUpdate = [...(await findAsins(asins, listType))]
		const asinsToInsert = [
			...asins.filter((asin) => !asinsToUpdate.includes(asin)),
		]

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

					if ([...asinsToInsert, ...asinsToUpdate].length) {
						database.insertStats(
							db,
							`${listType}Stats`,
							[
								...(asinsToInsert ? asinsToInsert : []),
								...(asinsToUpdate ? asinsToUpdate : []),
							],
							(result) => {
								response.asinStatsInserted = [
									...asinsToInsert,
									...asinsToUpdate,
								].length
								// logger.send({
								// 	emoji: '✅',
								// 	message: `Product Stats inserted for subcategory #${loopPosition.interval +
								// 		1} in ${loopPosition.category}`,
								// 	status: 'success',
								// })
							}
						)
						// } catch (error) {
						// 	logger.send({
						// 		emoji: '🚨',
						// 		message: `Error inserting Product Stats for subcategory #${loopPosition.interval +
						// 			1} in ${loopPosition.category}`,
						// 		status: 'error',
						// 	})

						// 	client.close()
						// 	if (!terminated) await shutdown(browser)
						// }
					} else {
						client.close()
						resolve()
					}

					if (asinsToUpdate.length) {
						database.updateProducts(
							db,
							`${listType}Products`,
							asinsToUpdate,
							(result) => {
								response.asinsUpdated = asinsToUpdate.length
								// logger.send({
								// 	emoji: '✅',
								// 	message: `Products updated for subcategory #${loopPosition.interval +
								// 		1} in ${loopPosition.category}`,
								// 	status: 'success',
								// })

								if (!asinsToInsert.length) {
									response.success = true
									client.close()
									resolve()
								}
							}
						)
						// } catch (error) {
						// 	logger.send({
						// 		emoji: '🚨',
						// 		message: `Error updating Products for subcategory #${loopPosition.interval +
						// 			1} in ${loopPosition.category}`,
						// 		status: 'error',
						// 	})

						// 	client.close()
						// 	if (!terminated) await shutdown(browser)
						// }
					}

					if (asinsToInsert.length) {
						database.insertProducts(
							db,
							`${listType}Products`,
							asinsToInsert,
							(result) => {
								response.asinsInserted = asinsToInsert.length
								// logger.send({
								// 	emoji: '✅',
								// 	message: `Products inserted for subcategory #${loopPosition.interval +
								// 		1} in ${loopPosition.category}`,
								// 	status: 'success',
								// })

								response.success = true
								client.close()
								resolve()
							}
						)
						// } catch (error) {
						// 	logger.send({
						// 		emoji: '🚨',
						// 		message: `Error inserting Products for subcategory #${loopPosition.interval +
						// 			1} in ${loopPosition.category}`,
						// 		status: 'error',
						// 	})

						// 	client.close()

						// 	if (!terminated) await shutdown(browser)
						// }
					}
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

module.exports = saveAsins
