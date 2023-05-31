/* eslint-disable no-console */
const mongo = require('mongodb')
const GridStream = require('@appveen/gridfs-stream')
const AWS = require('aws-sdk')
const pLimit = require('p-limit')
const pRetry = require('p-retry')

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
    gfs.find({}).sort({ _id: -1 }).skip(index).limit(1).toArray()

  const findStart = async () => {
    let low = 0
    let high = count - 1
    if (high === -1) {
      // empty list
      return 0
    }

    const [firstGridFsFile] = await getFileAtIndex(0)
    const firstFileInS3 = await hasFileInS3(firstGridFsFile)
    if (!firstFileInS3) {
      return 0
    }

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      console.log({ low, high, mid })

      const [gridFsFile] = await getFileAtIndex(mid)
      const [nextGridFsFile] = await getFileAtIndex(mid + 1)

      console.log({
        gridFsFile: gridFsFile && gridFsFile.md5,
        nextGridFsFile: nextGridFsFile && nextGridFsFile.md5
      })
      const fileInS3 = await hasFileInS3(gridFsFile)
      const nextFileInS3 = nextGridFsFile
        ? await hasFileInS3(nextGridFsFile)
        : true
      console.log({
        fileInS3,
        nextFileInS3
      })

      if (fileInS3 && !nextFileInS3) {
        // Current file exists in S3, but next file (if any) doesn't exist,
        // meaning the current file is the last one not present in S3
        return mid - 1
      } else if (fileInS3) {
        // Current file exists in S3, move the search range to the right
        low = mid + 1
      } else {
        // Current file doesn't exist in S3, move the search range to the left
        high = mid - 1
      }
    }

    // All files exist in S3
    return count
  }

  const startPoint = await findStart()
  const files = await gfs.find({}).sort({ _id: -1 }).skip(startPoint).toArray()
  console.log(
    `${count} entities total - ${files.length} to migrate, ${startPoint} entities already migrated`
  )

  const migrateFile = (file, i) =>
    new Promise((resolve, reject) => {
      console.log(`Migrating #${i} ${file.md5}...`)
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

  const retryableFileMigrator = (file, i) =>
    pRetry(() => migrateFile(file, i), {
      retries: 5,
      onFailedAttempt: (error) => {
        console.log(
          `File #${i} ${file.md5} failed attempt #${error.attemptNumber}. ${error.retriesLeft} retries left.`
        )
      }
    })

  const limit = pLimit(10)
  await Promise.all(
    files.map((file, i) => limit(retryableFileMigrator, file, i))
  )

  console.log('Migration completed')
  client.close()
}

migrateImages().catch((error) => {
  console.error('Error during migration:', error)
  process.exit(1)
})
