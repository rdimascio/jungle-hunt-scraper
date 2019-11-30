'use strict'

const assert = require('assert')

const insertDocument = function(db, col, doc, callback) {
	const collection = db.collection(col)

	collection.insertOne(doc, function(err, result) {
		assert.equal(err, null)
		callback(result)
	})
}

const updateProduct = function(db, col, doc, product, callback) {
	const collection = db.collection(col)
	const metrics = ['price', 'rank', 'reviews', 'rating']
	const newDoc = {}

	// Rewrite all metric fields, so the metrics are all up to date
	metrics.forEach((metric) => {
		if (product[metric])
			newDoc[metric] = product[metric]
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
			$set: newDoc
		},
		function(err, result) {
			assert.equal(err, null)
			assert.equal(1, result.result.n)
			callback(result)
		}
	)
}

const findDocuments = function(db, col, doc = {}, callback) {
	const collection = db.collection(col)

	collection.find(doc).toArray(function(err, docs) {
		assert.equal(err, null)
		callback(docs)
	})
}

module.exports = {
	insertDocument,
	updateProduct,
	findDocuments,
}
