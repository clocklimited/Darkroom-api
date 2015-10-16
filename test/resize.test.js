var config = require('con.figure')(require('./config')())
  , createDarkroom = require('../server')
  , createBackendFactory = require('../lib/backend-factory-creator')
  , request = require('supertest')
  , hashHelper = require('./hash-helper')
  , gm = require('gm')
  , async = require('async')

describe('Resize', function () {
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
        imgSrcId = res.body.src
        done()
      })
  })

  it('should return an image if resize dimension is zero for /0/:url', function (done) {
    var uri = '/100/' + imgSrcId
      , url = uri + ':' + hashHelper(uri)
      , now = new Date()
    request(darkroom)
      .get(url)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        ;(100).should.be.above(new Date(res.headers['last-modified']) - now)
        res.statusCode.should.equal(200)
        done()
      })
  })

  it('should resize /100/50/:url to fit', function (done) {
    var uri = '/100/50/' + imgSrcId
      , url = uri + ':' + hashHelper(uri)
      , now = new Date()
    request(darkroom)
      .get(url)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        res.statusCode.should.equal(200)
        ;(100).should.be.above(new Date(res.headers['last-modified']) - now)
        gm(config.paths.cache() + url.replace(':', '')).size(function (err, value) {
          value.width.should.equal(67)
          value.height.should.equal(50)
          done()
        })
      })
  })

  it('should accept mode /100/50/fit/:url ', function (done) {
    var uri = '/100/50/fit/' + imgSrcId
      , url = uri + ':' + hashHelper(uri)
      , now = new Date()
    request(darkroom)
      .get(url)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        res.statusCode.should.equal(200)
        ;(100).should.be.above(new Date(res.headers['last-modified']) - now)
        gm(config.paths.cache() + url.replace(':', '')).size(function (err, value) {
          value.width.should.equal(67)
          value.height.should.equal(50)
          done()
        })
      })
  })

  it('should accept mode /100/50/cover/:url ', function (done) {
    var uri = '/100/50/cover/' + imgSrcId
      , url = uri + ':' + hashHelper(uri)
      , now = new Date()
    request(darkroom)
      .get(url)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        res.statusCode.should.equal(200)
        ;(100).should.be.above(new Date(res.headers['last-modified']) - now)
        gm(config.paths.cache() + url.replace(':', '')).size(function (err, value) {
          value.width.should.equal(100)
          value.height.should.equal(50)
          done()
        })
      })
  })

  it('should resize to a given size with only width /160/:url', function (done) {
    var uri = '/160/' + imgSrcId
      , url = uri + ':' + hashHelper(uri)
      , now = new Date()

    request(darkroom)
      .get(url)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        res.statusCode.should.equal(200)
        ;(100).should.be.above(new Date(res.headers['last-modified']) - now)
        gm(config.paths.cache() + url.replace(':', '')).size(function (err, value) {
          value.width.should.equal(160)
          done()
        })
      })
  })

  describe('Cache Control Headers', function() {
    it('should return a high max age header of successful requests', function (done) {
      var uri = '/100/' + imgSrcId
        , url = uri + ':' + hashHelper(uri)
        , now = new Date()

      config.http.maxage = 3600

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          ;(100).should.be.above(new Date(res.headers['last-modified']) - now)
          res.headers['cache-control'].should.equal('max-age=' + config.http.maxage)
          done()
        })

    })

    it('should return a low max age header when a requests 404s', function (done) {
      var uri = '/100/abcdefghijklmnopqrstuvwxyz123456'
        , url = uri + ':' + hashHelper(uri)

      config.http.pageNotFoundMaxage = 2
      config.log = false

      request(darkroom)
        .get(url)
        .expect(404)
        .end(function (error, res) {
          if (error) return done(error)
          res.headers['cache-control'].should.equal('max-age=' + config.http.pageNotFoundMaxage)
          done()
        })

    })
  })
})
