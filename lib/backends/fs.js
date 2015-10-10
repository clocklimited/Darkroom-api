var createFileUpload = require('fileupload').createFileUpload
  , temp = require('temp')
  , restify = require('restify')
  , createFileAdaptor = require('../file-upload-adapter')

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
  cb(null, factory)
}
