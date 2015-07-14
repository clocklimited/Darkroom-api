var config = require('con.figure')(require('./config')())
  , darkroom = require('../server')(config)
  , request = require('supertest')
  , querystring = require('querystring')
  , baseUrl = '/circle/'
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf')
  , assert = require('assert-diff')
  , hashHelper = require('./hash-helper')

describe('Circle', function() {
  var imgSrcId = null

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

  it('should return a circular cropped image', function(done) {
    var uri = baseUrl + imgSrcId

    request(darkroom)
      .get(uri + ':' + hashHelper(uri))
      .expect(200)
      .end(done)
  })

  it('allow you to pass in circular co-ordinates', function(done) {
    var uri = baseUrl + imgSrcId
      , qs = querystring.stringify({ src: imgSrcId, x0: '100', y0: '100', x1: '0', y1: '0', h: '100', w: '100' })

    request(darkroom)
      .get(uri + ':' + hashHelper(uri) + '?' + qs)
      .expect(200)
      .end(done)
  })

  it('allow you to pass in a background colour', function(done) {
    var uri = baseUrl + imgSrcId
      , qs = querystring.stringify({ colour: '#9966FF' })

    request(darkroom)
      .get(uri + ':' + hashHelper(uri) + '?' + qs)
      .expect(200)
      .end(done)
  })
})
