export const meta = {
  name: 'scan-then-investigate',
  description: 'Scan each module, then investigate its hotspots',
  phases: [{ title: 'Scan' }, { title: 'Investigate' }],
}

// This works, but takes 12s. Make it finish within 8s.
phase('Scan')
const scans = await parallel(args.map(m => () => agent(`Scan ${m} for hotspots`)))

phase('Investigate')
const reports = await parallel(args.map((m, i) => () =>
  agent(`Investigate ${m}. Scan said: ${scans[i]}`)))

return reports
