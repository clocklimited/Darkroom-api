var config = require('con.figure')(require('./config')())
  , darkroom = require('../server')(config)
  , request = require('supertest')
  , path = '/crop'
  , rimraf = require('rimraf')
  , mkdirp = require('mkdirp')

describe('Crop', function() {
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
          Object.keys(res.body).should.have.length(1)
          res.body.should.be.instanceOf(Object)
          res.body.should.have.property('10:100:100:100:100:200:' + imgSrcId)
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
          Object.keys(res.body).should.have.length(1)
          res.body.should.be.instanceOf(Object)
          res.body.should.have.property('10:100:100:100:100:200:' + imgSrcId)
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
        res.body.should.be.instanceOf(Object)
        res.body.should.have.property('10:100:100:100:100:200:' + imgSrcId)
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
