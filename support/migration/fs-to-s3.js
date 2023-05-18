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
    let pivot = count - 1
    let foundFile = false
    while (pivot !== 0) {
      const fsFile = getFileAtIndex(pivot)
      if (!fsFile) {
        return pivot
      }
      const fileInS3 = await hasFileInS3(fsFile)

      console.log({
        pivot,
        fileInS3,
        key: `${fsFile.type}/${fsFile.id}`
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
  const files = allFiles.slice(startPoint)

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
