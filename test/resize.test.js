var createDarkroom = require('../server')
  , createBackendFactory = require('../lib/backend-factory-creator')
  , request = require('supertest')
  , hashHelper = require('./hash-helper')
  , gm = require('gm')
  , async = require('async')
  , assert = require('assert')
  , backends = require('./lib/backends')
  , allowedFormats =
      [ 'jpg'
      , 'jpeg'
      , 'png'
      , 'gif'
      , 'tiff'
      , 'svg'
      ]

backends().forEach(function (backend) {
  var config = backend.config

  describe('Resize ' + backend.name + ' backend', function() {

    var imgSrcId
      , darkroom
      , factory
      , imgSrcFormat = 'jpeg'

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
        .attach('file', 'test/fixtures/jpeg.' + imgSrcFormat)
        .end(function (err, res) {
          imgSrcId = res.body.id
          done(err)
        })
    })

    it('should return original image if resize dimension is zero /0/:url', function (done) {
      var uri = '/0/' + imgSrcId
        , url = uri + ':' + hashHelper(uri)
      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).size(function (err, value) {
            assert.equal(res.headers['d-cache'], 'MISS')
            assert.equal(value.width, 500)
            assert.equal(value.height, 375)
            done(err)
          })
        })
    })

    it('should resize /100/50/:url to fit', function (done) {
      var uri = '/100/50/' + imgSrcId
        , url = uri + ':' + hashHelper(uri)

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).size(function (err, value) {
            assert.equal(res.headers['d-cache'], 'MISS')
            assert.equal(value.width, 67)
            assert.equal(value.height, 50)
            done(err)
          })
        })
    })

    it('should accept mode /100/50/fit/:url ', function (done) {
      var uri = '/100/50/fit/' + imgSrcId
        , url = uri + ':' + hashHelper(uri)
      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).size(function (err, value) {
            assert.equal(res.headers['d-cache'], 'MISS')
            assert.equal(value.width, 67)
            assert.equal(value.height, 50)
            done(err)
          })
        })
    })

    it('should accept mode /100/50/cover/:url ', function (done) {
      var uri = '/100/50/cover/' + imgSrcId
        , url = uri + ':' + hashHelper(uri)

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).size(function (err, value) {
            assert.equal(res.headers['d-cache'], 'MISS')
            assert.equal(value.width, 100)
            assert.equal(value.height, 50)
            done(err)
          })
        })
    })

    it('should resize to a given size with only width /160/:url', function (done) {
      var uri = '/160/' + imgSrcId
        , url = uri + ':' + hashHelper(uri)

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).size(function (err, value) {
            assert.equal(res.headers['d-cache'], 'MISS')
            assert.equal(value.width, 160)
            assert.equal(value.height, 120)
            done(err)
          })
        })
    })

    it('should format image to specified format', function (done) {
      this.timeout(6000)
      var uri = '/160/' + imgSrcId
        , format = 'png'
        , url = uri + ':' + hashHelper(uri) + '/a.' + format

      config.allowedFormats = allowedFormats

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).format(function (err, value) {
            assert.equal(value, format.toUpperCase())
            done(err)
          })
        })
    })

    it('should format image to original format if no other format is specified', function (done) {
      var uri = '/160/' + imgSrcId
        , url = uri + ':' + hashHelper(uri)

      config.allowedFormats = allowedFormats

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).format(function (err, value) {
            assert.equal(value, imgSrcFormat.toUpperCase())
            done(err)
          })
        })
    })

    describe('Cache Control Headers', function() {
      it('should return a high max age header of successful requests', function (done) {
        var uri = '/100/' + imgSrcId
          , url = uri + ':' + hashHelper(uri)

        config.http.maxage = 3600

        request(darkroom)
          .get(url)
          .expect(200)
          .end(function (error, res) {
            assert.equal(res.headers['cache-control'], 'max-age=' + config.http.maxage)
            done(error)
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
            assert.equal(res.headers['cache-control'], 'max-age=' + config.http.pageNotFoundMaxage)
            done(error)
          })
      })
    })
  })
})
