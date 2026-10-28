export const meta = {
  name: 'process-with-reuse',
  description: 'Reuse saved answers where they still apply',
}

// args: {instructions, items: [{id, input}], saved: {id: {input, instructions, answer}}}
// Bug: any saved answer is reused, even when what it depended on has changed.
return await parallel(args.items.map(it => () => {
  const s = args.saved[it.id]
  if (s) return s.answer
  return agent(`process ${it.id} ${it.input}`)
}))
