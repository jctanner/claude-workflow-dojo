// args: [{id, findings: string[], notes: string}]
const withFindings = args.filter(r => r.findings).map(r => r.id)
const withNotes = args.filter(r => r.notes).map(r => r.id)
return { withFindings, withNotes }
