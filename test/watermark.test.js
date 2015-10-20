var config = require('con.figure')(require('./config')())
  , createDarkroom = require('../server')
  , createBackendFactory = require('../lib/backend-factory-creator')
  , request = require('supertest')
  , path = '/watermark'
  , async = require('async')

// This is skipped because `darkroom` doesn't have a streamy interface for this yet.
describe.skip('Watermark', function() {
  var  imgSrcId = null
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
        imgSrcId = res.body.id
        done(err)
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
        done(error)
      })
  })
})
