const fs = require('fs')
const { join } = require('path')
const { PassThrough } = require('stream')
const crypto = require('crypto')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const mv = require('mv')
const tmp = require('tmp')
const Backend = require('./Backend')
const allowType = require('../type-whitelist')
const createTypeDetector = require('../type-detector')

class FsBackend extends Backend {
  setup(cb) {
    const { paths } = this.config
    try {
      mkdirp.sync(paths.data())
      mkdirp.sync(paths.cache())
    } catch (e) {
      //
    }

    cb(null)
  }

  clean(cb) {
    const { paths } = this.config
    rimraf.sync(paths.data())
    rimraf.sync(paths.cache())
    cb(null)
  }

  isHealthy(cb) {
    cb(null, true)
  }

  _getReadStream(path, id) {
    const typeDetectorStream = createTypeDetector()
    const filePath = join(path, id.substring(0, 3), id)
    const fileStream = fs.createReadStream(filePath)
    const passThrough = new PassThrough()

    let stream = fileStream.pipe(typeDetectorStream)
    typeDetectorStream.on('detect', (mimeType) => {
      fs.stat(filePath, (error, stat) => {
        if (error) return passThrough.emit('error', error)
        passThrough.emit('meta', {
          type: mimeType,
          size: stat.size,
          lastModified: stat.mtime
        })
      })
      stream.pipe(passThrough)
    })

    fileStream.on('error', (error) => {
      if (error.code === 'ENOENT') {
        passThrough.emit('notFound', id)
      } else {
        passThrough.emit('error', error)
      }
    })

    return passThrough
  }

  _getWriteStream(path, customId) {
    const tmpFile = tmp.fileSync({ detachDescriptor: true })
    const tmpStream = fs.createWriteStream(tmpFile.name, { fd: tmpFile.fd })
    const typeDetectorStream = createTypeDetector()
    const passThrough = new PassThrough()
    let md5
    let size = 0
    let streamType

    passThrough.pipe(typeDetectorStream)

    typeDetectorStream.on('detect', (type) => {
      streamType = type
      if (allowType(this.config, type, passThrough)) {
        typeDetectorStream.pipe(tmpStream)
      }
    })

    if (customId) {
      passThrough.on('data', (data) => {
        size += data.length
      })
    } else {
      md5 = crypto.createHash('md5')
      passThrough.on('data', (data) => {
        size += data.length
        md5.update(data)
      })
    }

    tmpStream.on('finish', () => {
      if (size === 0) {
        tmpFile.removeCallback()
        const error = new Error('Zero size')
        error.name = 'SizeError'
        return passThrough.emit('error', error)
      }

      const id = customId || md5.digest('hex')
      const filePath = join(path, id.substring(0, 3), id)

      mv(tmpFile.name, filePath, { mkdirp: true }, (error) => {
        tmpFile.removeCallback()
        if (error) return passThrough.emit('error', error)
        // I can't work out why I can't just used finish. But I get double dones.
        passThrough.emit('done', { id, size, type: streamType })
      })
    })

    return passThrough
  }

  createDataReadStream(id) {
    return this._getReadStream(this.config.paths.data(), id)
  }

  createCacheReadStream(id) {
    return this._getReadStream(this.config.paths.cache(), id)
  }

  createDataWriteStream() {
    return this._getWriteStream(this.config.paths.data())
  }

  createCacheWriteStream(id) {
    return this._getWriteStream(this.config.paths.cache(), id)
  }
}

module.exports = FsBackend
