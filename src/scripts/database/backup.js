require('dotenv').config()

const fs = require('fs')
const AWS = require('aws-sdk')

const s3 = new AWS.S3()
const path = '/var/backups/mongo/jungle-hunt'
const filename = `${new Date().toLocaleDateString().replace(/\//g, '-')}.gz`

if (!fs.existsSync(`${path}/${filename}`)) {
    console.log(`Backup file: ${filename} does not exist.`)
}

fs.readFile(`${path}/${filename}`, async (err, data) => {
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
