// args: mirrors in preference order → {mirror, data} from the first that answers, or null
const attempts = args.map(m => agent(`Fetch the report from ${m}`))   // starts ALL of them now

for (let i = 0; i < args.length; i++) {
  const data = await attempts[i]
  if (data !== null) return { mirror: args[i], data }
}
return null
