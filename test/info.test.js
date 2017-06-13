var assert = require('assert')
  , createDarkroom = require('../server')
  , createBackendFactory = require('../lib/backend-factory-creator')
  , request = require('supertest')
  , hashHelper = require('./hash-helper')
  , async = require('async')
  , backends = require('./lib/backends')

backends().forEach(function (backend) {
  var config = backend.config

  describe('Info ' + backend.name + ' backend', function() {

    var imgSrcId
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

    it('should return info from an existing image', function(done) {
      var uri = '/info/' + imgSrcId
        , url = uri + ':' + hashHelper(uri)
      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          assert.equal(res.text, '{"width":500,"height":375}', res.text)
          done(error)
        })
    })

    it('should 404 if image is not found', function(done) {
      var uri = '/info/f3205aa9a406642cff624998ccc4dd78'
        , url = uri + ':' + hashHelper(uri)
      request(darkroom)
        .get(url)
        .expect(404)
        .end(done)
    })
  })
})
