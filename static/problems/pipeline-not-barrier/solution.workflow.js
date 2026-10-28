export const meta = {
  name: 'scan-then-investigate',
  description: 'Scan each module, then investigate its hotspots',
  phases: [{ title: 'Scan' }, { title: 'Investigate' }],
}

return await pipeline(args,
  m => agent(`Scan ${m} for hotspots`, { phase: 'Scan', label: `scan ${m}` }),
  (scan, m) => agent(`Investigate ${m}. Scan said: ${scan}`, { phase: 'Investigate', label: `investigate ${m}` }))

// Equally good: named stage functions. Mind the signature, because stage 2's
// first argument is stage 1's result, and the module is the second.
//
//   const scan = module => agent(`Scan ${module} for hotspots`, { phase: 'Scan' })
//   const investigate = (scan, module) =>
//     agent(`Investigate ${module}. Scan said: ${scan}`, { phase: 'Investigate' })
//   return await pipeline(args, scan, investigate)
