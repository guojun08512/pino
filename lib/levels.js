'use strict'
const flatstr = require('flatstr')
const { lsCacheSym, levelValSym } = require('./symbols')
const { noop, genLog } = require('./tools')

const levels = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
}

const levelMethods = {
  fatal: genLog(levels.fatal),
  error: genLog(levels.error),
  warn: genLog(levels.warn),
  info: genLog(levels.info),
  debug: genLog(levels.debug),
  trace: genLog(levels.trace)
}

const nums = Object.keys(levels).reduce((o, k) => {
  o[levels[k]] = k
  return o
}, {})

const initialLsCache = Object.keys(nums).reduce((o, k) => {
  if (!(k in o)) o[k] = flatstr('{"level":' + Number(k))
  return o
}, {})

function genLsCache (instance) {
  instance[lsCacheSym] = Object.keys(instance.levels.labels).reduce((o, k) => {
    if (!(k in o)) o[k] = flatstr('{"level":' + Number(k))
    return o
  }, instance[lsCacheSym])
  return instance
}

function isStandardLevel (level) {
  switch (level) {
    case 'fatal':
    case 'error':
    case 'warn':
    case 'info':
    case 'debug':
    case 'trace':
      return true
    default:
      return false
  }
}

function setLevel (level) {
  const { labels, values } = this.levels
  if (typeof level === 'number') {
    if (labels[level] === undefined) throw Error('unknown level value' + level)
    level = labels[level]
  }
  if (values[level] === undefined) throw Error('unknown level ' + level)
  const preLevelVal = this[levelValSym]
  const levelVal = this[levelValSym] = values[level]

  for (var key in values) {
    if (levelVal > values[key]) {
      this[key] = noop
      continue
    }
    this[key] = isStandardLevel(key) ? levelMethods[key] : genLog(values[key])
  }

  this.emit(
    'level-change',
    level,
    levelVal,
    labels[preLevelVal],
    preLevelVal
  )
}

function getLevel (level) {
  const { levels, levelVal } = this
  return levels.labels[levelVal]
}

function isLevelEnabled (logLevel) {
  const { values } = this.levels
  const logLevelVal = values[logLevel]
  return logLevelVal !== undefined && (logLevelVal >= this[levelValSym])
}

function mappings (customLevels = null) {
  const customNums = customLevels ? Object.keys(customLevels).reduce((o, k) => {
    o[customLevels[k]] = k
    return o
  }, {}) : null

  const labels = Object.assign(
    Object.create(Object.prototype, {Infinity: {value: 'silent'}}),
    nums,
    customNums
  )
  const values = Object.assign(
    Object.create(Object.prototype, {silent: {value: Infinity}}),
    levels,
    customLevels
  )
  return { labels, values }
}
function assertNoLevelCollisions (levels, customLevels) {
  const { labels, values } = levels
  for (const k in customLevels) {
    if (k in values) {
      throw Error('levels cannot be overridden')
    }
    if (customLevels[k] in labels) {
      throw Error('pre-existing level values cannot be used for new levels')
    }
  }
}

module.exports = {
  assertNoLevelCollisions,
  initialLsCache,
  genLsCache,
  levelMethods,
  getLevel,
  setLevel,
  isLevelEnabled,
  mappings
}
