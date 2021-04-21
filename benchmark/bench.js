/* eslint-disable no-console */
const createUploadBench = require('./upload')
const async = require('async')
const n = 5
const ConsoleHistogram = require('console-histogram')

async.series([
  test(
    'Small 100kb',
    n,
    createUploadBench({ url: 'http://0.0.0.0:17999/', size: 10 })
  ),
  test(
    'Medium 500kb',
    n,
    createUploadBench({ url: 'http://0.0.0.0:17999/', size: 500000 })
  ),
  test(
    'Large 1mb',
    n,
    createUploadBench({ url: 'http://0.0.0.0:17999/', size: 10000000 })
  )
])

function timeAsync(fn) {
  return function (cb) {
    const start = Date.now()
    fn(function (err) {
      cb(err, Date.now() - start)
    })
  }
}

function test(name, count, testFn) {
  return function (cb) {
    const tests = []
    const consoleHistogram = new ConsoleHistogram({
      binSize: 5,
      xLabel: 'upload',
      yLabel: 'ms'
    })

    for (let i = 0; i < count; i++) {
      tests.push(timeAsync(testFn))
    }

    const start = Date.now()
    async.series(tests, function (err, results) {
      if (err) return console.error(err)

      results.map(consoleHistogram.crunch.bind(consoleHistogram))
      console.log('%s %d, cycles took %dms', name, count, Date.now() - start)
      consoleHistogram.print()
      consoleHistogram.printAverage()
      console.log('Results')
      bar(results)
      cb()
    })
  }
}

// what in tarnation
function average(list, newLength) {
  const listRatio = newLength / list.length
  const result = []
  let c = 0
  let x = 0
  let e = 0

  for (let i = 0; i < newLength; i += 1) {
    c = 0
    x = 0
    for (
      e = Math.ceil(i / listRatio);
      e < Math.ceil((i + 1) / listRatio);
      e += 1
    ) {
      x += 1
      c += list[e]
    }

    result.push(c / x || 0)
  }

  return result
}

function bar(values) {
  const max = Math.max.apply(null, values)
  const ratio = process.stdout.columns / 1.5 / max
  const maxDigitLength = ('' + max).length
  const scaledValues = average(values, Math.max(process.stdout.rows - 1, 20))
  let i = 1

  scaledValues.forEach(function (value) {
    const length = Math.floor(value * ratio)
    console.log(
      ('         ' + i).substr(-maxDigitLength - 1) +
        ' | ' +
        new Array(length).join('-') +
        ' ' +
        value
    )
    i += 1
  })
}
