const temp = require('temp')
const fs = require('fs')
const join = require('path').join
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const { PassThrough } = require('stream')
const createTypeDetector = require('../type-detector')
const mv = require('mv')
const crypto = require('crypto')
const allowType = require('../type-whitelist')

module.exports = function (config, cb) {
  const factory = {}
  temp.track()

  function createStream(path, customId) {
    const stream = temp.createWriteStream()
    const typeDetectorStream = createTypeDetector()
    const passThrough = new PassThrough()
    let md5
    let size = 0
    let streamType

    passThrough.pipe(typeDetectorStream)

    typeDetectorStream.on('detect', function (type) {
      streamType = type
      if (allowType(config, type, passThrough)) typeDetectorStream.pipe(stream)
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
        const error = new Error('Zero size')
        error.name = 'SizeError'
        return passThrough.emit('error', error)
      }

      const id = customId || md5.digest('hex')
      const filePath = join(path, id.substring(0, 3), id)

      mv(stream.path, filePath, { mkdirp: true }, function (err) {
        if (err) return passThrough.emit('error', err)
        // I can't work out why I can't just used finish. But I get double dones.
        passThrough.emit('done', { id: id, size: size, type: streamType })
      })
    })

    return passThrough
  }

  factory.createDataWriteStream = createStream.bind(
    null,
    config.paths.data(),
    null
  )
  factory.createCacheWriteStream = createStream.bind(null, config.paths.cache())

  function getStream(path, id) {
    const typeDetectorStream = createTypeDetector()
    const filePath = join(path, id.substring(0, 3), id)
    const fileStream = fs.createReadStream(filePath)

    typeDetectorStream.on('detect', function (mimeType) {
      fs.stat(filePath, function (err, stat) {
        if (err) return typeDetectorStream.emit('error', err)
        typeDetectorStream.emit('meta', {
          type: mimeType,
          size: stat.size,
          lastModified: stat.mtime
        })
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

  factory.setup = function setup(cb) {
    try {
      mkdirp.sync(config.paths.data())
      mkdirp.sync(config.paths.cache())
    } catch (e) {
      //
    }

    cb(null)
  }

  factory.clean = function clean(cb) {
    rimraf.sync(config.paths.data())
    rimraf.sync(config.paths.cache())
    cb(null)
  }

  factory.isHealthy = function isHealthy(cb) {
    cb(null, true)
  }

  cb(null, factory)
}
