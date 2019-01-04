/* global __ENABLED_FLAGS__ */

import isNode from 'detect-node'
export { default as FlagSwitcher } from './browser/FlagSwitcher'

const flag = isNode
  ? require('./node/flag').default
  : require('./browser/flag').default

if (
  typeof __ENABLED_FLAGS__ !== 'undefined' &&
  Array.isArray(__ENABLED_FLAGS__)
) {
  __ENABLED_FLAGS__.forEach(enabledFlag => flag(enabledFlag, true))
}

export default flag
