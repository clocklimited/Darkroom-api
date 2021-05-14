const mockServiceLocator = require('./mock-service-locator')
const createDarkroom = require('../server')
const createBackendFactory = require('../lib/backend-factory-creator')
const request = require('supertest')
const path = '/blur'
const assert = require('assert')
const backends = require('./lib/backends')
const async = require('async')

backends().forEach(function (backend) {
  var config = backend.config

  describe('Blur ' + backend.name + ' backend', function () {
    var jpegId, pngId, darkroom, factory

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
      async.parallel(
        [
          (next) =>
            request(darkroom)
              .post('/')
              .set('x-darkroom-key', 'key')
              .set('Accept', 'application/json')
              .attach('file', 'test/fixtures/jpeg.jpeg')
              .end(function (err, res) {
                jpegId = res.body.id
                next()
              }),
          (next) =>
            request(darkroom)
              .post('/')
              .set('x-darkroom-key', 'key')
              .set('Accept', 'application/json')
              .attach('file', 'test/fixtures/png.png')
              .end(function (err, res) {
                pngId = res.body.id
                next()
              })
        ],
        done
      )
    })

    describe('FileTypes', function () {
      it('should return a working blur with a png', function (done) {
        request(darkroom)
          .post(path)
          .set('x-darkroom-key', 'key')
          .send({
            src: pngId,
            masks: [
              [
                [0, 100],
                [100, 100],
                [100, 0]
              ]
            ]
          })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (error, res) {
            if (error) return done(error)
            assert.strictEqual(Object.keys(res.body).length, 3)
            assert(res.body instanceof Object)
            assert.deepStrictEqual(res.body.src, pngId)
            assert.notDeepStrictEqual(res.body.id, pngId)
            assert.notDeepStrictEqual(res.body.id, undefined)
            done()
          })
      })

      it('should return a working blur with a jpeg', function (done) {
        request(darkroom)
          .post(path)
          .set('x-darkroom-key', 'key')
          .send({
            src: jpegId,
            masks: [
              [
                [0, 100],
                [100, 100],
                [100, 0]
              ]
            ]
          })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function (error, res) {
            if (error) return done(error)
            assert.strictEqual(Object.keys(res.body).length, 3)
            assert(res.body instanceof Object)
            assert.deepStrictEqual(res.body.src, jpegId)
            assert.notDeepStrictEqual(res.body.id, jpegId)
            assert.notDeepStrictEqual(res.body.id, undefined)
            done()
          })
      })
    })

    it('should succeed with src only', function (done) {
      request(darkroom)
        .post(path)
        .set('x-darkroom-key', 'key')
        .send({ src: jpegId })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(done)
    })

    it('should fail with invalid masks', function (done) {
      request(darkroom)
        .post(path)
        .set('x-darkroom-key', 'key')
        .send({ src: jpegId, masks: ['lmao'] })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400)
        .end(done)
    })

    it('should 404 with unknown asset', function (done) {
      request(darkroom)
        .post(path)
        .set('x-darkroom-key', 'key')
        .send({ src: 'abc123' })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(404)
        .end(done)
    })
  })
})
