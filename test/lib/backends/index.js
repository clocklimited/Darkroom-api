const mongoConfig = require('con.figure')(require('../../config')())
const s3Config = require('con.figure')(require('../../config')())

mongoConfig.databaseUri =
  process.env.MONGO_URL || 'mongodb://localhost:27017/darkroom-test'

s3Config.backend = 'S3'
s3Config.accessKeyId = process.env.S3_ACCESS_KEY_ID
s3Config.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
s3Config.region = process.env.S3_REGION
s3Config.bucket = process.env.S3_BUCKET

module.exports = function () {
  return [
    {
      name: 'Mongo Grid FS',
      config: mongoConfig,
      cacheFinder: async (backend, id) => {
        return backend._db
          .collection('fs.files')
          .findOne({ 'metadata.originalId': id })
      },
      dataFinder: async (backend) => {
        return await backend._db.collection('fs.files').findOne()
      }
    },
    {
      name: 'S3',
      config: s3Config,
      cacheFinder: async (backend, id) => {
        const listParams = {
          Bucket: backend.config.bucket,
          Prefix: `cache/`,
          MaxKeys: 1000
        }
        const listResult = await backend._s3.listObjectsV2(listParams).promise()
        const objectMetadatas = await Promise.all(
          listResult.Contents.map((item) => {
            return backend._s3
              .headObject({ Bucket: backend.config.bucket, Key: item.Key })
              .promise()
          })
        )
        const cachedObject = objectMetadatas.find((item) => {
          return item.Metadata && item.Metadata.originalid === id
        })
        if (!cachedObject) {
          return null
        }

        return {
          type: cachedObject.ContentType,
          size: cachedObject.ContentLength,
          lastModified: cachedObject.LastModified,
          originalId: cachedObject.Metadata.originalid
        }
      },
      dataFinder: async (backend, id) => {
        let data
        try {
          data = await backend._s3
            .headObject({ Bucket: backend.config.bucket, Key: `data/${id}` })
            .promise()
        } catch (error) {
          if (error.code === 'NotFound') {
            return null
          }
        }
        return data
      }
    }
  ]
}
