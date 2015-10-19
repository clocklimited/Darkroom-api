var config = require('con.figure')(require('./config')())
  , request = require('supertest')
  , createBackendFactory = require('../lib/backend-factory-creator')
  , _ = require('lodash')
  , fs = require('fs')
  , assert = require('assert')
  , async = require('async')

describe('API', function() {
  var createDarkroom = require('../server')
    , darkroom
    , factory

  before(function (done) {
    createBackendFactory(config, function (err, backendFactory) {
      factory = backendFactory
      darkroom = createDarkroom(config, factory)
      done()
    })
  })

  function clean(done) {
    async.series([ factory.clean, factory.setup ], done)
  }

  before(clean)
  after(clean)

  describe('#get', function() {

    it('should 404 for site root', function (done) {
      request(darkroom)
        .get('/')
        .expect(404)
        .end(done)
    })

    it('should 404 for non API endpoints', function (done) {
      request(darkroom)
        .get('/favicon.ico')
        .expect(404)
        .end(done)
    })
  })

  describe('#upload', function() {
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
      var originalEnd
        , req = request(darkroom).put('/')
          .set('x-darkroom-key', 'key')
          .set('Accept', 'application/json')

      originalEnd = req.end
      req.end = function() {}

      var stream = fs.createReadStream(__dirname + '/fixtures/jpeg.jpeg')

      stream.pipe(req)

      stream.on('end', function() {
        originalEnd.call(req, function(err, res) {
          assert.equal(res.statusCode, 200, res.text)
          assert.deepEqual(Object.keys(res.body), [ 'id' ])
          done()
        })
      })

    })

    it('should fail upload from empty PUT', function (done) {
      request(darkroom).put('/')
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
          _.each(res.body, function (file) {
            assert.deepEqual(Object.keys(file), [ 'id' ])
          })
          done()
        })
    })
  })
})
