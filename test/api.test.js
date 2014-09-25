var config = require('con.figure')(require('./config')())
  , darkroom = require('../server')(config)
  , request = require('supertest')
  , _ = require('lodash')
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf')

describe('API', function() {
  /**
   *  Currently does not have a 404 route
   */
  // it('should not 404 on / route', function(done) {
  //   request(darkroom)
  //     .get('/')
  //     .set('Accept', 'application/json')
  //     .set('X-Appication-Token', 'publicly-viewable')
  //     .set('X-Appication-Secret-Key', 'server-to-server')
  //     .expect('Content-Type', /json/)
  //     .expect(200)
  //     .end(done)
  // })

  before(function () {
    try {
      rimraf.sync(config.paths.data())
      rimraf.sync(config.paths.cache())
      mkdirp.sync(config.paths.data())
      mkdirp.sync(config.paths.cache())
    } catch (e) {
    }

  })

  describe('#get', function() {
    it('throw error for invalid token', function (done) {
      request(darkroom)
        .get('/info/WANG')
        .set('x-darkroom-key', 'key')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          res.statusCode.should.equal(404)
          done()
        })
    })
  })

  describe('#upload', function() {
    it('should upload a single image', function (done) {
      request(darkroom)
        .post('/')
        .set('x-darkroom-key', 'key')
        .set('Accept', 'application/json')
        .attach('file', 'test/fixtures/jpeg.jpeg')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          if (err) return done(err)
          res.body.should.have.property('src')
          done()
        })
    })

    it('should upload multiple images', function (done) {
      request(darkroom)
        .post('/')
        .set('x-darkroom-key', 'key')
        .attach('file', 'test/fixtures/jpeg.jpeg')
        .attach('file2', 'test/fixtures/png.png')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err)
          res.body.should.be.an.instanceOf(Array)
          _.each(res.body, function (file) {
            file.should.have.property('src')
          })
          done()
        })
    })
  })
})
