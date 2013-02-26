var darkroom = require('../server')()
  , request = require('supertest')
  , should = require('should')


describe('API', function() {
  it('should not 404 on / route', function(done) {
    var r = request(darkroom)
      .get('/')
      .set('Accept', 'application/json')
      .set('X-Appication-Token', 'publicly-viewable')
      .set('X-Appication-Secret-Key', 'server-to-server')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(done)
  })

  describe('#upload', function() {
    it('should upload a single image', function (done) {
      var r = request(darkroom)
        .post('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(done)
    })

    it('should upload multiple images', function (done) {
      var r = request(darkroom)
        .post('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(done)
    })

    // it('should fail on missing API token', function (done) {
    //   var r = request(darkroom)
    //     .get('/')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(403)
    //     .end(done)
    // })

    // it('should fail on unknown API token', function (done) {
    //   var r = request(darkroom)
    //     .get('/')
    //     .set('Accept', 'application/json')
    //     .expect('Content-Type', /json/)
    //     .expect(403)
    //     .end(done)
    // })
  })

})