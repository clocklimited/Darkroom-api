var config = require('con.figure')(require('./config')())
  , createDarkroom = require('../server')
  , createBackendFactory = require('../lib/backend-factory-creator')
  , request = require('supertest')
  , hashHelper = require('./hash-helper')
  , async = require('async')

describe('Original', function() {
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

  it('should return an image if the image exists', function(done) {
    var uri = '/original/' + imgSrcId
      , url = uri + ':' + hashHelper(uri)
    request(darkroom)
      .get(url)
      .expect(200)
      .end(done)
  })

  it('should return 404 if an image doesnt exist', function(done) {
    var uri = '/original/missing-image'
      , url = uri + ':' + hashHelper(uri)
    request(darkroom)
      .get(url)
      .expect(404)
      .end(done)
  })

})
