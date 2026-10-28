// args: log lines → [{level, service, message}]
return args.map(line => {
  const [level, rest] = line.split(' ', 2)
  const [service, message] = rest.split(': ', 2)
  return { level, service, message }
})
