'use strict'

const args = require('minimist')(process.argv.slice(2));
const find = require('find-process')

const bestSellerCategories = require('../../../../data/categories/bestSeller')
const categories = Object.entries(bestSellerCategories)

;(async () => {
	console.log(args.l)

	find('name', 'bestSeller.js', true)
		.then(function (list) {
			console.log(list);
		});

	// for (let [index, [category, urls]] of categories.entries()) {
	// 	console.log(category)

	// 	for (let i = 0; i < urls.length; i++) {
	// 		console.log(urls[i])
	// 	}
	// }
})()
