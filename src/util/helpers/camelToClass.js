const camelToClass = (str) =>
	str
		.trim()
		.split(/(?=[A-Z])/)
		.join('-')
		.toLowerCase()

module.exports = camelToClass
