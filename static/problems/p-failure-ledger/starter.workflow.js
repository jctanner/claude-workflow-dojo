export const meta = {
  name: 'process-and-report',
  description: 'Process every item, then write a report that lists failures',
}

const results = await parallel(args.map(id => () => agent(`process ${id}`)))
results.forEach((r, i) => {
  if (r === null) throw new Error(`process ${args[i]} failed`)
})
return await agent('report')
