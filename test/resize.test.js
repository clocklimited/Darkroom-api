var darkroom = require('../server')()
  , request = require('supertest')
  , should = require('should')


describe('Resize', function() {
  describe('#scaleAndResize', function() {
    it('should return an object containing a src attribute', function(done) {
      var r = request(darkroom)
        .get('/resize')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          res.body.results.should.have.length(1)
          res.should.be.a('object').and.has.property('src')
          r.app.close()
          done()
        })
    })
  })
})