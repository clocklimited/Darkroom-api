var request = require('supertest')
  , createBackendFactory = require('../lib/backend-factory-creator')
  , fs = require('fs')
  , assert = require('assert')
  , async = require('async')
  , backends = require('./lib/backends')
  , hashHelper = require('./hash-helper')
  , gm = require('gm')
  , fixture = '/fixtures/gif.gif'

backends().forEach(function (backend) {
  var config = backend.config

  describe('API ' + backend.name + ' backend', function() {

    var createDarkroom = require('../server')
      , darkroom
      , factory

    before(function (done) {
			if (!fs.existsSync('test/samples')){
				fs.mkdirSync('test/samples');
			}
			createBackendFactory(config, function (err, backendFactory) {
				factory = backendFactory
				darkroom = createDarkroom(config, factory)
				done()
			})
    })

    function clean(done) {
			async.series([ factory.clean, factory.setup ], done)
    }

		function assertImageEqual(actualfilePath, expectedfilePath, cb) {
			gm.compare(actualfilePath, expectedfilePath, 0.01, function (err, isEqual) {
				if (err) return cb(err)
				assert(isEqual, 'Generated image should match the image fixture')
				cb()
			})
		}

    before(clean)
    after(clean)

    describe('#upload', function() {
      var imgSrcId
			it('should upload a single image via PUT', function (done) {
        var originalEnd
          , req = request(darkroom).put('/')
            .set('x-darkroom-key', 'key')
            .set('Accept', 'application/json')

        originalEnd = req.end
        req.end = function() {}

        var stream = fs.createReadStream(__dirname + fixture)

        stream.pipe(req)

        stream.on('end', function() {
          originalEnd.call(req, function(err, res) {
            assert.equal(res.statusCode, 200, res.text)
            assert(res.body.id !== undefined)
            assert.equal(res.body.type, 'image/gif; charset=binary')
            imgSrcId = res.body.id
            done()
          })
        })
      })

			it('should resize /500/500/:url to fit', function (done) {
				var uri = '/500/500/' + imgSrcId
					, url = uri + ':' + hashHelper(uri)

				request(darkroom)
					.get(url)
					.expect(200)
					.end(function (error, res) {
						if (error) return done(error)
						fs.writeFile(__dirname + '/samples/resize.gif', res.body, 'binary', function (err) {
							if (err) done(err)
							assertImageEqual(__dirname + '/samples/resize.gif', __dirname + fixture, done)
						})
					})
		  })

			it('should return an image if the image exists', function(done) {
				var uri = '/original/' + imgSrcId
					, url = uri + ':' + hashHelper(uri)

				request(darkroom)
					.get(url)
					.expect(200)
					.end(function (error, res) {
						if (error) return done(error)
							fs.writeFile(__dirname + '/samples/original.gif', res.body, 'binary', function(err) {
								if (err) throw err
                done()
							})
					})
			})
    })
  })
})
