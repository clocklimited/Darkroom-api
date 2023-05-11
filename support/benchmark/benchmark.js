/* eslint-disable no-console */
/*
GET Tests:
GET originals (data entries)
GET crops (cache entries)
Burst: 10, 100, 1000 simultaneous
Sustained: 10, 100, 1000 simultaneous for 30 seconds

Single Uploads:
100kb, 1mb, 10mb, 100mb files, 10x each
Parallel Uploads
10, 100, 1000 images individually (PUT)
1 x 10, 10 x 10, 100 x 10 images (POST) */

const createUploadBench = require('./upload')
const async = require('async')

const KB = 1024
const MB = KB * KB

const url = 'http://0.0.0.0:17999/'
const uploadTestIterations = 5
const getTestIterations = 5

const request = require('request')
const fs = require('fs')
const path = require('path')
const { key, salt } = require('../../locations.js')
const { exec } = require('child_process')
const { promisify } = require('util')

const setupGetData = (options) => () =>
  new Promise((resolve, reject) => {
    request.post(
      {
        url: options.url,
        headers: { 'x-darkroom-key': key },
        json: true,
        formData: {
          file: fs.createReadStream(
            path.join(__dirname, '../../test/fixtures/jpeg.jpeg')
          )
        }
      },
      async (err, res, body) => {
        if (err) {
          return reject(err)
        }
        if (res.statusCode !== 200) {
          err = new Error('Unexpected status code ' + res.statusCode)
          return reject(err)
        }
        const image = body
        const { stdout } = await promisify(exec)(
          `./support/authed-cli --host ${url.slice(
            0,
            url.lastIndexOf('/')
          )} --salt ${salt} -n  /original/${image.id}`
        )
        const imageUrl = stdout.trim()
        resolve({ imageUrl })
      }
    )
  })

const createGetBurstBench = ({ parallelConnections }) => ({ imageUrl }, cb) => {
  const getImage = (done) => {
    request.get(
      {
        url: imageUrl
      },
      async (err, res) => {
        if (err) {
          return done(err)
        }
        if (res.statusCode !== 200) {
          err = new Error('Unexpected status code ' + res.statusCode)
          return done(err)
        }
        done()
      }
    )
  }
  const requests = []

  for (let i = 0; i < parallelConnections; i++) {
    requests.push(getImage)
  }
  async.parallel(requests, (error) => {
    cb(error)
  })
}

const rpsCalculator = (reqs) => (results) => {
  const rps = results.map((result) => reqs / (result / 1000))
  const max = rps[0]
  const min = rps[rps.length - 1]
  const avg = rps.reduce((total, num) => total + num, 0) / rps.length

  console.log(
    `min: ${min.toFixed(2)}rps, max: ${max.toFixed(2)}rps, avg: ${avg.toFixed(
      2
    )}rps`
  )
}

const tests = [
  /* UPLOAD TESTS */
  test({
    name: '100kb',
    iterations: uploadTestIterations,
    testFn: createUploadBench({ url, size: 100 * KB })
  }),
  test('1mb', uploadTestIterations, createUploadBench({ url, size: MB })),
  test('10mb', uploadTestIterations, createUploadBench({ url, size: 10 * MB })),
  test(
    '100mb',
    // uploadTestIterations,
    0,
    createUploadBench({ url, size: 100 * MB })
  ),
  /* / UPLOAD TESTS */
  /* GET TESTS */
  test({
    name: 'GET Burst (data layer) 10x',
    iterations: getTestIterations,
    testFn: createGetBurstBench({ url, parallelConnections: 10 }),
    before: setupGetData({ url }),
    formatResults: rpsCalculator(10)
  }),
  test({
    name: 'GET Burst (data layer) 100x',
    iterations: getTestIterations,
    testFn: createGetBurstBench({ url, parallelConnections: 100 }),
    before: setupGetData({ url }),
    formatResults: rpsCalculator(100)
  }),
  test({
    name: 'GET Burst (data layer) 1000x',
    iterations: getTestIterations,
    testFn: createGetBurstBench({ url, parallelConnections: 1000 }),
    before: setupGetData({ url })
  })
  /* / GET TESTS */
]

;(async () => {
  console.log(`${test.length} tests to run, starting`)
  for (let runTest of tests) {
    await runTest()
  }
  console.log('Finished!')
})()

function timeAsync(fn, args) {
  return function (cb) {
    const start = Date.now()
    fn(args, function (err) {
      cb(err, Date.now() - start)
    })
  }
}

function test({ name, iterations, testFn, before, formatResults }) {
  return async () => {
    console.log(`Running test: ${name} - ${iterations} iterations`)
    const tests = []

    let testFnArgs = {}
    if (before) {
      try {
        testFnArgs = await before()
      } catch (error) {
        console.error('before() error', name, error)
      }
    }

    for (let i = 0; i < iterations; i++) {
      tests.push(timeAsync(testFn, testFnArgs))
    }

    const start = Date.now()
    let results
    try {
      results = await async.series(tests)
    } catch (error) {
      console.error('test run error', name, error)
      return
    }

    const runTime = Date.now() - start
    const sortedResults = results.sort()
    const min = sortedResults[0]
    const max = sortedResults[sortedResults.length - 1]
    const avg =
      sortedResults.reduce((total, num) => total + num, 0) / results.length
    console.log(`${name} - ${iterations} iterations took ${runTime}ms`)
    console.log(`min: ${min}ms, max: ${max}ms, avg: ${avg}ms`)
    console.log('Results', sortedResults)
    if (formatResults) {
      formatResults(sortedResults)
    }
    console.log('')
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason)
})
