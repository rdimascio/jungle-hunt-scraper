const fs = require('fs')

const mkdirAsync = (dir) => !fs.existsSync(dir) && fs.mkdirSync(dir)

module.exports = mkdirAsync
