var config = require('con.figure')(require('./config')())
  , createDarkroom = require('../server')
  , createBackendFactory = require('../lib/backend-factory-creator')
  , request = require('supertest')
  , querystring = require('querystring')
  , baseUrl = '/circle/'
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf')
  , gm = require('gm')
  , assert = require('assert-diff')
  , hashHelper = require('./hash-helper')

describe('Circle', function() {
  var imgSrcId = null
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

  before(function (done) {
    createBackendFactory(config, function (err, factory) {
      darkroom = createDarkroom(config, factory)
      done()
    })
  })

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
    var qs = querystring.stringify({ x0: '100', y0: '100', x1: '0', y1: '0', height: '100', width: '100' })
      , uri = baseUrl + imgSrcId

    request(darkroom)
      .get(uri + ':' + hashHelper(baseUrl + imgSrcId + qs) + '?' + qs)
      .expect(200)
      .end(done)
  })

  it('allow you to pass in a background colour', function(done) {
    var qs = querystring.stringify({ colour: '#9966FF' })
      , uri = baseUrl + imgSrcId

    request(darkroom)
      .get(uri + ':' + hashHelper(baseUrl + imgSrcId + qs) + '?' + qs)
      .expect(200)
      .end(done)
  })

  function binaryParser(res, cb) {
    res.setEncoding('binary')
    res.data = ''
    res.on('data', function (chunk) {
      res.data += chunk
    })
    res.on('end', function () {
      cb(null, new Buffer(res.data, 'binary'))
    })
  }

  it('allow you to resize an image', function(done) {
    var qs = querystring.stringify({ colour: '#9966FF', height: '225', width: '300' })
      , uri = baseUrl + imgSrcId

    request(darkroom)
      .get(uri + ':' + hashHelper(baseUrl + imgSrcId + qs) + '?' + qs)
      .expect(200)
      .parse(binaryParser)
      .end(function (err, res) {
        if (err) return done(err)
        gm(new Buffer(res.body)).size(function (err, size) {
          if (err) return done(err)

          assert.deepEqual(size, { width: 300, height: 225 })
          done()
        })
      })
  })

  it('should error if the checksum does not match', function (done) {
    var uri = baseUrl + imgSrcId
      , qs = querystring.stringify({ width: 50000 })

    request(darkroom)
      .get(uri + ':' + hashHelper(uri) + '?' + qs)
      .expect(403)
      .end(done)
  })
})
