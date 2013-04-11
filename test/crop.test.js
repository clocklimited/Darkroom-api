var darkroom = require('../server')()
  , request = require('supertest')
  , async = require('async')
  , _ = require('lodash')
  , path = '/crop'

describe('Crop', function() {
  describe('FileTypes', function () {
    it('should return a working crop with a png', function(done) {
      var r = request(darkroom)
        .post(path)
        .send(
          { src: '3bec4be4b95328cb281a47429c8aed8e'
          , crops: [
              { x1: 10
              , x2: 100
              , y1: 100
              , y2: 100
              , w: 100
              , h: 200
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
          res.body.should.be.a('object').and.has.property('100x100')
          r.app.close()
          done()
        })
    })

    it('should return a working crop with a jpeg', function(done) {
      var r = request(darkroom)
        .post(path)
        .send(
          { src: '3bec4be4b95328cb281a47429c8aed8e'
          , crops: [
              { x1: 10
              , x2: 100
              , y1: 100
              , y2: 100
              , w: 100
              , h: 200
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
          res.body.should.be.a('object').and.has.property('100x100')
          r.app.close()
          done()
        })
    })
  })

  it('should return an object containing the specified dimensions as object keys', function(done) {
    var body =
      { src: '3bec4be4b95328cb281a47429c8aed8e'
      , crops: [
          { x1: 10
          , x2: 100
          , y1: 100
          , y2: 100
          , w: 100
          , h: 200
          }
        ]
      }

    var r = request(darkroom)
      .post(path)
      .send(body)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (error, res) {
        if (error) return done(error)
        res.should.be.a('object')
        res.should.have.property('200x400')
        res.should.have.property('100x200')
        res.should.have.property('50')
        r.app.close()
        done()
      })
  })

  it('should return a http error if sizes not provided', function(done) {
    var r = request(darkroom)
      .get(path)
      .send({ src: '3bec4be4b95328cb281a47429c8aed8e' })
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

  it('should return an error if not all crop dimensions are specified', function(done) {
    var body =
      { src: '3bec4be4b95328cb281a47429c8aed8e'
      , crops: [
          { x1: 10
          , x2: 100
          // , y1: 100
          // , y2: 100
          , w: 100
          , h: 200
          }
        ]
      }

      var r = request(darkroom)
        .get(path)
        .send(body)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400)
        .end(function (error, res) {
          if (error) return done(error)
          // TODO add tests for returned error message?
          res.body.results.should.have.length(0)
          r.app.close()
          done()
        })

  })
})