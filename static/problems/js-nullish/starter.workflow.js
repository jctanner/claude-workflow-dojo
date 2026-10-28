// args: [{name, timeoutSec?, retries?, owner?: {team?}}]
return args.map(job => ({
  name: job.name,
  timeoutSec: job.timeoutSec || 30,
  retries: job.retries || 2,
  team: job.owner.team || 'unowned',
}))
