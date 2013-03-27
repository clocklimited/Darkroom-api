var darkroom = require('darkroom')
  // , config = require('con.figure')(require('./config')())
  // , upload = require('fileupload').createFileUpload(__dirname + '/../images')
  , _ = require('lodash')
  , request = require('request')
  , StoreStream = require('darkroom-persistance').StoreStream
  , CollectionStream = require('darkroom-persistance').CollectionStream

module.exports = function (req, res, next) {

  var src = req.body.src

  // Currently resize images only deals with pngs
  res.set('Content-Type', 'image/png')

  var crop = new darkroom.crop()
  , store = new StoreStream(__dirname, '/../image')
  , collection = new CollectionStream(Object.keys(src).length)
  // upload
    // .getAsReadStream(req.params.data + '/image')
  request(req.params.data)
    .pipe(crop)
    .pipe(store,
      { crops: req.params.crops
      }
    )
    .pipe(collection)

  store.on('end', function (chunk) {
    console.log('end!', chunk)
  })

  store.on('data', function (chunk) {
    console.log('data!', chunk)
  })

  collection.on('end', function() {
    return next()
  })
}