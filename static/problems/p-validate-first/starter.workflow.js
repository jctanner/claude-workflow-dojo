export const meta = {
  name: 'process-keys',
  description: 'Process each key with the (optionally namespaced) process skill',
}

const NS = (args && args.namespace) || ''
const results = await parallel(args.keys.map(k => () => agent(`Run ${NS}process ${k}`)))

if (NS && !/^[a-z0-9-]+:$/.test(NS)) throw new Error(`namespace must look like "tools:", got ${NS}`)
for (const k of args.keys) {
  if (!/^T-[0-9]+$/.test(k)) throw new Error(`bad key ${k}`)
}
return results
