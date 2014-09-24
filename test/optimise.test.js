var darkroom = require('../server')()
  , request = require('supertest')
  // , should = require('should')

describe('Optimise', function () {
  describe('FileTypes', function () {
    it('should return a working optimised image with a png', function(done) {
      var r = request(darkroom)
        .get('/optimise/http://localhost/test.png')
        .set('Accept', 'image/png')
        .expect('Content-Type', 'image/png')
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          res.body.results.should.have.length(1)
          res.headers.should.be.instanceOf(Object).and.has.property('100x100')
          r.app.close()
          done()
        })
    })

    it('should return a working crop with a jpeg', function(done) {
      var r = request(darkroom)
        .get('/optimise/http://localhost/test.jpeg')
        .set('Accept', 'image/jpeg')
        .expect('Content-Type', 'image/jpeg')
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          res.body.results.should.have.length(1)
          res.should.be.instanceOf(Object).and.has.property('100x100')
          r.app.close()
          done()
        })
    })
  })

  it('should reduce the original image size for a jpeg', function(done) {
    var r = request(darkroom)
      .get('/optimise/10/http://localhost/test.jpeg')
      .set('Accept', 'image/jpeg')
      .expect('Content-Type', 'image/jpeg')
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        res.body.results.should.have.length(1)
        res.should.be.instanceOf(Object).and.has.property('100x100')
        r.app.close()
        done()
      })
  })

  it('should reduce the original image size for a png', function(done) {
    var fixture = 'lint'
    var r = request(darkroom)
      .get('/optimise/10/http://localhost/test.png')
      .set('Accept', 'image/png')
      .expect('Content-Type', 'image/png')
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        (res.body.length < fixture.length).should.not.be.false
        r.app.close()
        done()
      })
  })
})