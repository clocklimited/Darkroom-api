const mockServiceLocator = require('./mock-service-locator')
const createDarkroom = require('../server')
const createBackendFactory = require('../lib/backend-factory-creator')
const request = require('supertest')
const path = '/crop'
const assert = require('assert')
const backends = require('./lib/backends')

backends().forEach(function (backend) {
  var config = backend.config

  describe('Crop ' + backend.name + ' backend', function () {
    var imgSrcId, darkroom, factory

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
        .attach('file', 'test/fixtures/jpeg.jpeg')
        .end(function (err, res) {
          imgSrcId = res.body.id
          done()
        })
    })

    describe('FileTypes', function () {
      it('should return a working crop with a png', function (done) {
        request(darkroom)
          .post(path)
          .send({
            src: imgSrcId,
            crops: [{ x1: 10, x2: 100, y1: 100, y2: 100, w: 100, h: 200 }]
          })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (error, res) {
            if (error) return done(error)
            assert.strictEqual(Object.keys(res.body).length, 1)
            assert(res.body instanceof Object)
            assert(res.body['10:100:100:100:100:200:' + imgSrcId] !== undefined)
            done()
          })
      })

      it('should return a working crop with a jpeg', function (done) {
        request(darkroom)
          .post(path)
          .send({
            src: imgSrcId,
            crops: [{ x1: 10, x2: 100, y1: 100, y2: 100, w: 100, h: 200 }]
          })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (error, res) {
            if (error) return done(error)
            assert.strictEqual(Object.keys(res.body).length, 1)
            assert(res.body instanceof Object)
            assert(res.body['10:100:100:100:100:200:' + imgSrcId] !== undefined)
            done()
          })
      })
    })

    it('should return an object containing the specified dimensions as object keys', function (done) {
      var body = {
        src: imgSrcId,
        crops: [{ x1: 10, x2: 100, y1: 100, y2: 100, w: 100, h: 200 }]
      }
      request(darkroom)
        .post(path)
        .send(body)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          assert.strictEqual(Object.keys(res.body).length, 1)
          assert(res.body instanceof Object)
          assert(
            !(res.body['10:100:100:100:100:200:' + imgSrcId] instanceof Object)
          )
          done()
        })
    })

    it('should return a http error if sizes not provided', function (done) {
      request(darkroom)
        .post(path)
        .send({ src: '3bec4be4b95328cb281a47429c8aed8e' })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400)
        .end(done)
    })

    it('should not return an error if not all crop dimensions are specified', function (done) {
      var body = {
        src: imgSrcId,
        crops: [
          {
            x1: 10,
            x2: 100,
            // , y1: 100
            // , y2: 100
            w: 100,
            h: 200
          }
        ]
      }

      request(darkroom)
        .post(path)
        .send(body)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          assert.strictEqual(
            res.body['10:100:100:200:' + imgSrcId],
            'd29f9f855f8b11f71264f8850619b305'
          )
          done()
        })
    })
  })
})
