var temp = require('temp')
  , fs = require('fs')
  , join = require('path').join
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf')
  , restify = require('restify')
  , createFileAdaptor = require('../file-upload-adapter')
  , nullLogger = require('mc-logger')
  , createFileUpload = require('fileupload').createFileUpload
  , PassThrough = require('stream').PassThrough
  , typeDetector = require('../type-detector')
  , crypto = require('crypto')

module.exports = function (config, cb) {
  var factory = {}
    , fileAdaptor = createFileAdaptor(config.paths.data(), config.log ? console : nullLogger)

  temp.track()

  function createStream (path, id) {
    var directoryPath = join(path, id.substring(0,3))
      , filePath = join(directoryPath, id)
      , stream = new PassThrough()

    stream.pause()
    mkdirp(directoryPath, function (err) {
      if (err) return stream.emit('error', err)
      var writeSteam = fs.createWriteStream(filePath)
      writeSteam.on('close', stream.emit.bind(stream, 'close'))
      stream.pipe(writeSteam)
      stream.resume()
    })
    return stream
  }

  factory.createDataStream = createStream.bind(null, config.paths.data())
  factory.createCacheStream = createStream.bind(null, config.paths.cache())

  function getStream (path, id) {
    var stream = typeDetector()
    , filePath = join(path, id.substring(0,3), id)
    , fileStream = fs.createReadStream(filePath)

    stream.on('detect', function (mimeType) {
      fs.stat(filePath, function (err, stat) {
        if (err) return stream.emit('error', err)
        stream.emit('meta', { type: mimeType, size: stat.size, lastModified: stat.mtime })
      })
    })

    fileStream.on('error', function (err) {
      if (err.code === 'ENOENT') {
        stream.emit('notFound', id)
      } else {
        stream.emit('error', err)
      }
    })

    return fileStream.pipe(stream)
  }

  factory.getDataStream = getStream.bind(null, config.paths.data())
  factory.getCacheStream = getStream.bind(null, config.paths.cache())

  factory.streamUploadMiddleware = function(req, res, next) {

    var stream = temp.createWriteStream()
      , md5 = crypto.createHash('md5')
      , size = 0
      , passThrough = new PassThrough()

    passThrough.pipe(stream)

    passThrough.on('data', function (data) {
      size += data.length
      md5.update(data)
    })

    stream.on('finish', function () {
      if (size === 0) return next(new restify.BadDigestError('Zero sized upload'))

      var id = md5.digest('hex')
        , writeStream = factory.createDataStream(id)

      fs.createReadStream(stream.path).pipe(writeStream)
      writeStream.on('finish', function () {
        temp.cleanup()
        req.body = { file: { basename: id } }
        next()
      })
    })

     req.on('error', next)
     req.pipe(passThrough)
   }

  factory.uploadMiddleware = createFileUpload({ adapter: fileAdaptor }).middleware

  factory.setup = function setup (cb) {
    try {
      mkdirp.sync(config.paths.data())
      mkdirp.sync(config.paths.cache())
    } catch (e) {}

    cb(null)
  }

  factory.clean = function clean (cb) {
    rimraf.sync(config.paths.data())
    rimraf.sync(config.paths.cache())
    cb(null)
  }

  cb(null, factory)
}
