class Backend {
  constructor(config) {
    this.config = config
  }

  setup(cb) {
    cb()
  }

  clean(cb) {
    cb()
  }

  isHealthy(cb) {
    cb(null, false)
  }

  createDataReadStream() {}

  createCacheReadStream() {}

  createDataWriteStream() {}

  createCacheWriteStream() {}

  async deleteData() {}

  async clearCache() {}
}

module.exports = Backend
