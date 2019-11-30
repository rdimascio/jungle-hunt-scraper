'use strict'

const assert = require('assert')

const insertProduct = function(db, col, doc, callback) {
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

	metrics.forEach((metric) => {
		if (product[metric])
			newDoc[metric] = [...doc[metric], ...product[metric]]
	})

	Object.entries(doc).forEach(([key, value]) => {
		if (value === null && product[key]) newDoc[key] = product[key]
		if (key === 'category' && typeof key !== 'object')
			newDoc[key] = product[key]
	})

	collection.updateOne(
		{item: doc.item},
		{
			$set: newDoc,
			// $currentDate: {lastModified: true},
		},
		function(err, result) {
			assert.equal(err, null)
			assert.equal(1, result.result.n)
			callback(result)
		}
	)
}

const findProduct = function(db, col, doc = {}, callback) {
	const collection = db.collection(col)

	collection.find(doc).toArray(function(err, docs) {
		assert.equal(err, null)
		callback(docs)
	})
}

module.exports = {
	insertProduct,
	updateProduct,
	findProduct,
}
