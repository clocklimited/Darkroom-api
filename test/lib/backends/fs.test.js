var assert = require('assert')
  , createBackend = require('../../../lib/backends/fs')
  , temp = require('temp')
  , Stream = require('stream')
  , mkdirp = require('mkdirp')

temp.track()
function getConfig() {
  var data = temp.path()
    , cache = temp.path()
  mkdirp.sync(data)
  mkdirp.sync(cache)
  return { paths: { data: function () { return data }, cache: function () { return cache } } }
}

describe('file backend', function () {

  describe('data stream', function () {

    it('should return a stream', function () {
      createBackend(getConfig(), function (err, factory) {
        assert(factory.createDataStream('1234') instanceof Stream)
      })
    })

    it('should write and read data', function (done) {
      createBackend(getConfig(), function (err, factory) {
        var stream = factory.createDataStream('1234')
        stream.on('error', done)
        stream.on('close', function () {
          var response = []
          factory.getDataStream('1234').on('data', function (data) {
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
        var stream = factory.createDataStream('1234')
        stream.on('error', done)
        stream.on('close', function () {
          var response = []
          factory.getDataStream('1234').on('data', function (data) {
            response.push(data)
          }).on('meta', function (meta) {
            assert.deepEqual(meta, { type: 'text/plain; charset=us-ascii', size: 5 })
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
        stream.on('close', function () {
          var response = []
          factory.getCacheStream('1234').on('data', function (cache) {
            response.push(cache)
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

})
