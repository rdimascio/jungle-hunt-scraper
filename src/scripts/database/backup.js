require('dotenv').config()

const fs = require('fs')
const path = require('path')
const AWS = require('aws-sdk')
const moment = require('moment')

const s3 = new AWS.S3()
const dir = path.dirname('/var/backups/mongo/jungle-hunt/')
const filename = `${moment().format('MM-DD-YYYY')}.gz`

if (!fs.existsSync(path.join(dir, filename))) {
    console.log(`Backup file: ${filename} does not exist.`)
}

fs.readFile(path.join(dir, filename), async (err, data) => {
    if (err) {
        console.log(err)
    }

    const s3params = {
        Bucket: `jungle-hunt/backups/`,
        Key: `${filename}`,
        Body: data,
        ContentEncoding: 'gzip'
    }

    await s3.putObject(s3params).promise().catch((error) => console.log(error))
})
