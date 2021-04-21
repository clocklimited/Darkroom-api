const createDarkroom = require('../server')
const createBackendFactory = require('../lib/backend-factory-creator')
const request = require('supertest')
const hashHelper = require('./hash-helper')
const async = require('async')
const backends = require('./lib/backends')
const assert = require('assert')

backends().forEach(function (backend) {
  var config = backend.config

  describe('Original ' + backend.name + ' backend', function () {
    var imgSrcId, darkroom, factory, dateUploaded

    before(function (done) {
      createBackendFactory(config, function (err, backendFactory) {
        factory = backendFactory
        darkroom = createDarkroom(config, factory)
        done()
      })
    })

    function clean(done) {
      async.series([factory.clean, factory.setup], done)
    }

    before(clean)
    after(clean)

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
          assert.equal(res.headers['cache-control'], 'max-age=10')
          assert.equal(res.headers['last-modified'], dateUploaded)
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
          assert.equal(res.headers['cache-control'], 'max-age=0')
          assert.equal(res.headers['last-modified'], undefined)
          done()
        })
    })
  })
})
