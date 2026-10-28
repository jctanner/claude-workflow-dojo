import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'Regex, raise and "or" Defaults',
  difficulty: 'Medium',
  category: 'JS',
  goal: "Check the namespace and keys: return them if they are valid, otherwise throw an error that says which one is wrong.",
  concepts: ['/regex/.test()', '^…$ anchors', 'throw new Error', '(a && a.b) || default'],
  python: `ns = (args or {}).get("namespace") or ""
if ns and not re.fullmatch(r"[a-z0-9-]+:", ns):
    raise ValueError(f"namespace must look like 'tools:', got {ns}")
for k in args["keys"]:
    if not re.fullmatch(r"T-[0-9]+", k):
        raise ValueError(f"bad key {k}")
return {"ns": ns, "keys": args["keys"]}`,
  description: `
<p><code>args</code> is <code>{namespace?, keys}</code>. Validate it and return <code>{ns, keys}</code>:</p>
<ul>
  <li><code>ns</code> is the namespace, or <code>''</code> if it's missing.</li>
  <li>A non-empty namespace must look like <code>tools:</code> (lowercase, digits and dashes, then a colon).
  Otherwise <b>throw</b> an error whose message mentions <code>namespace</code>.</li>
  <li>Every key must look exactly like <code>T-123</code>. Otherwise <b>throw</b> an error mentioning <code>key</code>.</li>
</ul>
<ul>
  <li><code>re.fullmatch(p, s)</code> is <code>/^p$/.test(s)</code>. Without <code>^</code> and <code>$</code>, a regex matches <i>anywhere</i> in the
  string, like <code>re.search</code>, so <code>/T-\\d+/</code> accepts <code>"xT-1y"</code>.</li>
  <li><code>raise ValueError("…")</code> is <code>throw new Error('…')</code>. Returning an error string is not the same as stopping.</li>
  <li><code>(args &amp;&amp; args.namespace) || ''</code> is the common default idiom, and <code>args?.namespace ?? ''</code> is the modern spelling.</li>
</ul>`,
  hints: ['/^[a-z0-9-]+:$/.test(ns)', "if (!/^T-[0-9]+$/.test(k)) throw new Error(`bad key ${k}`)"],
  tests: [
    { name: 'valid with namespace', args: { namespace: 'tools:', keys: ['T-1', 'T-22'] }, expected: { ns: 'tools:', keys: ['T-1', 'T-22'] } },
    { name: 'valid without namespace', args: { keys: ['T-7'] }, expected: { ns: '', keys: ['T-7'] } },
    { name: 'bad namespace', args: { namespace: 'Tools', keys: ['T-1'] }, expectError: /namespace/ },
    { name: 'key with junk around it', args: { keys: ['T-1', 'xT-12y'] }, expectError: /key/ },
  ].map(t => ({ ...t, check: t.expectError ? undefined : r => expectEqual(r, t.expected) })),
};
