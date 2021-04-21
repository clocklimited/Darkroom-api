const mongo = require('mongodb')
const Grid = require('gridfs-stream')
const temp = require('temp')
const { PassThrough } = require('stream')
const createTypeDetector = require('../type-detector')
const crypto = require('crypto')
const fs = require('fs')
const allowType = require('../type-whitelist')

module.exports = function (config, cb) {
  mongo.MongoClient.connect(config.databaseUri, function (err, db) {
    if (err) return cb(err)

    const gfs = new Grid(db, mongo)
    const factory = { _db: db, _gfs: gfs }

    temp.track()

    function createWriteStream() {
      const typeDetectorStream = createTypeDetector()
      const passThrough = new PassThrough()
      const tempWriteStream = temp.createWriteStream()
      const hash = crypto.createHash('md5')
      let size = 0
      let uploadType

      passThrough.on('data', function (data) {
        size += data.length
        hash.update(data)
      })

      typeDetectorStream.on('detect', function (type) {
        uploadType = type
        if (allowType(config, type, passThrough))
          typeDetectorStream.pipe(tempWriteStream)
      })

      tempWriteStream.on('finish', function () {
        const md5 = hash.digest('hex')

        if (size === 0) {
          const error = new Error('Zero size')
          error.name = 'SizeError'
          return passThrough.emit('error', error)
        }

        gfs.files.count({ md5: md5 }, function (err, count) {
          if (err) return passThrough.emit('error', err)
          if (count > 0) {
            passThrough.emit('done', { id: md5, type: uploadType, size: size })
          } else {
            const mongoWriteStream = gfs.createWriteStream({
              _id: '',
              mode: 'w',
              content_type: uploadType,
              metadata: { type: 'data' }
            })

            mongoWriteStream.on('close', function () {
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

    function createCacheWriteStream(id) {
      const typeDetectorStream = createTypeDetector()
      const passThrough = new PassThrough()
      let size = 0

      passThrough.on('data', function (data) {
        size += data.length
      })

      typeDetectorStream.on('detect', function (type) {
        const mongoWriteStream = gfs.createWriteStream({
          filename: id,
          mode: 'w',
          content_type: type,
          metadata: { type: 'cache' }
        })

        mongoWriteStream.on('close', function (file) {
          if (size === 0) {
            const error = new Error('Zero size')
            error.name = 'SizeError'
            return passThrough.emit('error', error)
          }

          passThrough.emit('done', { id: id, size: file.length, type: type })
        })

        typeDetectorStream.pipe(mongoWriteStream)
      })

      passThrough.pipe(typeDetectorStream)

      return passThrough
    }

    factory.createDataWriteStream = createWriteStream
    factory.createCacheWriteStream = createCacheWriteStream

    function createReadStream(query, id) {
      const stream = new PassThrough()
      gfs.findOne(query, function (err, file) {
        // todo: Write test
        if (file === null) return stream.emit('notFound', id)
        if (err) return stream.emit('error', err)
        const readStream = gfs.createReadStream({ _id: file._id })
        readStream.pipe(stream)
        stream.emit('meta', {
          type: file.contentType,
          size: file.length,
          lastModified: file.uploadDate
        })

        readStream.on('error', function (err) {
          if (err.code === 'ENOENT') {
            stream.emit('notFound', id)
          } else {
            stream.emit('error', err)
          }
        })
      })

      return stream
    }

    factory.createDataReadStream = function (id) {
      return createReadStream({ md5: id }, id)
    }

    factory.createCacheReadStream = function (id) {
      return createReadStream({ filename: id }, id)
    }

    factory.setup = function setup(cb) {
      cb(null)
    }

    factory.clean = function clean(cb) {
      db.collection('fs.files').remove(function () {
        db.collection('fs.chunks').remove(cb)
      })
    }

    factory.isHealthy = function isHealthy(cb) {
      db.collection('users')
        .find({})
        .toArray(function (err) {
          if (err) {
            return cb(err, false)
          }
          cb(null, true)
        })
    }

    cb(null, factory)
  })
}
