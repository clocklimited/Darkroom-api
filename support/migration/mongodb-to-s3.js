/* eslint-disable no-console */
const mongo = require('mongodb')
const GridStream = require('@appveen/gridfs-stream')
const AWS = require('aws-sdk')
const pLimit = require('p-limit')

// Requires full config to be set
const config = require('con.figure')(require('../../config')())

async function migrateImages() {
  console.log(
    `Starting migration from ${config.databaseUri} to ${config.bucket}`
  )
  const client = new mongo.MongoClient(config.databaseUri)
  await client.connect()

  const db = client.db(config.databaseName)
  const gfsStream = new GridStream(db, mongo)
  const gfs = new mongo.GridFSBucket(db)

  AWS.config.update({
    endpoint: config.endpoint,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: config.region
  })

  const s3 = new AWS.S3()

  await s3
    .headBucket({ Bucket: config.bucket })
    .promise()
    .catch((error) => {
      if (error.code === 'NotFound') {
        throw new Error(
          `Bucket does not exist, please create bucket "${config.bucket}"`
        )
      }
    })

  const count = await db.collection('fs.files').countDocuments({})

  const hasFileInS3 = async (file) => {
    try {
      const s3Object = await s3
        .headObject({
          Bucket: config.bucket,
          Key: `${file.metadata.type}/${file.md5}`
        })
        .promise()
      return s3Object !== null
    } catch (error) {
      if (error.code === 'NotFound') {
        return false
      }
      throw error
    }
  }

  const getFileAtIndex = (index) =>
    gfs
      .find()
      .sort({ _id: -1 })
      .skip(index - 1)
      .limit(1)
      .toArray()

  const findStart = async () => {
    let pivot = count
    let foundFile = false
    while (pivot !== 0) {
      const [gridFsFile] = await getFileAtIndex(pivot)
      if (!gridFsFile) {
        return pivot - 1
      }
      const fileInS3 = await hasFileInS3(gridFsFile)

      console.log({
        pivot,
        fileInS3,
        key: `${gridFsFile.metadata.type}/${gridFsFile.md5}`
      })
      if (fileInS3) {
        foundFile = true
      } else {
        if (foundFile) {
          // we went from having files at the pivot index to not
          // - we found where we should start from!
          return pivot - 1
        }
      }
      if (foundFile) {
        // increment until we find the first missing file
        pivot++
      } else {
        pivot = Math.floor(pivot / 2)
      }
    }
    return pivot // 0 at this point
  }

  const startPoint = await findStart()
  const files = await gfs.find({}).sort({ _id: -1 }).skip(startPoint).toArray()
  console.log(
    `${count} entities total - ${files.length} to migrate, ${startPoint} entities already migrated`
  )

  const migrateFile = (file) =>
    new Promise((resolve, reject) => {
      console.log(`Migrating ${file._id}...`)
      const readStream = gfsStream.createReadStream({ _id: file._id })

      const params = {
        Bucket: config.bucket,
        Key: `${file.metadata.type}/${file.md5}`,
        ContentType: file.contentType,
        ContentLength: file.length,
        Metadata: { type: file.metadata.type },
        Body: readStream
      }
      s3.upload({ ...params }, (error) => {
        if (error) {
          console.error('upload error', error)
          return reject(error)
        }
        resolve()
      })
    })

  const limit = pLimit(5)
  await Promise.all(files.map((file) => limit(migrateFile, file)))

  console.log('Migration completed')
  client.close()
}

migrateImages().catch((error) => {
  console.error('Error during migration:', error)
  process.exit(1)
})
