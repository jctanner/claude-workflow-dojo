const withFindings = args.filter(r => r.findings.length > 0).map(r => r.id)
const withNotes = args.filter(r => r.notes).map(r => r.id)
return { withFindings, withNotes }
