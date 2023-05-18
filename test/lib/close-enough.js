const closeEnough = (actual, expected) => {
  const actualDate = new Date(actual).getTime()
  const expectedDate = new Date(expected).getTime()
  const toleranceMs = 5000

  if (actual === expected) {
    return true
  }
  if (
    actualDate - toleranceMs < expectedDate &&
    expectedDate < actualDate + toleranceMs
  ) {
    return true
  }
  return false
}

module.exports = closeEnough
