// args: {namespace?, keys} → {ns, keys}, or throw on bad input
const ns = args.namespace
if (ns && !/[a-z0-9-]+:/.test(ns)) return 'error: bad namespace'
for (const k of args.keys) {
  if (!/T-\d+/.test(k)) return `error: bad key ${k}`
}
return { ns, keys: args.keys }
