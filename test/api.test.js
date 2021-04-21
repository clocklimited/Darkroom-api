const request = require('supertest')
const createBackendFactory = require('../lib/backend-factory-creator')
const fs = require('fs')
const assert = require('assert')
const async = require('async')
const backends = require('./lib/backends')

backends().forEach(function (backend) {
  var config = backend.config

  describe('API ' + backend.name + ' backend', function () {
    var createDarkroom = require('../server'),
      darkroom,
      factory

    before(function (done) {
      createBackendFactory(config, function (err, backendFactory) {
        factory = backendFactory
        darkroom = createDarkroom(config, factory)
        done()
      })
    })

    function clean(done) {
      async.series(
        [factory.clean.bind(factory), factory.setup.bind(factory)],
        done
      )
    }

    before(clean)
    after(clean)

    describe('#get', function () {
      it('should 404 for site root', function (done) {
        request(darkroom).get('/').expect(404).end(done)
      })

      it('should 404 for non API endpoints', function (done) {
        request(darkroom).get('/favicon.ico').expect(404).end(done)
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
            done()
          })
      })

      it('should upload a single image via PUT', function (done) {
        var originalEnd,
          req = request(darkroom)
            .put('/')
            .set('x-darkroom-key', 'key')
            .set('Accept', 'application/json')

        originalEnd = req.end
        req.end = function () {}

        var stream = fs.createReadStream(__dirname + '/fixtures/jpeg.jpeg')

        stream.pipe(req)

        stream.on('end', function () {
          originalEnd.call(req, function (err, res) {
            assert.equal(res.statusCode, 200, res.text)
            assert(res.body.id !== undefined)
            assert.equal(res.body.size, 104680)
            assert.equal(res.body.type, 'image/jpeg; charset=binary')
            done()
          })
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
            assert.equal(res.body[0].size, 104680)
            assert.equal(res.body[0].type, 'image/jpeg; charset=binary')
            assert(res.body[1].id !== undefined)
            assert.equal(res.body[1].size, 147532)
            assert.equal(res.body[1].type, 'image/png; charset=binary')
            done()
          })
      })
    })
  })
})
