const request = require('supertest')
const fs = require('fs')
const createBackendFactory = require('../lib/backend-factory-creator')
const assert = require('assert')
const backends = require('./lib/backends')
const extend = require('lodash.assign')

backends().forEach(function (backend) {
  var config = extend({}, backend.config)

  describe('API ' + backend.name + ' backend', function () {
    var createDarkroom = require('../server')

    describe('API ' + backend.name + ' backend', function () {
      var darkroom,
        factory,
        testConfig = extend({}, config, { upload: { allow: ['image/png'] } })

      before(function (done) {
        createBackendFactory(testConfig, function (err, backendFactory) {
          factory = backendFactory
          darkroom = createDarkroom(testConfig, factory)
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
          .expect(403)
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
        var originalEnd,
          req = request(darkroom)
            .put('/')
            .set('x-darkroom-key', 'key')
            .set('Accept', 'application/json')

        originalEnd = req.end
        req.end = function () {}

        var stream = fs.createReadStream(__dirname + '/fixtures/test.txt')

        stream.pipe(req)

        stream.on('end', function () {
          originalEnd.call(req, function (err, res) {
            assert.strictEqual(
              res.body.message,
              'Forbidden type detected: text/plain; charset=us-ascii'
            )
            done()
          })
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
        var originalEnd,
          req = request(darkroom)
            .put('/')
            .set('x-darkroom-key', 'key')
            .set('Accept', 'application/json')

        originalEnd = req.end
        req.end = function () {}

        var stream = fs.createReadStream(__dirname + '/fixtures/png.png')

        stream.pipe(req)

        stream.on('end', function () {
          originalEnd.call(req, function (err, res) {
            assert.strictEqual(res.body.id, 'b055a237334923b3b33e9999cee2bcec')
            done()
          })
        })
      })
    })
  })
})
