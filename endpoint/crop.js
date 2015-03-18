var darkroom = require('darkroom')
  , _ = require('lodash')
  , dp = require('darkroom-persistence')
  , StoreStream = dp.StoreStream
  , retrieve = dp.RetrieveStream
  , path = require('path')
  , filePath = require('../lib/file-path')
  , url = require('url')
  , mkdirp = require('mkdirp')
  , async = require('async')
  , restify = require('restify')
  , dataHasher = require('../lib/data-hasher')

module.exports = function (config) {
  return function (req, res, next) {
    req.body = JSON.parse(req.body)

    var srcUrl = url.parse(req.body.src).path.split('/')
    req.params.data = srcUrl[srcUrl.length - 1]

    req.params.path = path.join(config.paths.data(), req.params.data.substring(0, 3), req.params.data)
    req.body.crops = !_.isArray(req.body.crops) ? [ req.body.crops ] : req.body.crops

    if (req.params.crops === undefined) return next(new restify.BadDigestError(
      'Crops are undefined'
    ))

    req.log.info({ id: req.requestId }, 'Crop Request made for image: ' + req.params.path + ' with ' + req.params.crops.length + ' crops')
    req.log.info({ id: req.requestId }, 'Crop Info: ' + JSON.stringify(req.params.crops))

    var collection = {} // new CollectionStream(Object.keys(crops).length)
      // , dataSource = retrieve(_.extend(req.params, { url: req.body.src }), { isFile: true })

    // Currently resize images only deals with pngs
    // res.set('Content-Type', 'image/png')

    var cropCount = 1

    async.eachSeries(req.params.crops, function (data, callback) {
      data.data = req.params.data
      var folderLocation = filePath(data, config.paths.data())
        , fileLocation = path.join(folderLocation, dataHasher(data))

      req.log.info({ id: req.requestId }, 'Creating crop ' + cropCount + ': ' + fileLocation)

      mkdirp(folderLocation, function() {
        var store = new StoreStream(fileLocation)
          , crop = new darkroom.Crop()

        store.once('error', function (error) {
          req.log.error({ id: req.requestId }, 'StoreStream:', error)
          callback(error)
        })

        // changed from “once” to “on” because with “once” the server would crash on an error
        crop.on('error', function (error) {
          req.log.error({ id: req.requestId }, 'Crop', error)
          callback(error)
        })

        store.once('end', function () {
          var values = []
            , key = null
          for (key in data) {
            values.push(data[key])
          }

          // delete values[data.data]
          // console.log(collection)

          key = values.join(':')
          collection[key] = path.basename(fileLocation)
          req.log.info({ id: req.requestId }, 'Successfully created crop ' + cropCount + ': ' + fileLocation)
          cropCount++
          callback()
        })

        retrieve(_.extend(req.params, { url: req.body.src }), { isFile: true })
          .pipe(crop)
          .pipe(store
            , { crop: data
              }
          )
      })
    }, function (error) {
      if (error) {
        req.log.error({ id: req.requestId }, error)
        return next(new restify.BadDigestError(error.message))
      } else {
        res.json(collection)
        return next()
      }
    })
  }
}
