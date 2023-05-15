const mockServiceLocator = require('./mock-service-locator')
const createDarkroom = require('../server')
const createBackendFactory = require('../lib/backend-factory-creator')
const request = require('supertest')
const hashHelper = require('./hash-helper')
const backends = require('./lib/backends')
const assert = require('assert')

const closeEnough = (actual, expected) => {
  const actualDate = new Date(actual).getTime()
  const expectedDate = new Date(expected).getTime()
  const toleranceMs = 5000

  if (actual === expected) {
    return true
  }
  if (
    actualDate - toleranceMs < expectedDate &&
    expectedDate < actualDate + toleranceMs
  ) {
    return true
  }
  return false
}
backends().forEach(function (backend) {
  const config = backend.config

  describe('Original ' + backend.name + ' backend', function () {
    let imgSrcId, darkroom, factory, dateUploaded

    before(function (done) {
      const sl = mockServiceLocator(config)
      createBackendFactory(sl, function (err, backendFactory) {
        factory = backendFactory
        darkroom = createDarkroom(sl, factory)
        done()
      })
    })

    before((done) => factory.setup(done))
    after((done) => factory.clean(done))

    before(function (done) {
      request(darkroom)
        .post('/')
        .set('x-darkroom-key', 'key')
        .set('Accept', 'application/json')
        .attach('file', 'test/fixtures/jpeg.jpeg')
        .end(function (err, res) {
          imgSrcId = res.body.id
          dateUploaded = res.headers.date
          done(err)
        })
    })

    it('should return an image if the image exists (with the correct cache headers)', function (done) {
      var uri = '/original/' + imgSrcId,
        url = uri + ':' + hashHelper(uri)
      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          assert.strictEqual(res.headers['cache-control'], 'max-age=10')
          assert(closeEnough(res.headers['last-modified'], dateUploaded))
          done()
        })
    })

    it('should return 404 if an image doesnt exist (with the correct cache headers)', function (done) {
      var uri = '/original/1cfdd3bf942749472093f3b0ed6d4f88',
        url = uri + ':' + hashHelper(uri)
      request(darkroom)
        .get(url)
        .expect(404)
        .end(function (err, res) {
          if (err) return done(err)
          assert.strictEqual(res.headers['cache-control'], 'max-age=0')
          assert.strictEqual(res.headers['last-modified'], undefined)
          done()
        })
    })
  })
})
