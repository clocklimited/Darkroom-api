var temp = require('temp')
  , fs = require('fs')
  , join = require('path').join
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf')
  , createFileAdaptor = require('../file-upload-adapter')
  , nullLogger = require('mc-logger')
  , createFileUpload = require('fileupload').createFileUpload
  , PassThrough = require('stream').PassThrough
  , typeDetector = require('../type-detector')

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
