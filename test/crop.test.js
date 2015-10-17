var config = require('con.figure')(require('./config')())
  , createDarkroom = require('../server')
  , createBackendFactory = require('../lib/backend-factory-creator')
  , request = require('supertest')
  , path = '/crop'
  , async = require('async')
  , assert = require('assert')

describe('Crop', function() {
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

  describe('FileTypes', function () {
    it('should return a working crop with a png', function(done) {
      request(darkroom)
        .post(path)
        .send(
          { src: imgSrcId
          , crops: [
              { x1: 10
              , x2: 100
              , y1: 100
              , y2: 100
              , w: 100
              , h: 200
              }
            ]
          }
        )
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          assert.equal(Object.keys(res.body).length, 1)
          assert(res.body instanceof Object)
          assert(res.body['10:100:100:100:100:200:' + imgSrcId] !== undefined)
          done()
        })
    })

    it('should return a working crop with a jpeg', function(done) {
      request(darkroom)
        .post(path)
        .send(
          { src: imgSrcId
          , crops: [
              { x1: 10
              , x2: 100
              , y1: 100
              , y2: 100
              , w: 100
              , h: 200
              }
            ]
          }
        )
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          assert.equal(Object.keys(res.body).length, 1)
          assert(res.body instanceof Object)
          assert(res.body['10:100:100:100:100:200:' + imgSrcId] !== undefined)
          done()
        })
    })
  })

  it('should return an object containing the specified dimensions as object keys', function(done) {
    var body =
      { src: imgSrcId
      , crops: [
          { x1: 10
          , x2: 100
          , y1: 100
          , y2: 100
          , w: 100
          , h: 200
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
        assert.equal(Object.keys(res.body).length, 1)
        assert(res.body instanceof Object)
        assert(res.body['10:100:100:100:100:200:' + imgSrcId] !== undefined)
        done()
      })
  })

  it('should return a http error if sizes not provided', function(done) {
    request(darkroom)
      .post(path)
      .send({ src: '3bec4be4b95328cb281a47429c8aed8e' })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400)
      .end(done)
  })

  it('should not return an error if not all crop dimensions are specified', function(done) {
    var body =
      { src: imgSrcId
      , crops: [
          { x1: 10
          , x2: 100
          // , y1: 100
          // , y2: 100
          , w: 100
          , h: 200
          }
        ]
      }

      request(darkroom)
        .post(path)
        .send(body)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (error) {
          if (error) return done(error)
          // TODO add tests for returned error message?
          // res.body.results.should.have.length(0)
          done()
        })

  })
})
