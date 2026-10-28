export const meta = {
  name: 'summarize-files',
  description: 'Summarize each file in parallel',
}

const summaries = await parallel(args.map(file => () =>
  agent(`Summarize ${file} in one line.`, { label: file })))

return args.map((file, i) => ({ file, summary: summaries[i] }))
