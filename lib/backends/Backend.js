class Backend {
  constructor(serviceLocator) {
    this.serviceLocator = serviceLocator
    this.config = serviceLocator.config
    this.logger = serviceLocator.logger
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
