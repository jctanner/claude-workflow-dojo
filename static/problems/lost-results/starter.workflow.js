export const meta = {
  name: 'secret-remediation',
  description: 'Scan repos for leaked secrets and plan remediation',
}

const SCAN = {
  type: 'object',
  properties: { repo: { type: 'string' }, leaks: { type: 'number' } },
  required: ['repo', 'leaks'],
}

const scans = await parallel(args.map(repo =>
  agent(`Scan ${repo} for leaked secrets`, { schema: SCAN, label: `scan ${repo}` })))

const flagged = scans.filter(Boolean).filter(s => s.leaks > 0)

return await pipeline(flagged,
  scan => agent(`Draft a remediation plan for ${scan.repo}`, { label: `plan ${scan.repo}` }),
  (plan, index) => ({ repo: flagged[index].repo, plan }))
