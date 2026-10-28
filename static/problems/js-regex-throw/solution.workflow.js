const ns = (args && args.namespace) || ''
if (ns && !/^[a-z0-9-]+:$/.test(ns)) throw new Error(`namespace must look like "tools:", got ${ns}`)
for (const k of args.keys) {
  if (!/^T-[0-9]+$/.test(k)) throw new Error(`bad key ${k}`)
}
return { ns, keys: args.keys }
