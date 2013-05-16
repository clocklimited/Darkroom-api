var darkroom = require('darkroom')
  , config = require('con.figure')(require('../config')())
  , _ = require('lodash')
  , dp = require('darkroom-persistance')
  , StoreStream = dp.StoreStream
  , CollectionStream = dp.CollectionStream
  , retrieve = dp.RetrieveStream
  , stream = require('stream')
  , fs = require('fs')
  , path = require('path')
  , filePath = require('../lib/filePath')
  , url = require('url')
  , mkdirp = require('mkdirp')
  , async = require('async')
  , restify = require('restify')

module.exports = function (req, res, next) {
  req.body = JSON.parse(req.body)

  var srcUrl = url.parse(req.body.src).path.split('/')
  req.params.data = srcUrl[srcUrl.length - 1]

  req.params.path = path.join(config.paths.data(), req.params.data, 'image')
  req.body.crops = !_.isArray(req.body.crops) ? [req.body.crops] : req.body.crops

  if (req.params.crops === undefined) return next(new restify.BadDigestError(
    'Crops are undefined'
  ))

  var collection = {} // new CollectionStream(Object.keys(crops).length)
    // , dataSource = retrieve(_.extend(req.params, { url: req.body.src }), { isFile: true })

  // Currently resize images only deals with pngs
  // res.set('Content-Type', 'image/png')

  async.eachSeries(req.params.crops, function (data, callback) {
    data.data = req.params.data
    var folderLocation = filePath(data, config.paths.data())
      , fileLocation = path.join(folderLocation, 'image')

    mkdirp(folderLocation, function() {
      var store = new StoreStream(fileLocation)
        , crop = new darkroom.crop()

      store.once('error', function (error) {
        req.log.error('StoreStream:', error)
        callback(error)
      })

      crop.once('error', function (error) {
        req.log.error('Crop', error)
        callback(error)
      })

      store.once('end', function () {
        var values = []
          , key = null
        for(key in data) {
          values.push(data[key])
        }

        // delete values[data.data]
        // console.log(collection)

        key = values.join(':')
        collection[key] = path.basename(folderLocation)
        callback()
      })

      retrieve(_.extend(req.params, { url: req.body.src }), { isFile: true })
        .pipe(crop)
        .pipe(store,
          { crop: data
          }
        )
    })
  }, function (error) {
    if (error) {
      req.log.error(error)
      return next(new restify.BadDigestError(error.message))
    } else {
      res.json(collection)
      return next()
    }
  })
}