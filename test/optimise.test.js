var darkroom = require('../server')()
  , request = require('supertest')
  , should = require('should')

describe('Optimise', function () {
  describe('FileTypes', function () {
    it('should return a working crop with a png', function(done) {
      var r = request(darkroom)
        .post('/resize')
        .send({ src: 'http://img.clockte.ch/200x200.png?text=Image%20Resize\nTest'
          , sizes: [100, 100]
          }
        )
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          res.body.results.should.have.length(1)
          res.should.be.a('object').and.has.property('100x100')
          r.app.close()
          done()
        })
    })

    it('should return a working crop with a jpeg', function(done) {
      var r = request(darkroom)
        .post('/resize')
        .send({ src: 'http://img.clockte.ch/200x200.jpg?text=Image%20Resize\nTest'
          , sizes: [100, 100]
          }
        )
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function (error, res) {
          if (error) return done(error)
          res.body.results.should.have.length(1)
          res.should.be.a('object').and.has.property('100x100')
          r.app.close()
          done()
        })
    })
  })
})