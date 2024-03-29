const mockServiceLocator = require('./mock-service-locator')
const createDarkroom = require('../server')
const createBackendFactory = require('../lib/backend-factory-creator')
const request = require('supertest')
const hashHelper = require('./hash-helper')
const backends = require('./lib/backends')
const assert = require('assert')

backends().forEach(function (backend) {
  var config = backend.config

  describe('Download ' + backend.name + ' backend', function () {
    var imgSrcId, darkroom, factory

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
          done(err)
        })
    })

    it('should return an image if the image exists (with the correct header for downloading if no filename present)', function (done) {
      var uri = '/download/' + imgSrcId,
        url = uri + ':' + hashHelper(uri)
      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          assert.strictEqual(
            res.headers['content-disposition'],
            'attachment;filename="download"'
          )
          done()
        })
    })

    it('should return an image if the image exists (with the correct header for downloading if filename is present)', function (done) {
      var uri = '/download/' + imgSrcId,
        url = uri + ':' + hashHelper(uri) + '/audio.mp3'
      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          assert.strictEqual(
            res.headers['content-disposition'],
            'attachment;filename="audio.mp3"'
          )
          done()
        })
    })
  })
})
