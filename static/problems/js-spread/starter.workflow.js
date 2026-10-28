// args: {defaults, overrides, files, extra} → {config, files, first, rest}
const config = args.defaults
Object.assign(config, args.overrides)   // works, but mutates defaults
// TODO: files, first and rest
return { config }
