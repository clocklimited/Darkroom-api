'use strict'

var Readable = require('stream').Readable
  , crypto = require('crypto')

function RandomReadStream(size) {
  Readable.apply(this)
  this.size = size || Infinity
  this.sent = 0
}

RandomReadStream.prototype = Object.create(Readable.prototype)

RandomReadStream.prototype._read = function (size) {
  var amountToSend
  if (this.sent >= this.size) {
    this.push(null)
  }
  amountToSend = Math.min(this.size - this.sent, size)
  this.sent += amountToSend
  this.push(new Buffer(crypto.randomBytes(amountToSend)))
}

module.exports = RandomReadStream
