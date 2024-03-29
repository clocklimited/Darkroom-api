const assert = require('assert')
const Stream = require('stream')
const mcLogger = require('mc-logger')

module.exports = function (backendConfig) {
  let backend
  let findCache
  let findData
  function setup(done) {
    backend = new backendConfig.backend({
      config: backendConfig.config,
      logger: mcLogger
    })
    findCache = backendConfig.cacheFinder.bind(null, backend)
    findData = backendConfig.dataFinder.bind(null, backend)
    backend.setup(done)
  }
  function clean(done) {
    backend.clean(done)
  }

  beforeEach(setup)
  afterEach(clean)

  describe('data stream', function () {
    it('should return a stream', function () {
      assert(backend.createDataWriteStream() instanceof Stream)
    })

    it('should write with `id` on finish and read data', function (done) {
      const stream = backend.createDataWriteStream()
      stream.on('error', done)
      stream.on('done', function (id) {
        assert(id !== undefined, 'should return an `id`' + id)
        assert.strictEqual(id.size, 5)
        assert.strictEqual(id.type, 'text/plain; charset=us-ascii')
        const response = []
        backend
          .createDataReadStream(id.id)
          .on('data', function (data) {
            response.push(data)
          })
          .on('end', function () {
            assert.strictEqual(Buffer.concat(response).toString(), 'hello')
            done()
          })
      })
      stream.write('hello')
      stream.end()
    })

    it('should handle 200MB', function (done) {
      this.timeout(10000)
      const stream = backend.createDataWriteStream()
      stream.on('error', done)
      stream.on('done', function (id) {
        assert.deepStrictEqual(id, {
          id: '6b54f2903bc311a75e6ed47337877c3b',
          size: 20000000,
          type: 'application/octet-stream; charset=binary'
        })
        done()
      })
      const data = []
      let i = 0
      let buf
      for (i = 1; i < 100001; i += 1) data.push(i)
      buf = new Buffer.from(data)
      for (i = 0; i < 200; i += 1) stream.write(buf)
      stream.end()
    })

    it('should return same meta if the same file is uploaded twice', function (done) {
      const stream = backend.createDataWriteStream()
      stream.on('error', done)
      stream.on('done', function (id) {
        const secondStream = backend.createDataWriteStream()
        secondStream.on('done', function (secondId) {
          assert.deepStrictEqual(id, secondId)
          done()
        })
        secondStream.write('hello')
        secondStream.end()
      })
      stream.write('hello')
      stream.end()
    })

    it('should emit meta on read data', function (done) {
      const stream = backend.createDataWriteStream()
      let metaCalled = false
      stream.on('error', done)
      stream.on('done', function (id) {
        const response = []
        backend
          .createDataReadStream(id.id)
          .on('data', function (data) {
            response.push(data)
          })
          .on('meta', function (meta) {
            assert.strictEqual(meta.size, 5)
            assert.strictEqual(meta.type, 'text/plain; charset=us-ascii')
            assert(
              meta.lastModified instanceof Date,
              'meta.lastModified should be a date' + meta.lastModified
            )
            metaCalled = true
          })
          .on('end', () => {
            assert.strictEqual(metaCalled, true, 'Did not receive meta')
            done()
          })
      })
      stream.write('hello')
      stream.end()
    })
  })

  describe('cache stream', function () {
    it('should return a stream', function () {
      assert(backend.createCacheWriteStream('1234') instanceof Stream)
    })

    it('should write and read cache', function (done) {
      const stream = backend.createCacheWriteStream('1234')
      stream.on('error', done)
      stream.on('done', function () {
        const response = []
        backend
          .createCacheReadStream('1234')
          .on('data', function (cacheData) {
            response.push(cacheData)
          })
          .on('end', function () {
            assert.strictEqual(Buffer.concat(response).toString(), 'hello')
            done()
          })
      })
      stream.write('hello')
      stream.end()
    })

    it('should write metadata', function (done) {
      const originalId = 'original'
      const stream = backend.createCacheWriteStream('1234', originalId)
      stream.on('done', async () => {
        const metadata = await findCache(originalId)

        assert.strictEqual(metadata.originalId, originalId)
        done()
      })
      stream.write('data')
      stream.end()
    })

    it('should emit meta on read data', function (done) {
      const stream = backend.createCacheWriteStream('1234')
      let metaCalled = false
      stream.on('error', done)
      stream.on('done', function (id) {
        const response = []
        backend
          .createCacheReadStream(id.id)
          .on('data', function (data) {
            response.push(data)
          })
          .on('meta', function (meta) {
            assert.strictEqual(meta.type, 'text/plain; charset=us-ascii')
            assert.strictEqual(meta.size, 5)
            assert(
              meta.lastModified instanceof Date,
              'meta.lastModified should be a date' + meta.lastModified
            )
            metaCalled = true
          })
          .on('end', () => {
            assert.strictEqual(metaCalled, true, 'Did not receive meta')
            done()
          })
      })
      stream.write('hello')
      stream.end()
    })
  })

  describe('cache', async () => {
    it('should be cleared by id', function (done) {
      this.timeout(10000)

      const originalId = 'original'
      const otherOriginalId = 'other'
      const stream1 = backend.createCacheWriteStream('1234', originalId)

      stream1.on('done', () => {
        const stream2 = backend.createCacheWriteStream('4321', otherOriginalId)

        stream2.on('done', async () => {
          assert(await findCache(originalId))
          assert(await findCache(otherOriginalId))

          await backend.clearCache(originalId)

          assert.strictEqual(await findCache(originalId), null)
          assert(await findCache(otherOriginalId))

          done()
        })

        stream2.write('data')
        stream2.end()
      })

      stream1.write('data')
      stream1.end()
    })
  })

  describe('data', async () => {
    it('should delete data', function (done) {
      backend.clean()
      this.timeout(10000)

      const dataStream = backend.createDataWriteStream()

      dataStream.on('done', async ({ id }) => {
        assert(await findData(id))

        await backend.deleteData(id)

        assert.strictEqual(await findData(id), null)

        done()
      })

      dataStream.write('data')
      dataStream.end()
    })

    it('should clear cache when deleted', function (done) {
      this.timeout(10000)

      const dataStream = backend.createDataWriteStream()

      dataStream.on('done', ({ id }) => {
        const cacheStream = backend.createCacheWriteStream('1234', id)

        cacheStream.on('done', async () => {
          assert(await findData(id))
          assert(await findCache(id))

          await backend.deleteData(id)

          assert.strictEqual(await findData(id), null)
          assert.strictEqual(await findData(id), null)

          done()
        })

        cacheStream.write('cachedata')
        cacheStream.end()
      })

      dataStream.write('data')
      dataStream.end()
    })
  })
}
