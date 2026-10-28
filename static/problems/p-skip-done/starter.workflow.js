export const meta = {
  name: 'process-remaining',
  description: 'Process items that are not already done',
}

// args: {items, done, reviewOnly}
return await parallel(args.items.map(id => () => agent(`process ${id}`)))
