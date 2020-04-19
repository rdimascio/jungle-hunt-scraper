require('dotenv').config()

const fs = require('fs')
const AWS = require('aws-sdk')

const s3 = new AWS.S3()
const path = `${new Date().toLocaleDateString().replace(/\//g, '-')}`

fs.readFile(`/var/backups/mongo/${path}/jungleHunt.gz`, function (err, data) {
    if (err) {
        console.log(err)
    }

    const s3params = {
        Bucket: `jungle-hunt/backups/`,
        Key: `${path}.gz`,
        Body: data,
        ContentEncoding: 'gzip'
    }

    await s3.putObject(s3params).promise().catch((error) => console.log(error))
})
