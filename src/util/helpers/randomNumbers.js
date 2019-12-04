'use strict'

const generateRandomNumbers = (min = 0, max, limit) => {
	const numbers = []

	while (numbers.length < limit) {
		const randomNumber = Math.floor(Math.random() * max) + min
		if (numbers.indexOf(randomNumber) === -1) numbers.push(randomNumber)
	}

	return limit === 1 ? numbers[0] : numbers
}

module.exports = generateRandomNumbers
