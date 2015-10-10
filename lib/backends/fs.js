var createFileUpload = require('fileupload').createFileUpload
  , temp = require('temp')
  , restify = require('restify')
  , createFileAdaptor = require('../file-upload-adapter')
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf')

module.exports = function (config, cb) {
  var factory = {}
    , fileAdaptor = createFileAdaptor(config.paths.data(), config.log)

  temp.track()

  factory.streamUploadMiddleware = function(req, res, next) {

     var stream = temp.createWriteStream()

     req.on('end', function() {
       fileAdaptor.put(stream.path, function(err, file) {

         if (err) {
           if (err.name === 'SizeError') {
             next(new restify.BadDigestError(err.message))
           } else {
             return next(err)
           }
         }
         temp.cleanup()
         req.body = { file: [ file ] }
         next()
       })
     })

     req.on('error', next)
     req.pipe(stream)
   }

  factory.uploadMiddleware = createFileUpload({ adapter: fileAdaptor }).middleware

  factory.setup = function setup (cb) {
    try {
      mkdirp.sync(config.paths.data())
      mkdirp.sync(config.paths.cache())
    } catch (e) {
    }

    cb(null)
  }

  factory.clean = function clean (cb) {
    rimraf.sync(config.paths.data())
    rimraf.sync(config.paths.cache())
    cb(null)
  }

  cb(null, factory)
}
