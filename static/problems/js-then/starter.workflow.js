// args: files → [{file, summary}] in order, concurrently
const summaries = []
parallel(args.map(f => () => agent(`Summarize ${f}`).then(s => summaries.push({ file: f, summary: s }))))
return summaries
