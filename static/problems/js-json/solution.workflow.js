return {
  line: `result for ${args.id}: ${JSON.stringify(args.result)}`,
  count: JSON.parse(args.raw).count,
  same: JSON.stringify(args.a) === JSON.stringify(args.b),
}
