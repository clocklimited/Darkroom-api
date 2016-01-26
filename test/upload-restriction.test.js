var request = require('supertest')
  , fs = require('fs')
  , createBackendFactory = require('../lib/backend-factory-creator')
  , assert = require('assert')
  , async = require('async')
  , backends = require('./lib/backends')
  , extend = require('lodash.assign')

backends().forEach(function (backend) {
  var config = extend({}, backend.config)

  describe('API ' + backend.name + ' backend', function() {

    var createDarkroom = require('../server')

    describe('API ' + backend.name + ' backend', function() {
      var darkroom
        , factory
        , testConfig = extend({}, config, { upload: { allow: [ 'image/png' ] } })

      function clean(done) {
        async.series([ factory.clean, factory.setup ], done)
      }

      before(function (done) {
        createBackendFactory(testConfig, function (err, backendFactory) {
          factory = backendFactory
          darkroom = createDarkroom(testConfig, factory)
          done()
        })
      })

      before(clean)
      after(clean)

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
            assert.equal(res.body.message, 'Forbidden type detected: text/plain; charset=us-ascii')
            done()
          })
      })

      it('should not allow PUT upload of certain any type', function (done) {
        var originalEnd
          , req = request(darkroom).put('/')
            .set('x-darkroom-key', 'key')
            .set('Accept', 'application/json')

        originalEnd = req.end
        req.end = function() {}

        var stream = fs.createReadStream(__dirname + '/fixtures/test.txt')

        stream.pipe(req)

        stream.on('end', function() {
          originalEnd.call(req, function(err, res) {
            assert.equal(res.body.message, 'Forbidden type detected: text/plain; charset=us-ascii')
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
            assert.equal(res.body.id, 'b055a237334923b3b33e9999cee2bcec')
            done()
          })
      })

      it('should allow PUT upload of whitelisted any type', function (done) {
        var originalEnd
          , req = request(darkroom).put('/')
            .set('x-darkroom-key', 'key')
            .set('Accept', 'application/json')

        originalEnd = req.end
        req.end = function() {}

        var stream = fs.createReadStream(__dirname + '/fixtures/png.png')

        stream.pipe(req)

        stream.on('end', function() {
          originalEnd.call(req, function(err, res) {
            assert.equal(res.body.id, 'b055a237334923b3b33e9999cee2bcec')
            done()
          })
        })

      })
    })
  })
})
