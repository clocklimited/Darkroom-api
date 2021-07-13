const mongo = require('mongodb')
const GridStream = require('gridfs-stream')
const tmp = require('tmp')
const { PassThrough } = require('stream')
const crypto = require('crypto')
const fs = require('fs')
const createTypeDetector = require('../type-detector')
const allowType = require('../type-whitelist')
const Backend = require('./Backend')

class MongoBackend extends Backend {
  setup(cb) {
    mongo.MongoClient.connect(this.config.databaseUri, (error, db) => {
      if (error) return cb(error)

      const gfsStream = new GridStream(db, mongo)
      const gfs = new mongo.GridFSBucket(db)

      this._db = db
      this._gfsStream = gfsStream
      this._gfs = gfs

      cb()
    })
  }

  clean(cb) {
    this._db.dropDatabase(cb)
  }

  isHealthy(cb) {
    this._db
      .collection('users')
      .find({})
      .toArray((error) => {
        if (error) {
          return cb(error, false)
        }
        cb(null, true)
      })
  }

  _getReadStream(query, id) {
    const stream = new PassThrough()
    this._gfsStream.findOne(query, (error, file) => {
      if (file === null) return stream.emit('notFound', id)
      if (error) return stream.emit('error', error)
      const readStream = this._gfsStream.createReadStream({ _id: file._id })
      readStream.pipe(stream)
      stream.emit('meta', {
        type: file.contentType,
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

    return stream
  }

  createDataReadStream(id) {
    return this._getReadStream({ md5: id }, id)
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

      this._gfsStream.files.count({ md5: md5 }, (error, count) => {
        if (error) {
          tmpFile.removeCallback()
          return passThrough.emit('error', error)
        }
        if (count > 0) {
          tmpFile.removeCallback()
          passThrough.emit('done', { id: md5, type: uploadType, size: size })
        } else {
          const mongoWriteStream = this._gfsStream.createWriteStream({
            _id: '',
            mode: 'w',
            content_type: uploadType,
            metadata: { type: 'data' }
          })

          mongoWriteStream.on('close', () => {
            tmpFile.removeCallback()
            passThrough.emit('done', {
              id: md5,
              type: uploadType,
              size: size
            })
          })

          fs.createReadStream(tempWriteStream.path).pipe(mongoWriteStream)
        }
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
      md5: id,
      'metadata.type': 'data'
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
      const mongoWriteStream = this._gfsStream.createWriteStream({
        filename: id,
        mode: 'w',
        content_type: type,
        metadata: { type: 'cache', originalId: originalId }
      })

      mongoWriteStream.on('close', (file) => {
        if (size === 0) {
          const error = new Error('Zero size')
          error.name = 'SizeError'
          return passThrough.emit('error', error)
        }

        passThrough.emit('done', {
          id: id,
          size: file.length,
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
