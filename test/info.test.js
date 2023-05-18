const mockServiceLocator = require('./mock-service-locator')
const assert = require('assert')
const createDarkroom = require('../server')
const createBackendFactory = require('../lib/backend-factory-creator')
const request = require('supertest')
const hashHelper = require('./hash-helper')
const backends = require('./lib/backends')
const closeEnough = require('./lib/close-enough')

backends().forEach(function (backend) {
  var config = backend.config

  describe('Info ' + backend.name + ' backend', function () {
    let imgSrcId, imgUploadDate
    let nonImgSrcId, nonImgUploadDate
    let darkroom, factory

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
          imgUploadDate = res.headers.date
          done(err)
        })
    })

    before(function (done) {
      request(darkroom)
        .post('/')
        .set('x-darkroom-key', 'key')
        .set('Accept', 'application/json')
        .attach('file', 'test/fixtures/test.txt')
        .end(function (err, res) {
          nonImgSrcId = res.body.id
          nonImgUploadDate = res.headers.date
          done(err)
        })
    })

    it('should return info from an existing image', function (done) {
      var uri = '/info/' + imgSrcId,
        url = uri + ':' + hashHelper(uri)
      request(darkroom)
        .get(url)
        .expect(200)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .end(function (error, res) {
          const { lastModified, ...body } = JSON.parse(res.text)

          assert.deepStrictEqual(body, {
            width: 500,
            height: 375,
            size: 104680,
            type: 'image/jpeg; charset=binary'
          })
          assert(closeEnough(lastModified, imgUploadDate))
          done(error)
        })
    })

    it('should return info from a non-image entity', function (done) {
      var uri = '/info/' + nonImgSrcId,
        url = uri + ':' + hashHelper(uri)
      request(darkroom)
        .get(url)
        .expect(200)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .end(function (error, res) {
          const { lastModified, ...body } = JSON.parse(res.text)

          assert.deepStrictEqual(body, {
            size: 6,
            type: 'text/plain; charset=us-ascii'
          })
          assert(closeEnough(lastModified, nonImgUploadDate))
          done(error)
        })
    })

    it('should 404 if image is not found', function (done) {
      var uri = '/info/f3205aa9a406642cff624998ccc4dd78',
        url = uri + ':' + hashHelper(uri)
      request(darkroom)
        .get(url)
        .expect(404)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .end(done)
    })
  })
})
