var mongo = require('mongodb')
  , Grid = require('gridfs-stream')
  , temp = require('temp')
  , PassThrough = require('stream').PassThrough
  , createTypeDetector = require('../type-detector')
  , crypto = require('crypto')
  , fs = require('fs')

module.exports = function (config, cb) {

  mongo.MongoClient.connect(config.databaseUri, function (err, db) {
    if (err) return cb(err)

    var factory = {}
      , gfs = new Grid(db, mongo)

    temp.track()

    function createWriteStream () {
      var size = 0
        , typeDetectorStream = createTypeDetector()
        , passThrough = new PassThrough()
        , tempWriteStream = temp.createWriteStream()
        , uploadType
        , hash = crypto.createHash('md5')

      passThrough.on('data', function (data) {
        size += data.length
        hash.update(data)
      })

      typeDetectorStream.on('detect', function (type) {
        uploadType = type
        typeDetectorStream.pipe(tempWriteStream)
      })

      tempWriteStream.on('finish', function () {
        var md5 = hash.digest('hex')

        if (size === 0) {
          var error = new Error('Zero size')
          error.name = 'SizeError'
          return passThrough.emit('error', error)
        }

        gfs.files.count({ md5: md5 }, function (err, count) {
          if (err) return passThrough.emit('error', err)
          if (count > 0) {
            passThrough.emit('done', { id: md5, type: uploadType, size: size })
          } else {
            var mongoWriteStream = gfs.createWriteStream({ _id: '', mode: 'w', content_type: uploadType })

            mongoWriteStream.on('close', function () {
              passThrough.emit('done', { id: md5, type: uploadType, size: size })
            })

            fs.createReadStream(tempWriteStream.path)
              .pipe(mongoWriteStream)
          }
        })
      })

      passThrough
        .pipe(typeDetectorStream)

      return passThrough
    }

    function createCacheWriteStream (id) {
      var size = 0
        , typeDetectorStream = createTypeDetector()
        , passThrough = new PassThrough()

      passThrough.on('data', function (data) {
        size += data.length
      })

      typeDetectorStream.on('detect', function (type) {
        var mongoWriteStream = gfs.createWriteStream({ filename: id, mode: 'w', content_type: type })

        mongoWriteStream.on('close', function (file) {
          if (size === 0) {
            var error = new Error('Zero size')
            error.name = 'SizeError'
            return passThrough.emit('error', error)
          }

          passThrough.emit('done', { id: id, size: file.length, type: type })
        })

        typeDetectorStream.pipe(mongoWriteStream)
      })

      passThrough
        .pipe(typeDetectorStream)

      return passThrough
    }

    factory.createDataWriteStream = createWriteStream
    factory.createCacheWriteStream = createCacheWriteStream

    function createReadStream (query, id) {
      var stream = new PassThrough()
      gfs.findOne(query, function (err, file) {
        // todo: Write test
        if (file === null) return stream.emit('notFound', id)
        if (err) return stream.emit('error', err)
        var readStream = gfs.createReadStream({ _id: file._id })
        readStream.pipe(stream)
        stream.emit('meta', { type: file.contentType, size: file.length, lastModified: file.uploadDate })

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

    factory.setup = function setup (cb) {
      cb(null)
    }

    factory.clean = function clean (cb) {
      db.collection('fs.files').remove(function () {
        db.collection('fs.chunks').remove(cb)
      })
    }

    cb(null, factory)
  })
}
