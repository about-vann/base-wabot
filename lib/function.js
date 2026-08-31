export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export const isNumber = value => typeof value === 'number' && Number.isFinite(value)

export const pick = (object, keys = []) => Object.fromEntries(keys.filter(key => key in object).map(key => [key, object[key]]))
