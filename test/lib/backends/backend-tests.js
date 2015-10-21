var assert = require('assert')
  , Stream = require('stream')

module.exports = function (createBackend, getConfig) {

  function clean(done) {
    createBackend(getConfig(), function (err, factory) {
      factory.clean(function () {
        factory.setup(done)
      })
    })
  }

  before(clean)
  after(clean)

  describe('data stream', function () {

    it('should return a stream', function () {
      createBackend(getConfig(), function (err, factory) {
        assert(factory.createDataWriteStream('1234') instanceof Stream)
      })
    })

    it('should write with `id` on finish and read data', function (done) {
      createBackend(getConfig(), function (err, factory) {
        var stream = factory.createDataWriteStream()
        stream.on('error', done)
        stream.on('done', function (id) {
          assert(id !== undefined, 'should return an `id`' + id)
          assert.equal(id.size, 5)
          assert.equal(id.type, 'text/plain; charset=us-ascii')
          var response = []
          factory.createDataReadStream(id.id).on('data', function (data) {
            response.push(data)
          }).on('end', function () {
            assert.equal(Buffer.concat(response).toString(), 'hello')
            done()
          })
        })
        stream.write('hello')
        stream.end()
      })
    })

    it('should handle 200MB', function (done) {
      createBackend(getConfig(), function (err, factory) {
        var stream = factory.createDataWriteStream()
        stream.on('error', done)
        stream.on('done', function (id) {
          assert.deepEqual(id,
            { id: 'e60a4106eed37bb9f34d3932c6d3eb1f'
            , size: 20000000
            , type: 'application/octet-stream; charset=binary' })
          done()
        })
        var data = []
          , i = 0
          , buf
        for (i = 0; i < 100000; i += 1) data.push(i)
        buf = new Buffer(data)
        for (i = 0; i < 200; i += 1) stream.write(buf)
        stream.end()
      })
    })

    it('should return same meta if the same file is uploaded twice', function (done) {
      createBackend(getConfig(), function (err, factory) {
        var stream = factory.createDataWriteStream()
        stream.on('error', done)
        stream.on('done', function (id) {
          var secondStream = factory.createDataWriteStream()
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
    })

    it('should emit meta on read data', function (done) {
      createBackend(getConfig(), function (err, factory) {
        var stream = factory.createDataWriteStream()
        stream.on('error', done)
        stream.on('done', function (id) {
          var response = []
          factory.createDataReadStream(id.id).on('data', function (data) {
            response.push(data)
          }).on('meta', function (meta) {
            assert.equal(meta.size, 5)
            assert.equal(meta.type, 'text/plain; charset=us-ascii')
            assert(meta.lastModified instanceof Date, 'meta.lastModified should be a date' + meta.lastModified)
            done()
          })
        })
        stream.write('hello')
        stream.end()
      })
    })
  })

  describe('cache stream', function () {

    it('should return a stream', function () {
      createBackend(getConfig(), function (err, factory) {
        assert(factory.createCacheWriteStream('1234') instanceof Stream)
      })
    })

    it('should write and read cache', function (done) {
      createBackend(getConfig(), function (err, factory) {
        var stream = factory.createCacheWriteStream('1234')
        stream.on('error', done)
        stream.on('done', function () {
          var response = []
          factory.createCacheReadStream('1234').on('data', function (cacheData) {
            response.push(cacheData)
          }).on('end', function () {

            assert.equal(Buffer.concat(response).toString(), 'hello')
            done()
          })
        })
        stream.write('hello')
        stream.end()
      })
    })

    it('should emit meta on read data', function (done) {
      createBackend(getConfig(), function (err, factory) {
        var stream = factory.createCacheWriteStream('1234')
        stream.on('error', done)
        stream.on('done', function (id) {
          var response = []
          factory.createCacheReadStream(id.id).on('data', function (data) {
            response.push(data)
          }).on('meta', function (meta) {
            assert.equal(meta.type, 'text/plain; charset=us-ascii')
            assert.equal(meta.size, 5)
            assert(meta.lastModified instanceof Date, 'meta.lastModified should be a date' + meta.lastModified)
            done()
          })
        })
        stream.write('hello')
        stream.end()
      })
    })
  })
}
