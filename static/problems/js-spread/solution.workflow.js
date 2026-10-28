const { defaults, overrides, files, extra } = args
const config = { ...defaults, ...overrides }
const all = [...files, ...extra]
const [first, ...rest] = all
return { config, files: all, first, rest }
