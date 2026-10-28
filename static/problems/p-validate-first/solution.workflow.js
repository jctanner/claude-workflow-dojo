export const meta = {
  name: 'process-keys',
  description: 'Process each key with the (optionally namespaced) process skill',
}

// Validate first: nothing has been spent yet if this throws.
const NS = (args && args.namespace) || ''
if (NS && !/^[a-z0-9-]+:$/.test(NS)) throw new Error(`namespace must look like "tools:", got ${NS}`)
for (const k of args.keys) {
  if (!/^T-[0-9]+$/.test(k)) throw new Error(`bad key ${k}`)
}

return await parallel(args.keys.map(k => () => agent(`Run ${NS}process ${k}`)))
