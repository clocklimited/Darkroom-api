const mockServiceLocator = require('./mock-service-locator')
const createDarkroom = require('../server')
const createBackendFactory = require('../lib/backend-factory-creator')
const request = require('supertest')
const hashHelper = require('./hash-helper')
const gm = require('gm')
const assert = require('assert')
const backends = require('./lib/backends')
const allowedResponseFormats = ['jpg', 'jpeg', 'png', 'gif', 'tiff', 'svg']

backends().forEach(function (backend) {
  var config = backend.config

  describe('Resize ' + backend.name + ' backend', function () {
    var imgSrcId,
      darkroom,
      factory,
      imgSrcFormat = 'jpeg'

    before(function (done) {
      const sl = mockServiceLocator(config)
      createBackendFactory(sl, function (err, backendFactory) {
        factory = backendFactory
        darkroom = createDarkroom(sl, factory)
        done()
      })
    })

    before((done) => factory.setup(done))
    after((done) => factory.clean(done))

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
      var uri = '/0/' + imgSrcId,
        url = uri + ':' + hashHelper(uri)
      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).size(function (err, value) {
            assert.strictEqual(res.headers['d-cache'], 'MISS')
            assert.strictEqual(value.width, 500)
            assert.strictEqual(value.height, 375)
            done(err)
          })
        })
    })

    it('should resize /100/50/:url to fit', function (done) {
      var uri = '/100/50/' + imgSrcId,
        url = uri + ':' + hashHelper(uri)

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).size(function (err, value) {
            assert.strictEqual(res.headers['d-cache'], 'MISS')
            assert.strictEqual(value.width, 67)
            assert.strictEqual(value.height, 50)
            done(err)
          })
        })
    })

    it('should resize /100/50/:url to fit when an actual URL is requested', function (done) {
      var uri = '/100/50/' + 'https://img.clock.co.uk/1000x1000',
        url = uri + ':' + hashHelper(uri)

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).size(function (err, value) {
            assert.strictEqual(res.headers['d-cache'], 'MISS')
            assert.strictEqual(value.width, 50)
            assert.strictEqual(value.height, 50)
            done(err)
          })
        })
    })

    it('should accept mode /100/50/fit/:url ', function (done) {
      var uri = '/100/50/fit/' + imgSrcId,
        url = uri + ':' + hashHelper(uri)
      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).size(function (err, value) {
            assert.strictEqual(res.headers['d-cache'], 'MISS')
            assert.strictEqual(value.width, 67)
            assert.strictEqual(value.height, 50)
            done(err)
          })
        })
    })

    it('should accept mode /100/50/cover/:url ', function (done) {
      var uri = '/100/50/cover/' + imgSrcId,
        url = uri + ':' + hashHelper(uri)

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).size(function (err, value) {
            assert.strictEqual(res.headers['d-cache'], 'MISS')
            assert.strictEqual(value.width, 100)
            assert.strictEqual(value.height, 50)
            done(err)
          })
        })
    })

    it('should accept mode /100/50/pad/:url ', function (done) {
      var uri = '/100/50/pad/' + imgSrcId,
        url = uri + ':' + hashHelper(uri)

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).size(function (err, value) {
            assert.strictEqual(res.headers['d-cache'], 'MISS')
            assert.strictEqual(value.width, 100)
            assert.strictEqual(value.height, 50)
            done(err)
          })
        })
    })

    it('should resize to a given size with only width /160/:url', function (done) {
      var uri = '/160/' + imgSrcId,
        url = uri + ':' + hashHelper(uri)

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).size(function (err, value) {
            assert.strictEqual(res.headers['d-cache'], 'MISS')
            assert.strictEqual(value.width, 160)
            assert.strictEqual(value.height, 120)
            done(err)
          })
        })
    })

    it('should format image to specified format', function (done) {
      this.timeout(6000)
      var uri = '/160/' + imgSrcId,
        format = 'png',
        url = uri + ':' + hashHelper(uri) + '/a.' + format

      config.allowedResponseFormats = allowedResponseFormats

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).format(function (err, value) {
            assert.strictEqual(value, format.toUpperCase())
            done(err)
          })
        })
    })

    it('should format image to original format if no other format is specified', function (done) {
      var uri = '/160/' + imgSrcId,
        url = uri + ':' + hashHelper(uri)

      config.allowedResponseFormats = allowedResponseFormats

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).format(function (err, value) {
            assert.strictEqual(value, imgSrcFormat.toUpperCase())
            done(err)
          })
        })
    })

    it('should set quality based on querystring', function (done) {
      var uri = '/160/' + imgSrcId,
        qs = 'quality=60',
        url = uri + ':' + hashHelper(uri, qs) + '?' + qs

      config.allowedResponseFormats = allowedResponseFormats

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).identify(function (err, data) {
            assert.equal(data['JPEG-Quality'], '60')
            done(err)
          })
        })
    })

    it('should set quality based on config if not provided by querystring', function (done) {
      var uri = '/160/' + imgSrcId,
        url = uri + ':' + hashHelper(uri)

      config.allowedResponseFormats = allowedResponseFormats

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).identify(function (err, data) {
            assert.equal(data['JPEG-Quality'], config.quality)
            done(err)
          })
        })
    })

    it('should accept gravity set in querystring', function (done) {
      var uri = '/160/' + imgSrcId,
        qs = 'gravity=South',
        url = uri + ':' + hashHelper(uri, qs) + '?' + qs

      config.allowedResponseFormats = allowedResponseFormats

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).identify(function (err, data) {
            assert.strictEqual(res.headers['d-cache'], 'MISS')
            assert.strictEqual(data.size.width, 160)
            assert.strictEqual(data.size.height, 120)
            done(err)
          })
        })
    })

    it('should accept multiple querystring options', function (done) {
      var uri = '/160/' + imgSrcId,
        qs = 'quality=60&gravity=South',
        url = uri + ':' + hashHelper(uri, qs) + '?' + qs

      config.allowedResponseFormats = allowedResponseFormats

      request(darkroom)
        .get(url)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          gm(res.body).identify(function (err, data) {
            assert.strictEqual(res.headers['d-cache'], 'MISS')
            assert.equal(data['JPEG-Quality'], 60)
            assert.strictEqual(data.size.width, 160)
            assert.strictEqual(data.size.height, 120)
            done(err)
          })
        })
    })

    describe('Cache Control Headers', function () {
      it('should return a high max age header of successful requests', function (done) {
        var uri = '/100/' + imgSrcId,
          url = uri + ':' + hashHelper(uri)

        config.http.maxage = 3600

        request(darkroom)
          .get(url)
          .expect(200)
          .end(function (error, res) {
            assert.strictEqual(
              res.headers['cache-control'],
              'max-age=' + config.http.maxage
            )
            done(error)
          })
      })

      it('should return a low max age header when a requests 404s', function (done) {
        var uri = '/100/f3205aa9a406642cff624998ccc4dd78',
          url = uri + ':' + hashHelper(uri)

        config.http.pageNotFoundMaxage = 2
        config.log = false

        request(darkroom)
          .get(url)
          .expect(404)
          .end(function (error, res) {
            if (error) return done(error)
            assert.strictEqual(
              res.headers['cache-control'],
              'max-age=' + config.http.pageNotFoundMaxage
            )
            done()
          })
      })
    })
  })
})
