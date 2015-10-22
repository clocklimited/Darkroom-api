var createBackend = require('../../../lib/backends/mongo')
  , tests = require('./backend-tests')
  , assert = require('assert')

function getConfig() {
  return { databaseUri: 'mongodb://localhost:27017/darkroom-test' }
}

describe('Mongo Backend', function () {
  tests(createBackend, getConfig)

  describe('meta data', function () {
    it('should mark data with a `data` type', function (done) {
      createBackend(getConfig(), function (err, factory) {
        var writeStream = factory.createDataWriteStream()
        writeStream.on('done', function (file) {
          factory._db.collection('fs.files').findOne({ md5: file.id }, function (err, data) {
            assert.equal(data.metadata.type, 'data')
            done()
          })
        })
        writeStream.write('hello')
        writeStream.end()
      })
    })

    it('should mark cache with a `cache` type', function (done) {
      createBackend(getConfig(), function (err, factory) {
        var writeStream = factory.createCacheWriteStream('meta-test')
        writeStream.on('done', function (file) {
          factory._db.collection('fs.files').findOne({ filename: file.id }, function (err, data) {
            assert.equal(data.metadata.type, 'cache')
            done()
          })
        })
        writeStream.write('hello')
        writeStream.end()
      })
    })
  })
})
