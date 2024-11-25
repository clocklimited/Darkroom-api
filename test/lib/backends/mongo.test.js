const MongoBackend = require('../../../lib/backends/MongoBackend')
const tests = require('./backend-tests')
const backends = require('./index')
const assert = require('assert')

function getConfig() {
  return {
    databaseUri:
      process.env.MONGO_URL || 'mongodb://localhost:27017/darkroom-test'
  }
}

describe('Mongo Backend using: ' + getConfig().databaseUri, function () {
  tests(backends().find(({ name }) => name === 'Mongo Grid FS'))

  let backend
  function setup(done) {
    backend = new MongoBackend({ config: getConfig() })
    backend.setup(done)
  }
  function clean(done) {
    backend.clean(done)
  }

  beforeEach(setup)
  afterEach(clean)

  describe('meta data', function () {
    it('should mark data with a `data` type', function (done) {
      const writeStream = backend.createDataWriteStream()
      writeStream.on('done', function (file) {
        backend._db
          .collection('fs.files')
          .findOne({ 'metadata.md5': file.id })
          .then((data) => {
            assert.strictEqual(data.metadata.type, 'data')
            done()
          })
          .catch(done)
      })
      writeStream.write('hello')
      writeStream.end()
    })

    it('should mark cache with a `cache` type', function (done) {
      const writeStream = backend.createCacheWriteStream('meta-test')
      writeStream.on('done', function (file) {
        backend._db
          .collection('fs.files')
          .findOne({ filename: file.id })
          .then((data) => {
            assert.strictEqual(data.metadata.type, 'cache')
            done()
          })
          .catch(done)
      })
      writeStream.write('hello')
      writeStream.end()
    })
  })
})
