var createUploadBench = require('./upload')
  , async = require('async')
  , n = 5
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

function average(list, newLength) {
  var y = newLength / list.length
    , i = 0
    , c = 0
    , r = []
    , x = 0
    , e = 0

  for (i = 0; i < newLength; i += 1) {
    c = 0
    x = 0
    for (e = Math.ceil(i / y); e < Math.ceil((i + 1) / y); e += 1) {
      x += 1
      c += list[e]
    }

    r.push(c / x)
  }

  return r
}


function bar(values) {
  var max = Math.max.apply(null, values)
    , ratio = (process.stdout.columns / 1.5) / max
    , maxDigitLength = ('' + max).length
    , i = 1
    , scaledValues = average(values, Math.max(process.stdout.rows - 1, 20))
  scaledValues.forEach(function (value, index) {
    var length = Math.floor(value * ratio)
    console.log(('         ' + i).substr(-maxDigitLength - 1) + ' | ' + Array(length).join('-') + ' ' + value)
    i += 1
  })
}
