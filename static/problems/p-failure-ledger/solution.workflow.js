export const meta = {
  name: 'process-and-report',
  description: 'Process every item, then write a report that lists failures',
}

const failed = []
const fail = (step, key) => {
  failed.push(`${step}:${key}`)
  log(`${step} ${key}: no result`)
  return null
}

const results = await parallel(args.map(id => () => agent(`process ${id}`)))
results.forEach((r, i) => { if (r === null) fail('process', args[i]) })

const failedArgs = failed.map(f => ` --failed ${f}`).join('')
const report = await agent(`report${failedArgs}`)
if (failed.length) throw new Error(`not verified: ${failed.join(', ')}`)
return report
