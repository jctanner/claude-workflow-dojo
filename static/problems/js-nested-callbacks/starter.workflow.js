// args: [{team, members: [{name, oncall} | null]}] → team names with >= 2 on call
return args.filter(t => { t.members.filter(m => m && m.oncall).length >= 2 }).map(t => t.team)
