var assert = require('assert'),
  Stream = require('stream')

module.exports = function (Backend, getConfig) {
  let backend
  function setup(done) {
    backend = new Backend(getConfig())
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
        assert.equal(id.size, 5)
        assert.equal(id.type, 'text/plain; charset=us-ascii')
        const response = []
        backend
          .createDataReadStream(id.id)
          .on('data', function (data) {
            response.push(data)
          })
          .on('end', function () {
            assert.equal(Buffer.concat(response).toString(), 'hello')
            done()
          })
      })
      stream.write('hello')
      stream.end()
    })

    it('should handle 200MB', function (done) {
      this.timeout(6000)
      const stream = backend.createDataWriteStream()
      stream.on('error', done)
      stream.on('done', function (id) {
        assert.deepEqual(id, {
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
          assert.deepEqual(id, secondId)
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
      stream.on('error', done)
      stream.on('done', function (id) {
        const response = []
        backend
          .createDataReadStream(id.id)
          .on('data', function (data) {
            response.push(data)
          })
          .on('meta', function (meta) {
            assert.equal(meta.size, 5)
            assert.equal(meta.type, 'text/plain; charset=us-ascii')
            assert(
              meta.lastModified instanceof Date,
              'meta.lastModified should be a date' + meta.lastModified
            )
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
            assert.equal(Buffer.concat(response).toString(), 'hello')
            done()
          })
      })
      stream.write('hello')
      stream.end()
    })

    it('should emit meta on read data', function (done) {
      const stream = backend.createCacheWriteStream('1234')
      stream.on('error', done)
      stream.on('done', function (id) {
        const response = []
        backend
          .createCacheReadStream(id.id)
          .on('data', function (data) {
            response.push(data)
          })
          .on('meta', function (meta) {
            assert.equal(meta.type, 'text/plain; charset=us-ascii')
            assert.equal(meta.size, 5)
            assert(
              meta.lastModified instanceof Date,
              'meta.lastModified should be a date' + meta.lastModified
            )
            done()
          })
      })
      stream.write('hello')
      stream.end()
    })
  })
}
