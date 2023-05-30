/* eslint-disable no-console */
const fs = require('fs')
const AWS = require('aws-sdk')
const pLimit = require('p-limit')

// Requires full config to be set
const config = require('con.figure')(require('../../config')())

const { readdir, stat } = require('fs/promises')
const { join, parse, resolve } = require('path')

const mmm = require('mmmagic')
const Magic = mmm.Magic
const magic = new Magic(mmm.MAGIC_MIME)

const getMime = (path) =>
  new Promise((resolve, reject) => {
    magic.detectFile(path, (error, mime) => {
      if (error) {
        return reject(error)
      }
      resolve(mime)
    })
  })

async function getFilesTree(type, dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true }))
        .filter((child) => !child.name.startsWith('.')) // skip hidden
        .map(async (child) => {
          const base = parse(child.name).base
          const path = resolve(dir, child.name)
          const stats = await stat(path)
          const contentType = await getMime(path)
          return child.isDirectory()
            ? await getFilesTree(type, join(dir, child.name))
            : {
                type,
                id: base,
                path,
                created: stats.ctime,
                size: stats.size,
                contentType
              }
        })
        .filter(Boolean)
        .flat()
    )
  ).flat()
}

async function migrateImages() {
  console.log(`Starting migration from filesystem to ${config.bucket}`)
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

  const allFiles = [
    await getFilesTree('cache', config.paths.cache()),
    await getFilesTree('data', config.paths.data())
  ]
    .flat()
    .sort((a, b) => a.ctime - b.ctime)

  // list files and count
  const count = allFiles.length

  const hasFileInS3 = async (file) => {
    try {
      const s3Object = await s3
        .headObject({
          Bucket: config.bucket,
          Key: `${file.type}/${file.id}`
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

  const getFileAtIndex = (index) => allFiles[index]

  const findStart = async () => {
    let low = 0
    let high = count - 1
    if (high === -1) {
      // empty list
      return 0
    }

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      console.log({ low, high, mid })

      const fsFile = getFileAtIndex(mid)
      const nextFsFile = getFileAtIndex(mid + 1)

      const fileInS3 = await hasFileInS3(fsFile)
      const nextFileInS3 = nextFsFile ? await hasFileInS3(nextFsFile) : true
      console.log({
        fsFile: fsFile && fsFile.id,
        nextFsFile: nextFsFile && nextFsFile.id,
        fileInS3,
        nextFileInS3
      })

      if (!fileInS3) {
        // File doesn't exist in S3, return the index
        return mid + 1
      } else if (fileInS3 && !nextFileInS3) {
        // Current file exists in S3, but next file (if any) doesn't exist,
        // meaning the current file is the last one not present in S3
        return mid
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
  const files = allFiles.slice(startPoint - 1)

  console.log(
    `${count} entities total - ${files.length} to migrate, ${startPoint} entities already migrated`
  )

  const migrateFile = (file) =>
    new Promise((resolve, reject) => {
      console.log(`Migrating ${file.id}...`)
      const readStream = fs.createReadStream(file.path)

      const params = {
        Bucket: config.bucket,
        Key: `${file.type}/${file.id}`,
        ContentType: file.contentType,
        ContentLength: file.size,
        Metadata: { type: file.type },
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
}

migrateImages().catch((error) => {
  console.error('Error during migration:', error)
  process.exit(1)
})
