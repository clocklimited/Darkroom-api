const mongo = require('mongodb')
const tmp = require('tmp')
const { PassThrough } = require('stream')
const crypto = require('crypto')
const fs = require('fs')
const createTypeDetector = require('../type-detector')
const allowType = require('../type-whitelist')
const Backend = require('./Backend')

class MongoBackend extends Backend {
  setup(cb) {
    const client = new mongo.MongoClient(this.config.databaseUri)
    client
      .connect()
      .then(() => {
        const db = client.db(this.config.databaseName)

        const gfs = new mongo.GridFSBucket(db)

        this._db = db
        this._gfs = gfs

        cb()
      })
      .catch(cb)
  }

  clean(cb) {
    this._db
      .dropDatabase()
      .then(() => cb())
      .catch(cb)
  }

  isHealthy(cb) {
    if (!this._db) return cb(new Error('No mongo connection'))

    this._db
      .collection('users')
      .find({})
      .toArray()
      .then(() => cb(null, true))
      .catch((error) => cb(error, false))
  }

  _getReadStream(query, id) {
    const stream = new PassThrough()
    this._gfs
      .find(query)
      .limit(1)
      .toArray()
      .then((files) => files[0])
      .then((file) => {
        if (!file) return stream.emit('notFound', id)
        const readStream = this._gfs.openDownloadStream(file._id)
        readStream.pipe(stream)
        stream.emit('meta', {
          type: file.metadata.contentType,
          size: file.length,
          lastModified: file.uploadDate,
          originalId: file.metadata.originalId
        })

        readStream.on('error', (error) => {
          if (error.code === 'ENOENT') {
            stream.emit('notFound', id)
          } else {
            stream.emit('error', error)
          }
        })
      })
      .catch((error) => stream.emit('error', error))

    return stream
  }

  createDataReadStream(id) {
    return this._getReadStream({ 'metadata.md5': id }, id)
  }

  createCacheReadStream(id) {
    return this._getReadStream({ filename: id }, id)
  }

  createDataWriteStream() {
    const tmpFile = tmp.fileSync({ detachDescriptor: true })
    const tempWriteStream = fs.createWriteStream(tmpFile.name, {
      fd: tmpFile.fd
    })
    const typeDetectorStream = createTypeDetector()
    const passThrough = new PassThrough()
    const hash = crypto.createHash('md5')
    let size = 0
    let uploadType

    passThrough.on('data', (data) => {
      size += data.length
      hash.update(data)
    })

    typeDetectorStream.on('detect', (type) => {
      uploadType = type
      if (allowType(this.config, type, passThrough))
        typeDetectorStream.pipe(tempWriteStream)
    })

    tempWriteStream.on('finish', () => {
      const md5 = hash.digest('hex')

      if (size === 0) {
        const error = new Error('Zero size')
        error.name = 'SizeError'
        tmpFile.removeCallback()
        return passThrough.emit('error', error)
      }

      this._gfs
        .find({ 'metadata.md5': md5 })
        .limit(1)
        .toArray()
        .then((files) => files.length)
        .then((count) => {
          if (count > 0) {
            tmpFile.removeCallback()
            passThrough.emit('done', { id: md5, type: uploadType, size: size })
          } else {
            const mongoWriteStream = this._gfs.openUploadStream(md5, {
              metadata: { type: 'data', contentType: uploadType, md5 }
            })

            mongoWriteStream.on('close', () => {
              tmpFile.removeCallback()
              passThrough.emit('done', {
                id: md5,
                type: uploadType,
                size: size
              })
            })

            fs.createReadStream(tmpFile.name).pipe(mongoWriteStream)
          }
        })
        .catch((error) => {
          tmpFile.removeCallback()
          return passThrough.emit('error', error)
        })
    })

    passThrough.pipe(typeDetectorStream)

    return passThrough
  }

  async updateCacheOriginalId(cacheId, originalId) {
    await this._db
      .collection('fs.files')
      .updateMany(
        { filename: cacheId },
        { $set: { 'metadata.originalId': originalId } }
      )
  }

  async deleteData(id) {
    const deletes = []
    const cursor = this._gfs.find({
      'metadata.type': 'data',
      'metadata.md5': id
    })

    while (await cursor.hasNext()) {
      const file = await cursor.next()

      deletes.push(
        Promise.all([this._gfs.delete(file._id), this.clearCache(id)])
      )
    }

    await Promise.all(deletes)
  }

  async clearCache(originalId) {
    const deletes = []
    const cursor = this._gfs.find({
      'metadata.originalId': originalId,
      'metadata.type': 'cache'
    })

    while (await cursor.hasNext()) {
      const file = await cursor.next()

      deletes.push(this._gfs.delete(file._id))
    }

    await Promise.all(deletes)
  }

  createCacheWriteStream(id, originalId) {
    const typeDetectorStream = createTypeDetector()
    const passThrough = new PassThrough()
    let size = 0

    passThrough.on('data', (data) => {
      size += data.length
    })

    typeDetectorStream.on('detect', (type) => {
      const mongoWriteStream = this._gfs.openUploadStream(id, {
        metadata: { type: 'cache', originalId: originalId, contentType: type }
      })

      mongoWriteStream.on('finish', () => {
        if (size === 0) {
          const error = new Error('Zero size')
          error.name = 'SizeError'
          return passThrough.emit('error', error)
        }

        passThrough.emit('done', {
          id: id,
          size: mongoWriteStream.gridFSFile.length,
          type: type
        })
      })

      typeDetectorStream.pipe(mongoWriteStream)
    })

    passThrough.pipe(typeDetectorStream)

    return passThrough
  }
}

module.exports = MongoBackend
