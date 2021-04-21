const config = require('con.figure')(require('./config')())
const restify = require('restify')
const server = restify.createServer()
const request = require('supertest')
const querystring = require('querystring')
const hashHelper = require('./hash-helper')
const createAuthorisedMiddleware = require('../lib/authorised')
const authorised = createAuthorisedMiddleware(config)
const imgSrcId = 'b063889dedaee7dae61b8f2dbcf3f962'

server.use(restify.queryParser())
server.use(function (req, res, next) {
  var tokens = req.url.match(/([a-zA-Z0-9]{32,}):([a-zA-Z0-9]{32,})/)
  tokens.shift()

  req.params.data = tokens.shift()
  req.params.hash = tokens.shift()
  req.params.action = req.url.substring(0, req.url.indexOf(req.params.data))
  req.authorised = authorised(req)
  return next()
})

server.get(/^\/(.*)$/, function (req, res) {
  if (!req.authorised) return res.send(400)

  res.send(200)
})

describe('Authorised middleware', function () {
  it('should return true for an authorised URL', function (done) {
    var uri = '/100/' + imgSrcId,
      url = uri + ':' + hashHelper(uri)

    request(server).get(url).expect(200).end(done)
  })

  it('should return true for an authorised URL with unknown querystrings', function (done) {
    var uri = '/100/' + imgSrcId,
      url = uri + ':' + hashHelper(uri)

    request(server)
      .get(
        url +
          '?' +
          querystring.stringify({
            a: 1,
            b: 2,
            utm_source: 'test',
            utm_campaign: 'test'
          })
      )
      .expect(200)
      .end(done)
  })

  it('should return false for an unauthorised URL without querystrings', function (done) {
    var uri = '/1000/' + imgSrcId,
      url = uri + ':' + hashHelper('/100/' + imgSrcId)

    request(server).get(url).expect(400).end(done)
  })

  it('should return false for an unauthorised URL with querystrings', function (done) {
    var uri = '/circle/' + imgSrcId,
      qs = querystring.stringify({ width: 50000 })

    request(server)
      .get(uri + ':' + hashHelper(uri) + '?' + qs)
      .expect(400)
      .end(done)
  })

  it('should return true for an authorised URL with acceptable querystrings', function (done) {
    var qsObject = {
        x0: '100',
        y0: '100',
        x1: '0',
        y1: '0',
        height: '100',
        width: '100',
        colour: '#fff'
      },
      qs = querystring.stringify(qsObject),
      baseUrl = '/circle/',
      uri = baseUrl + imgSrcId

    request(server)
      .get(uri + ':' + hashHelper(baseUrl + imgSrcId + qs) + '?' + qs)
      .expect(200)
      .end(done)
  })
})
