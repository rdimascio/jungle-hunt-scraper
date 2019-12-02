'use strict'

const assert = require('assert')
const {createLogger, format, transports} = require('winston')
const {combine, timestamp, label, printf} = format

const DATE = new Date()
const DAY = DATE.getDate()
const MONTH = DATE.getMonth() + 1
const YEAR = DATE.getFullYear()

const myFormat = printf(
	({level, message, label, timestamp}) =>
		`${timestamp} [${label}] ${level}: ${message}`
)

const logger = createLogger({
	level: 'info',
	format: combine(label({label: 'Best Seller List'}), timestamp(), myFormat),
	defaultMeta: {service: 'user-service'},
	transports: [
		//
		// - Write to all logs with level `info` and below to `combined.log`
		// - Write all logs error (and below) to `error.log`.
		//
		new transports.File({
			filename: `./data/logs/${MONTH}-${DAY}-${YEAR}-error.log`,
			level: 'error',
		}),
		new transports.File({
			filename: `./data/logs/${MONTH}-${DAY}-${YEAR}-info.log`,
		}),
	],
})

// const insertDocument = (db, col, doc, callback) => {
// 	const collection = db.collection(col)

// 	collection.insertOne(doc, function(err, result) {
// 		assert.equal(err, null)
// 		callback(result)
// 	})
// }

const insertProducts = (db, products, callback) => {
	const collection = db.collection('products')

	const formattedProducts = products.map((product) => {
		const insertObject = {}
		insertObject.insertOne = {
			document: product,
		}

		return insertObject
	})

	try {
		const bulkInsert = collection.bulkWrite(formattedProducts)
		callback(bulkInsert)
	} catch {
		logger.error(error)
		
		if (DEV) {
			console.log(error)
		}

		callback(error)
	}
}

const insertProductStats = (db, products, callback) => {
	const collection = db.collection('productStats')

	const formattedProducts = products.map((product) => {
		const productStats = {
			asin: product.asin,
			price: product.price,
			rank: product.rank,
			rating: product.rating,
			reviews: product.reviews,
			timestamp: new Date().toISOString(),
		}

		const insertObject = {}
		insertObject.insertOne = {
			document: productStats,
		}

		return insertObject
	})

	try {
		const bulkInsert = collection.bulkWrite(formattedProducts)
		callback(bulkInsert)
	} catch (error) {
		logger.error(error)

		if (DEV) {
			console.log(error)
		}

		callback(error)
	}
}

const updateProduct = (db, doc, product, callback) => {
	const collection = db.collection('products')
	const metrics = ['price', 'rank', 'reviews', 'rating']
	const newDoc = {}

	// Rewrite all metric fields, so the metrics are all up to date
	metrics.forEach((metric) => {
		if (product[metric]) newDoc[metric] = product[metric]
	})

	Object.entries(doc).forEach(([key, value]) => {
		// Rewrite any null field for the document
		if (value === null && product[key]) newDoc[key] = product[key]

		// We changed the category schema,
		// so we need to update explicitly for now
		if (key === 'category' && typeof key !== 'object')
			newDoc[key] = product[key]
	})

	collection.updateOne(
		{asin: doc.asin},
		{
			$set: newDoc,
		},
		function(err, result) {
			assert.equal(err, null)
			assert.equal(1, result.result.n)
			callback(result)
		}
	)
}

const updateProducts = (db, products, callback) => {
	const collection = db.collection('products')

	const formattedProducts = products.map((product) => {
		const insertObject = {}
		insertObject.updateOne = {
			filter: {asin: product.asin},
			update: {
				$set: {
					price: product.price,
					rating: product.rating,
					reviews: product.reviews,
					rank: product.rank,
				},
			},
		}

		return insertObject
	})

	try {
		const bulkUpdate = collection.bulkWrite(formattedProducts)
		callback(bulkUpdate)
	} catch (error) {
		logger.error(error)

		if (DEV) {
			console.log(error)
		}

		callback(error)
	}
}

const findDocuments = (db, col, doc = {}, callback) => {
	const collection = db.collection(col)

	collection.find(doc).toArray(function(err, docs) {
		assert.equal(err, null)
		callback(docs)
	})
}

module.exports = {
	// insertDocument,
	insertProducts,
	insertProductStats,
	updateProduct,
	updateProducts,
	findDocuments,
}
