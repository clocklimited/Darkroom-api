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
        assert(factory.createDataStream('1234') instanceof Stream)
      })
    })

    it('should write with `id` on finish and read data', function (done) {
      createBackend(getConfig(), function (err, factory) {
        var stream = factory.createDataStream()
        stream.on('error', done)
        stream.on('done', function (id) {
          assert(id !== undefined, 'should return an `id`')
          var response = []
          factory.getDataStream(id).on('data', function (data) {
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

    it('should emit meta on read data', function (done) {
      createBackend(getConfig(), function (err, factory) {
        var stream = factory.createDataStream()
        stream.on('error', done)
        stream.on('done', function (id) {
          var response = []
          factory.getDataStream(id).on('data', function (data) {
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

  describe('cache stream', function () {

    it('should return a stream', function () {
      createBackend(getConfig(), function (err, factory) {
        assert(factory.createCacheStream('1234') instanceof Stream)
      })
    })

    it('should write and read cache', function (done) {
      createBackend(getConfig(), function (err, factory) {
        var stream = factory.createCacheStream('1234')
        stream.on('error', done)
        stream.on('done', function () {
          var response = []
          factory.getCacheStream('1234').on('data', function (cacheData) {
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
  })
}
