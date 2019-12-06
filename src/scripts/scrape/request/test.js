'use strict'

// const request = require('request')
const jsdom = require('jsdom')
const axios = require('axios')

// const options = {
// 	method: 'GET',
// 	url:
// 		'http://cors-anywhere.herokuapp.com/http://www.amazon.com/dp/B07YVYN8SY',
// 	headers: {
// 		'X-Requested-With': 'XMLHttpRequest',
// 	},
// 	timeout: 5000,
// 	tunnel: false,
// 	rejectUnauthorized: false,
// 	// proxy: 'http://cors-anywhere.herokuapp.com/',
// 	gzip: true,
// }

// function callback(error, response, body) {
// 	if (error) {
// 		console.log(error)
// 		return
// 	}

// 	if (!error && response.statusCode == 200) {
// 		const start = Date.now()

// 		const dom = new jsdom.JSDOM(body)
// 		const document = dom.window.document
// 		const title = document.getElementById('productTitle').innerText
// 		// const image = document.getElementById('landingImage').src
// 		const price = document.getElementById('priceblock_ourprice').innerText

// 		console.log(title)
// 		console.log(price)

// 		const end = Date.now()
// 		console.log(`Finished in ${end - start} ms`)
// 	}

// }

// request(options, callback)

const getDeal = async () => {
	try {
		return await axios({
			url: 'http://proxy.junglehunt.io/http://www.amazon.com/dp/B07YVYN8SY',
			headers: {'X-Requested-With': 'XMLHttpRequest'},
		})
	} catch(error) {
		console.log(error)
	}
}

const displayDeal = async () => {
	const deal = await getDeal()

		const start = Date.now()

		const dom = new jsdom.JSDOM(deal.data)
		const document = dom.window.document
		const bodyClasses = document.body.classList
		const title = document.getElementById('productTitle').innerText
		// const image = document.getElementById('landingImage').src
		const price = document.getElementById('priceblock_ourprice').innerText

		console.log(title)
		console.log(price)
		console.log(bodyClasses)

		const end = Date.now()
		console.log(`Finished in ${end - start} ms`)
}

displayDeal()

// (async () => {
// 	await axios({
// 		url: 'http://cors-anywhere.herokuapp.com/http://www.amazon.com/dp/B07YVYN8SY'
// 	}).then((response) => {

// 		const start = Date.now()

// 		const dom = new jsdom.JSDOM(response.data)
// 		const document = dom.window.document
// 		const title = document.getElementById('productTitle').innerText
// 		// const image = document.getElementById('landingImage').src
// 		const price = document.getElementById('priceblock_ourprice').innerText

// 		console.log(title)
// 		console.log(price)

// 		const end = Date.now()
// 		console.log(`Finished in ${end - start} ms`)

// 	})
// })()
