var darkroom = require('../server')()
  , request = require('supertest')
  , path = '/composite'
  , imgSrcId = null

before(function (done) {
  request(darkroom)
    .post('/')
    .set('x-darkroom-key', '{KEY}')
    .set('Accept', 'application/json')
    .attach('file', 'test/fixtures/jpeg.jpeg')
    .end(function (err, res) {
      imgSrcId = res.body.src
      done()
    })
})

describe('Composite', function() {

  it('should return a new image src id for a composite image', function(done) {
      var r = request(darkroom)
        .post(path)
        .send(
          { baseSrc: imgSrcId
          , topSrc: imgSrcId
          , opacityPercentage: '25'
          }
        )
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          Object.keys(res.body).should.have.length(1)
          res.body.should.be.a('object')
          res.body.should.have.property('compositeSrc')
          res.body.compositeSrc.should.equal('4857b83aa4dfc601f7d35e1546d17299')
          r.app.close()
          done()
        })
    })

})
