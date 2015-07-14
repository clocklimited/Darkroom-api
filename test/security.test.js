describe.skip('Api Security', function() {
  it('should fail on missing API token', function (done) {
    request(darkroom)
      .get('/')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(403)
      .end(done)
  })

  it('should fail on unknown API token', function (done) {
    request(darkroom)
      .get('/')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(403)
      .end(done)
  })
})
