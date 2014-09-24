var config = require('con.figure')(require('./config')())
  , darkroom = require('../server')(config)
  , request = require('supertest')
  , path = '/watermark'
  , imgSrcId = null

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

describe('Watermark', function() {

  it('should not require a opacity', function(done) {
    var r = request(darkroom)
      .post(path)
      .send(
        { baseSrc: imgSrcId
        , watermarkSrc: imgSrcId
        }
      )
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        done()
      })
  })

  // it('should 400 on bad base source', function(done) {
  //   var r = request(darkroom)
  //     .post(path)
  //     .send(
  //       { baseSrc: 'BAD'
  //       , watermarkSrc: imgSrcId
  //       , opacityPercentage: 25
  //       }
  //     )
  //     .set('Accept', 'application/json')
  //     .expect('Content-Type', /json/)
  //     .expect(400)
  //     .end(function (error, res) {
  //       if (error) return done(error)
  //       done()
  //     })
  // })

  // it('should 400 on bad watermark source', function(done) {
  //   var r = request(darkroom)
  //     .post(path)
  //     .send(
  //       { baseSrc: imgSrcId
  //       , watermarkSrc: 'bad'
  //       , opacityPercentage: 25
  //       }
  //     )
  //     .set('Accept', 'application/json')
  //     .expect('Content-Type', /json/)
  //     .expect(400)
  //     .end(function (error, res) {
  //       if (error) return done(error)
  //       done()
  //     })
  // })

  it('should return a new image src id for a watermarked image', function(done) {
    var r = request(darkroom)
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
        r.app.close()
        done()
      })
  })
})
