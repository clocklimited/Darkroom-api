var mongo = require('mongodb')
  , Grid = require('gridfs-stream')
  , temp = require('temp')
  , PassThrough = require('stream').PassThrough
  , typeDetector = require('../type-detector')

module.exports = function (config, cb) {

  mongo.MongoClient.connect(config.databaseUri, function (err, db) {
    if (err) return cb(err)

    var factory = {}
      , gfs = new Grid(db, mongo)

    temp.track()

    function createStream (customId) {
      var stream = gfs.createWriteStream({ _id: customId })
        , size = 0
        , passThrough = new PassThrough()

      passThrough.pipe(stream)

      passThrough.on('data', function (data) {
        size += data.length
      })

      stream.on('close', function (meta) {
        if (size === 0) {
          var error = new Error('Zero size')
          error.name = 'SizeError'
          return passThrough.emit('error', error)
        }

        passThrough.emit('done', meta.md5)
      })

      return passThrough
    }

    factory.createDataStream = createStream.bind(null, null)
    factory.createCacheStream = createStream

    function getStream (query, id) {
      var stream = typeDetector()
      gfs.findOne(query, function (err, file) {
        // todo: Write test
        if (file === null) return stream.emit('notFound', id)
        if (err) return stream.emit('error', err)
        var readStream = gfs.createReadStream({ _id: file._id })
        readStream.pipe(stream)
        stream.on('detect', function (mimeType) {
          stream.emit('meta', { type: mimeType, size: file.length, lastModified: file.uploadDate })
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

    factory.getDataStream = function (id) {
      return getStream({ md5: id }, id)
    }

    factory.getCacheStream = function (id) {
      return getStream({ filename: id }, id)
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
