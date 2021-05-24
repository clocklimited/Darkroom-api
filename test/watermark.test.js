const mockServiceLocator = require('./mock-service-locator')
const config = require('con.figure')(require('./config')())
const createDarkroom = require('../server')
const createBackendFactory = require('../lib/backend-factory-creator')
const request = require('supertest')
const path = '/watermark'

// This is skipped because `darkroom` doesn't have a streamy interface for this yet.
describe.skip('Watermark', function () {
  let imgSrcId = null
  let darkroom
  let factory

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
        done(err)
      })
  })

  it('should not require a opacity', function (done) {
    request(darkroom)
      .post(path)
      .send({ baseSrc: imgSrcId, watermarkSrc: imgSrcId })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(done)
  })

  it('should return a new image src id for a watermarked image', function (done) {
    request(darkroom)
      .post(path)
      .send({
        baseSrc: imgSrcId,
        watermarkSrc: imgSrcId,
        opacityPercentage: 25
      })
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
