// Recipes, not cooking: nothing starts until a thunk is called.
const attempts = args.map(m => () => agent(`Fetch the report from ${m}`))

for (let i = 0; i < args.length; i++) {
  const data = await attempts[i]()   // start this mirror only now
  if (data !== null) return { mirror: args[i], data }
}
return null
