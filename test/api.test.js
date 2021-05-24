const mockServiceLocator = require('./mock-service-locator')
const request = require('supertest')
const createBackendFactory = require('../lib/backend-factory-creator')
const fs = require('fs')
const assert = require('assert')
const backends = require('./lib/backends')

backends().forEach(function (backend) {
  var config = backend.config

  describe('API ' + backend.name + ' backend', function () {
    var createDarkroom = require('../server'),
      darkroom,
      factory

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

    describe('#get', function () {
      it('should 418 for site root', function (done) {
        request(darkroom).get('/').expect(418).end(done)
      })

      it('should 404 for non API endpoints', function (done) {
        request(darkroom).get('/favicon.ico').expect(404).end(done)
      })

      it('should 200 for health check', function (done) {
        request(darkroom).get('/_health').expect(200, 'OK').end(done)
      })

      it('should 500 if health check fails', function (done) {
        const oldHealthCheck = factory.isHealthy
        factory.isHealthy = (cb) => cb(null, false)
        request(darkroom)
          .get('/_health')
          .expect(500, 'ERROR')
          .end((error) => {
            if (error) return done(error)
            factory.isHealthy = oldHealthCheck
            done()
          })
      })
    })

    describe('#upload', function () {
      it('should upload a single image', function (done) {
        request(darkroom)
          .post('/')
          .set('x-darkroom-key', 'key')
          .set('Accept', 'application/json')
          .attach('file', 'test/fixtures/jpeg.jpeg')
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function (err, res) {
            if (err) return done(err)
            assert(res.body.id !== undefined, 'invalid id ' + res.body)
            assert.strictEqual(res.body.id, '1cfdd3bf942749472093f3b0ed6d4f89')
            assert.strictEqual(res.body.size, 104680)
            assert.strictEqual(res.body.type, 'image/jpeg; charset=binary')
            done()
          })
      })

      it('should upload a single image via PUT', function (done) {
        request(darkroom)
          .put('/')
          .set('x-darkroom-key', 'key')
          .set('Accept', 'application/json')
          .send(fs.readFileSync(__dirname + '/fixtures/jpeg.jpeg'))
          .end((err, res) => {
            if (err) return done(err)
            assert.strictEqual(res.statusCode, 200, res.text)
            assert(res.body.id !== undefined)
            assert.strictEqual(res.body.id, '1cfdd3bf942749472093f3b0ed6d4f89')
            assert.strictEqual(res.body.size, 104680)
            assert.strictEqual(res.body.type, 'image/jpeg; charset=binary')
            done()
          })
      })

      it('should fail upload from empty PUT', function (done) {
        request(darkroom)
          .put('/')
          .set('x-darkroom-key', 'key')
          .set('Accept', 'application/json')
          .expect(400)
          .end(done)
      })

      it('should upload multiple images', function (done) {
        request(darkroom)
          .post('/')
          .set('x-darkroom-key', 'key')
          .attach('file', 'test/fixtures/jpeg.jpeg')
          .attach('file', 'test/fixtures/png.png')
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err)
            assert(Array.isArray(res.body), 'not an array')
            assert(res.body[0].id !== undefined)
            assert.strictEqual(
              res.body[0].id,
              '1cfdd3bf942749472093f3b0ed6d4f89'
            )
            assert.strictEqual(res.body[0].size, 104680)
            assert.strictEqual(res.body[0].type, 'image/jpeg; charset=binary')
            assert(res.body[1].id !== undefined)
            assert.strictEqual(
              res.body[1].id,
              'b055a237334923b3b33e9999cee2bcec'
            )
            assert.strictEqual(res.body[1].size, 147532)
            assert.strictEqual(res.body[1].type, 'image/png; charset=binary')
            done()
          })
      })
    })
  })
})
