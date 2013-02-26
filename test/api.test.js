var darkroom = require('../server')()
  , request = require('supertest')


describe('API', function() {
  it('should not 404 on / route', function(done) {
    request(darkroom)
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
      request(darkroom)
        .post('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(done)
    })

    it('should upload multiple images', function (done) {
      request(darkroom)
        .post('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(done)
    })
  })
})