var mongo = require('mongodb')
  , Grid = require('gridfs-stream')
  , temp = require('temp')
  , PassThrough = require('stream').PassThrough
  , createTypeDetector = require('../type-detector')

module.exports = function (config, cb) {

  mongo.MongoClient.connect(config.databaseUri, function (err, db) {
    if (err) return cb(err)

    var factory = {}
      , gfs = new Grid(db, mongo)

    temp.track()

    function createWriteStream (customId) {
      var size = 0
        , typeDetectorStream = createTypeDetector()
        , passThrough = new PassThrough()

      passThrough
        .pipe(typeDetectorStream)

      typeDetectorStream.on('detect', function (meta) {
        var writeStream = gfs.createWriteStream({ _id: customId, mode: 'w', content_type: meta })
        typeDetectorStream.pipe(writeStream)

        writeStream.on('close', function (meta) {
          if (size === 0) {
            var error = new Error('Zero size')
            error.name = 'SizeError'
            return passThrough.emit('error', error)
          }

          passThrough.emit('done', meta.md5)
        })
      })

      passThrough.on('data', function (data) {
        size += data.length
      })

      return passThrough
    }

    factory.createDataWriteStream = createWriteStream.bind(null, null)
    factory.createCacheWriteStream = createWriteStream

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
