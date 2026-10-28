// Split once: find the separator, then slice on either side of it.
const splitOnce = (s, sep) => {
  const at = s.indexOf(sep)
  return [s.slice(0, at), s.slice(at + sep.length)]
}

return args.map(line => {
  const [level, rest] = splitOnce(line.trim(), ' ')
  const [service, message] = splitOnce(rest, ': ')
  return { level, service, message }
})
