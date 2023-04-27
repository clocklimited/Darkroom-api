const AWS = require('aws-sdk')
const { PassThrough } = require('stream')
const tmp = require('tmp')
const fs = require('fs')
const crypto = require('crypto')
const createTypeDetector = require('../type-detector')
const allowType = require('../type-whitelist')
const Backend = require('./Backend')

class S3Backend extends Backend {
  setup(cb) {
    AWS.config.update({
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      region: this.config.region
    })

    this._s3 = new AWS.S3()

    this.isHealthy((error, isHealthy) => {
      if (!isHealthy && error && error.code === 'NotFound') {
        return this._s3.createBucket(
          {
            Bucket: this.config.bucket,
            CreateBucketConfiguration: {
              LocationConstraint: this.config.region
            }
          },
          (error, data) => {
            if (error) {
              this.logger.error(error, 'Could not create bucket')
              return cb(error)
            }

            this.logger.info('Created bucket', data)
            cb()
          }
        )
      }
      return cb(error)
    })
  }

  isHealthy(cb) {
    this._s3.headBucket({ Bucket: this.config.bucket }, (error) => {
      if (error) {
        return cb(error, false)
      }
      cb(null, true)
    })
  }

  _getReadStream(key, id) {
    const stream = new PassThrough()
    this._s3.headObject(
      { Bucket: this.config.bucket, Key: key },
      (error, metadata) => {
        console.log(metadata)
        if (error) {
          if (error.code === 'NotFound') {
            return stream.emit('notFound', id)
          } else {
            return stream.emit('error', error)
          }
        }

        const readStream = this._s3
          .getObject({ Bucket: this.config.bucket, Key: key })
          .createReadStream()
        readStream.pipe(stream)

        stream.emit('meta', {
          type: metadata.ContentType,
          size: metadata.ContentLength,
          lastModified: metadata.LastModified,
          originalId: metadata.Metadata.originalId
        })

        readStream.on('error', (error) => {
          if (error.code === 'NoSuchKey') {
            stream.emit('notFound', id)
          } else {
            stream.emit('error', error)
          }
        })
      }
    )

    return stream
  }

  createDataReadStream(id) {
    return this._getReadStream(`data/${id}`, id)
  }

  createCacheReadStream(id) {
    return this._getReadStream(`cache/${id}`, id)
  }

  createDataWriteStream() {
    const tmpFile = tmp.fileSync({ detachDescriptor: true })
    const tempWriteStream = fs.createWriteStream(tmpFile.name, {
      fd: tmpFile.fd
    })
    const passThrough = new PassThrough()
    const typeDetectorStream = createTypeDetector()
    const hash = crypto.createHash('md5')
    let size = 0
    let uploadType

    passThrough.on('data', (data) => {
      size += data.length
      hash.update(data)
    })

    typeDetectorStream.on('detect', (type) => {
      console.log('typeDetectorStream detect', { type })
      uploadType = type
      if (allowType(this.config, type, passThrough)) {
        console.log('typeDetectorStream allowed')
        typeDetectorStream.pipe(tempWriteStream)
      }
    })

    tempWriteStream.on('finish', async () => {
      console.log('tempWriteStream end')

      const digest = hash.digest()
      const md5 = digest.toString('hex')

      if (size === 0) {
        const error = new Error('Zero size')
        error.name = 'SizeError'
        tmpFile.removeCallback()
        return passThrough.emit('error', error)
      }

      try {
        await this._s3
          .headObject({ Bucket: this.config.bucket, Key: `data/${md5}` })
          .promise()
        tmpFile.removeCallback()
        passThrough.emit('done', { id: md5, type: uploadType, size })
      } catch (error) {
        if (error.code === 'NotFound') {
          const params = {
            Bucket: this.config.bucket,
            Key: `data/${md5}`,
            ContentType: uploadType,
            ContentMD5: digest.toString('base64'),
            ContentLength: size,
            Metadata: { type: 'data' },
            Body: fs.createReadStream(tempWriteStream.path)
          }
          console.log(111, { params })
          console.log({ id: md5, type: uploadType, size })
          this._s3.upload(params, (error, data) => {
            if (error) {
              tmpFile.removeCallback()
              return passThrough.emit('error', error)
            }
            console.log({ id: md5, type: uploadType, size, data })
            tmpFile.removeCallback()
            passThrough.emit('done', { id: md5, type: uploadType, size })
          })
        } else {
          tmpFile.removeCallback()
          passThrough.emit('error', error)
        }
      }
    })

    passThrough.pipe(typeDetectorStream)

    return passThrough
  }

  async updateCacheOriginalId(cacheId, originalId) {
    const headResult = await this._s3
      .headObject({ Bucket: this.config.bucket, Key: `cache/${cacheId}` })
      .promise()
    const copyParams = {
      Bucket: this.config.bucket,
      CopySource: `${this.config.bucket}/cache/${cacheId}`,
      Key: `cache/${cacheId}`,
      ContentType: headResult.ContentType,
      MetadataDirective: 'REPLACE',
      Metadata: { ...headResult.Metadata, originalId: originalId }
    }
    await this._s3.copyObject(copyParams).promise()
  }

  async deleteData(id) {
    await this._s3
      .deleteObject({ Bucket: this.config.bucket, Key: `data/${id}` })
      .promise()
    await this.clearCache(id)
  }

  async clearCache(originalId) {
    const listParams = {
      Bucket: this.config.bucket,
      Prefix: `cache/`,
      MaxKeys: 1000
    }
    const listResult = await this._s3.listObjectsV2(listParams).promise()
    const deletePromises = listResult.Contents.filter((item) => {
      return item.Metadata && item.Metadata.originalId === originalId
    }).map((item) => {
      return this._s3
        .deleteObject({ Bucket: this.config.bucket, Key: item.Key })
        .promise()
    })

    await Promise.all(deletePromises)
  }

  createCacheWriteStream(id, originalId) {
    const passThrough = new PassThrough()
    const typeDetectorStream = createTypeDetector()
    const uploadStream = new PassThrough() // Create a new PassThrough stream for uploading
    let size = 0

    passThrough.on('data', (data) => {
      size += data.length
      uploadStream.write(data) // Write data to the uploadStream
    })

    typeDetectorStream.on('detect', (type) => {
      console.log(111, { type })
      const params = {
        Bucket: this.config.bucket,
        Key: `cache/${id}`,
        ContentType: type,
        Metadata: { type: 'cache', originalId: originalId },
        Body: uploadStream
      }

      this._s3.upload(params, (error) => {
        if (error) {
          return passThrough.emit('error', error)
        }
        if (size === 0) {
          const zeroSizeError = new Error('Zero size')
          zeroSizeError.name = 'SizeError'
          return passThrough.emit('error', zeroSizeError)
        }
        passThrough.emit('done', {
          id: id,
          size: size,
          type: type
        })
      })
    })

    passThrough.on('end', () => {
      uploadStream.end() // End the uploadStream
    })

    passThrough.pipe(typeDetectorStream)

    return passThrough
  }
}

module.exports = S3Backend
