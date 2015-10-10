var config = require('con.figure')(require('./config')())
  , createDarkroom = require('../server')
  , createBackendFactory = require('../lib/backend-factory-creator')
  , request = require('supertest')
  , path = '/watermark'
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf')

describe('Watermark', function() {
  var  imgSrcId = null
    , darkroom

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
    createBackendFactory(config, function (err, factory) {
      darkroom = createDarkroom(config, factory)
      done()
    })
  })

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

  it('should not require a opacity', function(done) {
    request(darkroom)
      .post(path)
      .send(
        { baseSrc: imgSrcId
        , watermarkSrc: imgSrcId
        }
      )
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(done)
  })

  it('should return a new image src id for a watermarked image', function(done) {
    request(darkroom)
      .post(path)
      .send(
        { baseSrc: imgSrcId
        , watermarkSrc: imgSrcId
        , opacityPercentage: 25
        }
      )
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        Object.keys(res.body).should.have.length(1)
        res.body.should.be.instanceOf(Object)
        res.body.should.have.property('compositeSrc')
        res.body.compositeSrc.should.equal('06f3eeff749dbe47fdd2ebae5d2adf23')
        done()
      })
  })
})
