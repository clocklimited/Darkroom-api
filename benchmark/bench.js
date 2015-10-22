var createUploadBench = require('./upload')
  , async = require('async')
  , n = 20
  , ConsoleHistogram = require('console-histogram')

async.series(
  [ test('Small 100kb', n, createUploadBench({ url: 'http://0.0.0.0:17999/', size: 10 }))
  , test('Medium 500kb', n, createUploadBench({ url: 'http://0.0.0.0:17999/', size: 500000 }))
  , test('Large 1mb', n, createUploadBench({ url: 'http://0.0.0.0:17999/', size: 10000000 }))
  ])

function timeAsync(fn) {
  return function (cb) {
    var start = Date.now()
    fn(function (err) {
      cb(err, Date.now() - start)
    })
  }
}

function test (name, count, testFn) {
  return function (cb) {
    var start
    , tests = []
    , consoleHistogram = new ConsoleHistogram({ binSize: 5, xLabel: 'upload', yLabel: 'ms' })

    for (var i = 0; i < count; i++) {

      tests.push(timeAsync(testFn))
    }

    start = Date.now()
    async.series(tests, function (err, results) {
      if (err) return console.error(err)

      results.map(consoleHistogram.crunch.bind(consoleHistogram))
      console.log('%s %d, cycles took %dms'
        , name, count, Date.now() - start)
      consoleHistogram.print()
      consoleHistogram.printAverage()
      console.log('Results')
      bar(results)
      cb()
    })
  }
}

function bar(values) {
  var max = Math.max.apply(null, values)
    , ratio = (process.stdout.columns / 1.5) / max
    , maxDigitLength = ('' + max).length
    , i = 1

  values.forEach(function (value) {
    var length = Math.floor(value * ratio)
    console.log( ('   ' + i).substr(-maxDigitLength) + ' | ' + Array(length).join('-') + ' ' + value)
    i += 1
  })
}
