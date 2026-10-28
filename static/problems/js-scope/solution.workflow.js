let level = 'low'                // declared outside the if, so it survives it
if (args.errors > 10) {
  level = 'high'
}

const withAvg = args.items.map(item => {
  const avg = item.scores.reduce((a, b) => a + b, 0) / item.scores.length
  return { ...item, avg }        // carry the value out of the callback
})

return {
  level,
  passing: withAvg.filter(item => item.avg >= 5).map(item => item.id),
}
