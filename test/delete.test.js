const mockServiceLocator = require('./mock-service-locator')
const createDarkroom = require('../server')
const createBackendFactory = require('../lib/backend-factory-creator')
const request = require('supertest')
const backends = require('./lib/backends')
const assert = require('assert')

backends().forEach(function (backend) {
  const config = backend.config
  const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  describe(`Delete ${backend.name} backend`, function () {
    let darkroom
    let factory
    let findCache
    let findData

    before(function (done) {
      const sl = mockServiceLocator(config)
      createBackendFactory(sl, function (err, backendFactory) {
        factory = backendFactory
        darkroom = createDarkroom(sl, factory)
        findCache = backend.cacheFinder.bind(null, factory)
        findData = backend.dataFinder.bind(null, factory)
        done()
      })
    })

    before((done) => factory.setup(done))
    after((done) => factory.clean(done))

    it('should delete cache', async function () {
      this.timeout(10000)

      // I've manually created this using darkroom-url-builder, soz
      const imageUrl =
        '/500/500/1cfdd3bf942749472093f3b0ed6d4f89:f87edf7c8f55aeb90cfacaf4e11a28d5?quality=2'
      let imgSrcId

      const upload = await request(darkroom)
        .post('/')
        .set('x-darkroom-key', 'key')
        .set('Accept', 'application/json')
        .attach('file', 'test/fixtures/jpeg.jpeg')

      imgSrcId = upload.body.id
      // No cached images
      assert.deepStrictEqual(await findCache(imgSrcId), null)

      // request a resize so cache gets created
      const createCache = await request(darkroom).get(imageUrl)

      assert.strictEqual(createCache.statusCode, 200)

      // need to wait for `backend.createCacheWriteStream` to be done
      await timeout(1000)
      let cache = await findCache(imgSrcId)

      // assert there is cache now
      assert(cache, 'cache not created')
      assert.strictEqual(cache.originalId, imgSrcId)

      // clear that cache
      const deleteRes = await request(darkroom)
        .delete(`/cache/${imgSrcId}`)
        .set('x-darkroom-key', 'key')

      assert(deleteRes.statusCode, 204)

      // assert the cache has been cleared
      assert.deepStrictEqual(await findCache(imgSrcId), null)
    })

    it('should delete file and its cache', async function () {
      this.timeout(10000)

      // I've manually created this using darkroom-url-builder, soz
      const imageUrl =
        '/500/500/1cfdd3bf942749472093f3b0ed6d4f89:f87edf7c8f55aeb90cfacaf4e11a28d5?quality=2'
      let imgSrcId

      const upload = await request(darkroom)
        .post('/')
        .set('x-darkroom-key', 'key')
        .set('Accept', 'application/json')
        .attach('file', 'test/fixtures/jpeg.jpeg')

      imgSrcId = upload.body.id
      // No cached images
      assert.deepStrictEqual(await findCache(imgSrcId), null)
      let data = await findData(imgSrcId)

      // assert there is data now
      assert(data, 'no data object')

      // request a resize so cache gets created
      const createCache = await request(darkroom).get(imageUrl)

      assert.strictEqual(createCache.statusCode, 200)

      // need to wait for `backend.createCacheWriteStream` to be done
      await timeout(1000)
      let cache = await findCache(imgSrcId)

      // assert there is cache now
      assert(cache, 'cache not created')
      assert.strictEqual(cache.originalId, imgSrcId)

      // delete the data (which also clears the cache)
      const deleteRes = await request(darkroom)
        .delete(`/data/${imgSrcId}`)
        .set('x-darkroom-key', 'key')

      assert(deleteRes.statusCode, 204)

      // assert the data has been deleted
      assert.deepStrictEqual(await findData(imgSrcId), null)

      // assert the cache has been cleared
      assert.deepStrictEqual(await findCache(imgSrcId), null)
    })
  })
})
