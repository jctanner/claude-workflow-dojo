// Each thunk resolves to its own {file, summary}; parallel keeps input order.
return await parallel(args.map(f => () =>
  agent(`Summarize ${f}`).then(summary => ({ file: f, summary }))))
