// args: {id, result, raw: JSON string, a, b}
return {
  line: `result for ${args.id}: ${args.result}`,
  count: args.raw.count,
  same: args.a === args.b,
}
