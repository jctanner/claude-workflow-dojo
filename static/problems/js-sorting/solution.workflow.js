// Copy (sort mutates), compare numerically, slowest first.
const slowest = [...args].sort((a, b) => b.ms - a.ms).slice(0, 3)
return slowest.map(r => r.name)
