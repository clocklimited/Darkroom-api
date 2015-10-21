var temp = require('temp')
  , fs = require('fs')
  , join = require('path').join
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf')
  , PassThrough = require('stream').PassThrough
  , createTypeDetector = require('../type-detector')
  , mv = require('mv')
  , crypto = require('crypto')

module.exports = function (config, cb) {
  var factory = {}
  temp.track()

  function createStream (path, customId) {
    var stream = temp.createWriteStream()
      , md5
      , size = 0
      , typeDectectorStream = createTypeDetector()
      , passThrough = new PassThrough()
      , streamType

    passThrough
    .pipe(typeDectectorStream)

    typeDectectorStream.on('detect', function (type) {
      streamType = type
      typeDectectorStream.pipe(stream)
    })

    if (customId) {
      passThrough.on('data', function (data) {
        size += data.length
      })
    } else {
      md5 = crypto.createHash('md5')
      passThrough.on('data', function (data) {
        size += data.length
        md5.update(data)
      })
    }

    stream.on('finish', function () {

      if (size === 0) {
        var error = new Error('Zero size')
        error.name = 'SizeError'
        return passThrough.emit('error', error)
      }

      var id = customId || md5.digest('hex')
        , filePath = join(path, id.substring(0,3), id)

      mv(stream.path, filePath, { mkdirp: true }, function (err) {
        if (err) return passThrough.emit('error', err)
        // I can't work out why I ca't just used finish. But I get double dones.
        passThrough.emit('done', { id: id, size: size, type: streamType })
      })
    })

    return passThrough
  }

  factory.createDataWriteStream = createStream.bind(null, config.paths.data(), null)
  factory.createCacheWriteStream = createStream.bind(null, config.paths.cache())

  function getStream (path, id) {
    var typeDetectorStream = createTypeDetector()
    , filePath = join(path, id.substring(0,3), id)
    , fileStream = fs.createReadStream(filePath)

    typeDetectorStream.on('detect', function (mimeType) {
      fs.stat(filePath, function (err, stat) {
        if (err) return typeDetectorStream.emit('error', err)
        typeDetectorStream.emit('meta', { type: mimeType, size: stat.size, lastModified: stat.mtime })
      })
    })

    fileStream.on('error', function (err) {
      if (err.code === 'ENOENT') {
        typeDetectorStream.emit('notFound', id)
      } else {
        typeDetectorStream.emit('error', err)
      }
    })

    return fileStream.pipe(typeDetectorStream)
  }

  factory.createDataReadStream = getStream.bind(null, config.paths.data())
  factory.createCacheReadStream = getStream.bind(null, config.paths.cache())

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
