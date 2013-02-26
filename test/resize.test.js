var darkroom = require('../server')()
  , request = require('supertest')
  , should = require('should')


describe('Resize', function () {

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

  it('should return an object containing a src attribute on post request', function(done) {
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

  it('should return an object containing the specified dimension as an object key', function(done) {
    var r = request(darkroom)
      .post('/resize')
      .send({ src: 'http://img.clockte.ch/200x200.jpg?text=Image%20Resize\nTest'
        , sizes: [100]
        }
      )
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        res.body.results.should.have.length(1)
        res.should.be.a('object').and.has.property('100')
        r.app.close()
        done()
      })
  })

  it('should return an multiple images is multiple crops are requested', function(done) {
    var r = request(darkroom)
      .post('/resize')
      .send({ src: 'http://img.clockte.ch/200x200.jpg?text=Image%20Resize\nTest'
        , sizes: [ [100]
          , [150, 150]
          , { w: 50
            , h: 75
            }
          ]
        }
      )
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        res.body.results.should.have.length(1)
        res.should.be.a('object').and.has.property('100')
        r.app.close()
        done()
      })
  })

  it('should return an http error if resize dimension is less than zero', function(done) {
    var r = request(darkroom)
      .get('/resize')
      .send({ src: 'http://img.clockte.ch/200x200.jpg?text=Image%20Resize\nTest'
        , sizes: [-100, -50]
        }
      )
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400)
      .end(function (error, res) {
        if (error) return done(error)
        res.body.results.should.have.length(0)
        r.app.close()
        done()
      })
  })

  it('should return an http error if resize dimension is zero', function(done) {
    var r = request(darkroom)
      .get('/resize')
      .send({ src: 'http://img.clockte.ch/200x200.jpg?text=Image%20Resize\nTest'
        , sizes: [0,0]
        }
      )
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400)
      .end(function (error, res) {
        if (error) return done(error)
        res.body.results.should.have.length(0)
        r.app.close()
        done()
      })
  })

  it('should return an http error if resize dimension is larger than the src image', function(done) {
    var r = request(darkroom)
      .get('/resize')
      .send({ src: 'http://img.clockte.ch/200x200.jpg?text=Image%20Resize\nTest'
        , sizes: [1000]
        }
      )
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(400)
      .end(function (error, res) {
        if (error) return done(error)
        res.body.results.should.have.length(0)
        r.app.close()
        done()
      })
  })
})