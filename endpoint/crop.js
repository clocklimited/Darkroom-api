var darkroom = require('darkroom')
  // , config = require('con.figure')(require('./config')())
  // , upload = require('fileupload').createFileUpload(__dirname + '/../images')
  , request = require('request')
  , dp = require('darkroom-persistance')
  , StoreStream = dp.StoreStream
  , CollectionStream = dp.CollectionStream
  , retrieve = dp.RetrieveStream
  , stream = require('stream')
  , fs = require('fs')

module.exports = function (req, res, next) {

  var src = req.body.src
    , collection = new CollectionStream(Object.keys(src).length)

  // Currently resize images only deals with pngs
  res.set('Content-Type', 'image/png')

  fs.exists(req.params.path, function (exists) {
    var crop = new darkroom.crop()
      , store = exists ? new stream.PassThrough() : new StoreStream(req.params.path)

    store.on('error', function (error) {
      req.log.error('StoreStream:', error.message)
    })

    retrieve(req.params)
      .pipe(crop)
      .pipe(store,
        { crops: req.params.crops
        }
      )
      .pipe(collection)
  })

  collection.on('end', function() {
    res.json(collection.toJSON())
    return next()
  })
}