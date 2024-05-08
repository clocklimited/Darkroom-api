const mockServiceLocator = require('./mock-service-locator')
const createDarkroom = require('../server')
const request = require('supertest')
const fs = require('fs')
const createBackendFactory = require('../lib/backend-factory-creator')
const assert = require('assert')
const backends = require('./lib/backends')
const extend = require('lodash.assign')

backends().forEach(function (backend) {
  var config = extend({}, backend.config)

  describe('Upload Restriction ' + backend.name + ' backend', function () {
    var darkroom,
      factory,
      testConfig = extend({}, config, { upload: { allow: ['image/png'] } })

    before(function (done) {
      const sl = mockServiceLocator(testConfig)
      createBackendFactory(sl, function (err, backendFactory) {
        factory = backendFactory
        darkroom = createDarkroom(sl, factory)
        done()
      })
    })

    before((done) => factory.setup(done))
    after((done) => factory.clean(done))

    it('should not allow POST upload of certain any type', function (done) {
      request(darkroom)
        .post('/')
        .set('x-darkroom-key', 'key')
        .set('Accept', 'application/json')
        .attach('file', 'test/fixtures/test.txt')
        .expect(415)
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          if (err) return done(err)
          assert.strictEqual(
            res.body.message,
            'Forbidden type detected: text/plain; charset=us-ascii'
          )
          done()
        })
    })

    it('should not allow PUT upload of certain any type', function (done) {
      request(darkroom)
        .put('/')
        .set('x-darkroom-key', 'key')
        .set('Accept', 'application/json')
        .send(fs.readFileSync(__dirname + '/fixtures/test.txt'))

        .end(function (err, res) {
          if (err) return done(err)
          assert.strictEqual(
            res.body.message,
            'Forbidden type detected: text/plain; charset=us-ascii'
          )
          done()
        })
    })

    it('should allow POST upload of whitelisted types', function (done) {
      request(darkroom)
        .post('/')
        .set('x-darkroom-key', 'key')
        .set('Accept', 'application/json')
        .attach('file', 'test/fixtures/png.png')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          if (err) return done(err)
          assert.strictEqual(res.body.id, 'b055a237334923b3b33e9999cee2bcec')
          done()
        })
    })

    it('should allow PUT upload of whitelisted any type', function (done) {
      request(darkroom)
        .put('/')
        .set('x-darkroom-key', 'key')
        .set('Accept', 'application/json')
        .send(fs.readFileSync(__dirname + '/fixtures/png.png'))

        .end(function (err, res) {
          if (err) return done(err)
          assert.strictEqual(res.body.id, 'b055a237334923b3b33e9999cee2bcec')
          done()
        })
    })

    it('should reject POST upload of non-whitelisted types with a 415 error', function (done) {
      request(darkroom)
        .post('/')
        .set('x-darkroom-key', 'key')
        .set('Accept', 'application/json')
        .attach('file', 'test/fixtures/jpeg.jpeg')
        .expect(415)
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          if (err) return done(err)
          assert.strictEqual(
            res.body.message,
            'Forbidden type detected: image/jpeg; charset=binary'
          )
          done()
        })
    })

    it('should reject PUT upload of non-whitelisted types with a 415 error', function (done) {
      request(darkroom)
        .put('/')
        .set('x-darkroom-key', 'key')
        .set('Accept', 'application/json')
        .send(fs.readFileSync(__dirname + '/fixtures/jpeg.jpeg'))
        .expect(415)
        .end(function (err, res) {
          if (err) return done(err)
          assert.strictEqual(
            res.body.message,
            'Forbidden type detected: image/jpeg; charset=binary'
          )
          done()
        })
    })
  })
})
