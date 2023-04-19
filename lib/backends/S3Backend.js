const AWS = require('aws-sdk')
const { PassThrough } = require('stream')
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
    cb()
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

  // createDataWriteStream() {
  //   const passThrough = new PassThrough()
  //   const typeDetectorStream = createTypeDetector()
  //   const hash = crypto.createHash('md5')
  //   let size = 0
  //   let uploadType
  //
  //   passThrough.on('data', (data) => {
  //     console.log(122)
  //     size += data.length
  //     hash.update(data)
  //   })
  //
  //   typeDetectorStream.on('detect', (type) => {
  //     console.log(133)
  //     uploadType = type
  //     if (allowType(this.config, type, passThrough)) {
  //       passThrough.pipe(typeDetectorStream)
  //     }
  //   })
  //
  //   passThrough.on('end', async () => {
  //     console.log(144)
  //     const md5 = hash.digest('hex')
  //
  //     if (size === 0) {
  //       const error = new Error('Zero size')
  //       error.name = 'SizeError'
  //       return passThrough.emit('error', error)
  //     }
  //
  //     try {
  //       console.log(155, md5)
  //       await this._s3
  //         .headObject({ Bucket: this.config.bucket, Key: `data/${md5}` })
  //         .promise()
  //       passThrough.emit('done', { id: md5, type: uploadType, size: size })
  //     } catch (error) {
  //       console.log(166, error)
  //       if (error.code === 'NotFound') {
  //         console.log(188)
  //         const params = {
  //           Bucket: this.config.bucket,
  //           Key: `data/${md5}`,
  //           Metadata: { type: 'data' },
  //           Body: typeDetectorStream
  //         }
  //         console.log(199, params)
  //         this._s3.upload(params, (error) => {
  //           console.log(211, error)
  //           if (error) {
  //             console.log(212, error)
  //             return passThrough.emit('error', error)
  //           }
  //           passThrough.emit('done', { id: md5, type: uploadType, size: size })
  //         })
  //       } else {
  //         passThrough.emit('error', error)
  //       }
  //     }
  //   })
  //
  //   console.log(177)
  //   return passThrough
  // }
  //

  createDataWriteStream() {
    const passThrough = new PassThrough()
    const typeDetectorStream = createTypeDetector()
    const uploadStream = new PassThrough() // Create a new PassThrough stream for uploading
    const hash = crypto.createHash('md5')
    let size = 0
    let uploadType

    passThrough.on('data', (data) => {
      size += data.length
      hash.update(data)
      uploadStream.write(data) // Write data to the uploadStream
    })

    typeDetectorStream.on('detect', (type) => {
      uploadType = type
      if (allowType(this.config, type, passThrough)) {
        passThrough.pipe(typeDetectorStream)
      }
    })

    passThrough.on('end', async () => {
      uploadStream.end() // End the uploadStream

      const md5 = hash.digest('hex')

      if (size === 0) {
        const error = new Error('Zero size')
        error.name = 'SizeError'
        return passThrough.emit('error', error)
      }

      try {
        await this._s3
          .headObject({ Bucket: this.config.bucket, Key: `data/${md5}` })
          .promise()
        passThrough.emit('done', { id: md5, type: uploadType, size: size })
      } catch (error) {
        if (error.code === 'NotFound') {
          const params = {
            Bucket: this.config.bucket,
            Key: `data/${md5}`,
            ContentType: uploadType,
            Metadata: { type: 'data' },
            Body: uploadStream
          }
          console.log(111, params)
          this._s3.upload(params, (error) => {
            if (error) {
              return passThrough.emit('error', error)
            }
            passThrough.emit('done', { id: md5, type: uploadType, size: size })
          })
        } else {
          passThrough.emit('error', error)
        }
      }
    })

    return passThrough
  }

  async updateCacheOriginalId(cacheId, originalId) {
    try {
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
    } catch (error) {
      throw error
    }
  }

  async deleteData(id) {
    try {
      await this._s3
        .deleteObject({ Bucket: this.config.bucket, Key: `data/${id}` })
        .promise()
      await this.clearCache(id)
    } catch (error) {
      throw error
    }
  }

  async clearCache(originalId) {
    try {
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
    } catch (error) {
      throw error
    }
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
      console.log(111, type)
      const params = {
        Bucket: this.config.bucket,
        Key: `cache/${id}`,
        ContentType: type,
        Metadata: { type: 'cache', originalid: originalId },
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
