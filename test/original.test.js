var config = require('con.figure')(require('./config')())
  , createDarkroom = require('../server')
  , createBackendFactory = require('../lib/backend-factory-creator')
  , request = require('supertest')
  , hashHelper = require('./hash-helper')
  , rimraf = require('rimraf')
  , mkdirp = require('mkdirp')

describe('Original', function() {
  var imgSrcId
    , darkroom
  function clean() {
    try {
      rimraf.sync(config.paths.data())
      rimraf.sync(config.paths.cache())
      mkdirp.sync(config.paths.data())
      mkdirp.sync(config.paths.cache())
    } catch (e) {
    }
  }

  before(clean)
  after(clean)

  before(function (done) {
    createBackendFactory(config, function (err, factory) {
      darkroom = createDarkroom(config, factory)
      done()
    })
  })

  before(function (done) {
    request(darkroom)
      .post('/')
      .set('x-darkroom-key', 'key')
      .set('Accept', 'application/json')
      .attach('file', 'test/fixtures/jpeg.jpeg')
      .end(function (err, res) {
        imgSrcId = res.body.src
        done()
      })
  })

  it('should return an image if the image exists', function(done) {
    var uri = '/original/' + imgSrcId
      , url = uri + ':' + hashHelper(uri)
    request(darkroom)
      .get(url)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        res.statusCode.should.equal(200)
        done()
      })
  })

  it('should return 404 if an image doesnt exist', function(done) {
    var uri = '/original/missing-image'
      , url = uri + ':' + hashHelper(uri)
    request(darkroom)
      .get(url)
      .expect(404)
      .end(function (error, res) {
        if (error) return done(error)
        res.statusCode.should.equal(404)
        done()
      })
  })

})
