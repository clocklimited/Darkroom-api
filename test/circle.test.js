const createDarkroom = require('../server')
const createBackendFactory = require('../lib/backend-factory-creator')
const request = require('supertest')
const querystring = require('querystring')
const baseUrl = '/circle/'
const gm = require('gm')
const assert = require('assert-diff')
const hashHelper = require('./hash-helper')
const async = require('async')
const backends = require('./lib/backends')

backends().forEach(function (backend) {
  var config = backend.config
  describe('Circle ' + backend.name + ' backend', function () {
    var imgSrcId = null,
      darkroom,
      factory

    before(function (done) {
      createBackendFactory(config, function (err, backendFactory) {
        factory = backendFactory
        darkroom = createDarkroom(config, factory)
        done()
      })
    })

    function clean(done) {
      async.series(
        [factory.clean.bind(factory), factory.setup.bind(factory)],
        done
      )
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
          done()
        })
    })

    it('should return a circular cropped image', function (done) {
      var uri = baseUrl + imgSrcId

      request(darkroom)
        .get(uri + ':' + hashHelper(uri))
        .expect(200)
        .end(done)
    })

    it('allow you to pass in circular co-ordinates', function (done) {
      var qs = querystring.stringify({
          x0: '100',
          y0: '100',
          x1: '0',
          y1: '0',
          height: '100',
          width: '100'
        }),
        uri = baseUrl + imgSrcId

      request(darkroom)
        .get(uri + ':' + hashHelper(baseUrl + imgSrcId + qs) + '?' + qs)
        .expect(200)
        .end(done)
    })

    it('allow you to pass in a background colour', function (done) {
      var qs = querystring.stringify({ colour: '#9966FF' }),
        uri = baseUrl + imgSrcId

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
        cb(null, new Buffer.from(res.data, 'binary'))
      })
    }

    it('allow you to resize an image', function (done) {
      var qs = querystring.stringify({
          colour: '#9966FF',
          height: '225',
          width: '300'
        }),
        uri = baseUrl + imgSrcId

      request(darkroom)
        .get(uri + ':' + hashHelper(baseUrl + imgSrcId + qs) + '?' + qs)
        .expect(200)
        .parse(binaryParser)
        .end(function (err, res) {
          if (err) return done(err)
          gm(new Buffer.from(res.body)).size(function (err, size) {
            if (err) return done(err)

            assert.deepEqual(size, { width: 300, height: 225 })
            done()
          })
        })
    })

    it('should error if the checksum does not match', function (done) {
      var uri = baseUrl + imgSrcId,
        qs = querystring.stringify({ width: 50000 })

      request(darkroom)
        .get(uri + ':' + hashHelper(uri) + '?' + qs)
        .expect(403)
        .end(done)
    })
  })
})
