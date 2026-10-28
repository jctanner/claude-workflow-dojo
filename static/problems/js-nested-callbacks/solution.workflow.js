// Name the inner step; the outer line then reads like the spec.
const onCallCount = team => {
  let count = 0
  for (const m of team.members) {
    if (m && m.oncall) count++
  }
  return count
}

return args.filter(t => onCallCount(t) >= 2).map(t => t.team)
