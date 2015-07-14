var config = require('con.figure')(require('./config')())
  , darkroom = require('../server')(config)
  , request = require('supertest')
  , path = '/circle'
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf')
  , assert = require('assert-diff')

describe('Circle', function() {
  var imgSrcId = null

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

  it('should return a new image src id for a circular cropped image', function(done) {
    request(darkroom)
      .post(path)
      .send({ src: imgSrcId })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)

        assert.deepEqual(res.body, { circleSrc: '68f70128d8146528c6c0488e9229c1ce' })

        done()
      })
  })

  it('allow you to pass in circular co-ordinates', function(done) {
    request(darkroom)
      .post(path)
      .send({ src: imgSrcId, x0: '100', y0: '100', x1: '0', y1: '0' })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)

        assert.deepEqual(res.body, { circleSrc: '1c2ecaee76ddbf169f76f3e29ca89936' })

        done()
      })
  })

  it('allow you to pass in a background colour', function(done) {
    request(darkroom)
      .post(path)
      .send({ src: imgSrcId, colour: '#9966FF' })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)

        assert.deepEqual(res.body, { circleSrc: '1c2ecaee76ddbf169f76f3e29ca89936' })

        done()
      })
  })
})
