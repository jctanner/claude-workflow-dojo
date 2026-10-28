import { expectEqual, has } from '../_kit.js';

export default {
  title: 'Structured Output',
  difficulty: 'Easy',
  category: 'Create',
  goal: "Ask one agent which files contain TODOs, using a schema, and return the file paths sorted.",
  concepts: ['schema', 'StructuredOutput'],
  description: `
<p>Ask an agent which files contain <code>TODO</code> markers and return the paths <strong>sorted</strong>.</p>
<p>Without a schema the agent answers in prose, and parsing prose is fragile. Pass <code>{schema}</code> instead.
The subagent is then forced to call a StructuredOutput tool, and <code>agent()</code> resolves to the validated object.</p>
<ul>
  <li>The schema root must be <code>{type: 'object', properties: {...}}</code>.</li>
  <li>The answer must use a property named <code>files</code>: an array of strings.</li>
  <li>Every name in <code>required</code> must be listed in <code>properties</code>. An unsatisfiable schema throws at <code>agent()</code>.</li>
</ul>`,
  hints: [
    "const FILES = {type: 'object', properties: {files: {type: 'array', items: {type: 'string'}}}, required: ['files']}",
    'With a schema the result is an object: read `result.files`, then sort a copy.',
  ],
  respond(call, test) {
    if (has(call.schema, 'files')) return { output: { files: test.files }, duration: 1200 };
    return { output: `I found TODO markers in ${test.files.join(', ')}.`, duration: 1200 };
  },
  tests: [
    {
      name: 'three files',
      files: ['src/b.py', 'src/a.py', 'src/c.py'],
      check: r => expectEqual(r, ['src/a.py', 'src/b.py', 'src/c.py']),
    },
    {
      name: 'another repository',
      files: ['web/z.ts', 'api/handlers.go', 'api/auth.go', 'docs/x.md'],
      check: r => expectEqual(r, ['api/auth.go', 'api/handlers.go', 'docs/x.md', 'web/z.ts']),
    },
  ],
};
