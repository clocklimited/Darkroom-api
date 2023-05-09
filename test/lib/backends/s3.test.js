const tests = require('./backend-tests')
const backends = require('./index')

describe('S3 Backend', function () {
  tests(backends().find(({ name }) => name === 'S3'))
})
