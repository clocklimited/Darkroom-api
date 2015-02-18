var config = require('con.figure')(require('./config')())
  , darkroom = require('../server')(config)
  , request = require('supertest')
  , hashHelper = require('./hash-helper')
  , gm = require('gm')
  , rimraf = require('rimraf')
  , mkdirp = require('mkdirp')

describe('Resize', function () {
  var imgSrcId

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

  it('should return an image if resize dimension is zero for /0/:url', function(done) {
    var uri = '/100/' + imgSrcId
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

  it('should resize /100/50/:url to fit', function(done) {
    var uri = '/100/50/' + imgSrcId
      , url = uri + ':' + hashHelper(uri)
    request(darkroom)
      .get(url)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        res.statusCode.should.equal(200)
        gm(config.paths.cache() + url.replace(':', '')).size(function(err, value) {
          value.width.should.equal(67)
          value.height.should.equal(50)
          done()
        })
      })
  })

  it('should accept mode /100/50/fit/:url ', function(done) {
    var uri = '/100/50/fit/' + imgSrcId
      , url = uri + ':' + hashHelper(uri)
    request(darkroom)
      .get(url)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        res.statusCode.should.equal(200)
        gm(config.paths.cache() + url.replace(':', '')).size(function(err, value) {
          value.width.should.equal(67)
          value.height.should.equal(50)
          done()
        })
      })
  })

  it('should accept mode /100/50/cover/:url ', function(done) {
    var uri = '/100/50/cover/' + imgSrcId
      , url = uri + ':' + hashHelper(uri)
    request(darkroom)
      .get(url)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        res.statusCode.should.equal(200)
        gm(config.paths.cache() + url.replace(':', '')).size(function(err, value) {
          value.width.should.equal(100)
          value.height.should.equal(50)
          done()
        })
      })
  })

  it('should resize to a given size with only width /160/:url', function(done) {
    var uri = '/160/' + imgSrcId
      , url = uri + ':' + hashHelper(uri)

    request(darkroom)
      .get(url)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        res.statusCode.should.equal(200)
        gm(config.paths.cache() + url.replace(':', '')).size(function(err, value) {
          value.width.should.equal(160)
          done()
        })
      })
  })
})
