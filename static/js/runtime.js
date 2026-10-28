// Deterministic simulator for Claude Code workflow scripts.
//
// It mirrors the script API (agent, parallel, pipeline, phase, log, args,
// budget) on a virtual clock. Agents are answered by a fixture instead of a
// model, so runs are free, instant and repeatable. Works in a browser worker
// and in Node.

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const PARAMS = ['meta', 'agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', 'workflow', 'Date', 'Math'];
// new AsyncFunction puts the body on line 3 ("async function anonymous(...\n) {\n").
const HEADER_LINES = 2;

export class LintError extends Error {
  constructor(message, { hint, line } = {}) {
    super(message);
    this.name = 'CompileError';
    this.hint = hint;
    this.line = line;
  }
}

// ---------------------------------------------------------------- meta

function lineAt(src, pos) {
  let line = 1;
  for (let i = 0; i < pos && i < src.length; i++) if (src[i] === '\n') line++;
  return line;
}

function skipTrivia(src, pos) {
  for (;;) {
    while (pos < src.length && /\s/.test(src[pos])) pos++;
    if (src.startsWith('//', pos)) {
      const nl = src.indexOf('\n', pos);
      pos = nl < 0 ? src.length : nl + 1;
    } else if (src.startsWith('/*', pos)) {
      const end = src.indexOf('*/', pos + 2);
      pos = end < 0 ? src.length : end + 2;
    } else return pos;
  }
}

// Parses only literals: objects, arrays, strings, numbers, booleans, null.
class LiteralParser {
  constructor(src, pos) {
    this.src = src;
    this.pos = pos;
  }

  fail(message) {
    throw new LintError(`meta must be a pure literal: ${message}`, {
      line: lineAt(this.src, this.pos),
      hint: 'No variables, function calls, spreads or template interpolation inside meta. Inline the values.',
    });
  }

  peek() {
    this.pos = skipTrivia(this.src, this.pos);
    return this.src[this.pos];
  }

  value() {
    const c = this.peek();
    if (c === '{') return this.object();
    if (c === '[') return this.array();
    if (c === '"' || c === "'" || c === '`') return this.string();
    if (this.src.startsWith('...', this.pos)) this.fail('spread (`...`) is not allowed');
    const num = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(this.src.slice(this.pos));
    if (num) {
      this.pos += num[0].length;
      return Number(num[0].replace(/_/g, ''));
    }
    const word = /^[A-Za-z_$][\w$]*/.exec(this.src.slice(this.pos));
    if (word) {
      const w = word[0];
      const lit = { true: true, false: false, null: null };
      if (w in lit) {
        this.pos += w.length;
        return lit[w];
      }
      this.fail(`found identifier \`${w}\``);
    }
    this.fail(`unexpected \`${c ?? 'end of script'}\``);
  }

  string() {
    const q = this.src[this.pos];
    let out = '';
    this.pos++;
    while (this.pos < this.src.length) {
      const c = this.src[this.pos];
      if (c === '\\') {
        const e = this.src[this.pos + 1];
        out += { n: '\n', t: '\t', r: '\r' }[e] ?? e;
        this.pos += 2;
        continue;
      }
      if (q === '`' && c === '$' && this.src[this.pos + 1] === '{') this.fail('template interpolation (`${...}`) is not allowed');
      if (c === q) {
        this.pos++;
        return out;
      }
      if (c === '\n' && q !== '`') this.fail('unterminated string');
      out += c;
      this.pos++;
    }
    this.fail('unterminated string');
  }

  key() {
    const c = this.peek();
    if (c === '"' || c === "'") return this.string();
    if (c === '[') this.fail('computed keys are not allowed');
    if (this.src.startsWith('...', this.pos)) this.fail('spread (`...`) is not allowed');
    const word = /^[A-Za-z_$][\w$]*|^\d+/.exec(this.src.slice(this.pos));
    if (!word) this.fail(`unexpected \`${c}\` where a key was expected`);
    this.pos += word[0].length;
    return word[0];
  }

  object() {
    const out = {};
    this.pos++;
    for (;;) {
      if (this.peek() === '}') {
        this.pos++;
        return out;
      }
      const k = this.key();
      const sep = this.peek();
      if (sep === ',' || sep === '}') this.fail(`shorthand property \`${k}\` refers to a variable`);
      if (sep === '(') this.fail(`method \`${k}()\` is not allowed`);
      if (sep !== ':') this.fail(`expected \`:\` after \`${k}\``);
      this.pos++;
      out[k] = this.value();
      const next = this.peek();
      if (next === ',') this.pos++;
      else if (next !== '}') this.fail(`unexpected \`${next}\` after \`${k}\` (expressions are not allowed)`);
    }
  }

  array() {
    const out = [];
    this.pos++;
    for (;;) {
      if (this.peek() === ']') {
        this.pos++;
        return out;
      }
      out.push(this.value());
      const next = this.peek();
      if (next === ',') this.pos++;
      else if (next !== ']') this.fail(`unexpected \`${next}\` in array (expressions are not allowed)`);
    }
  }
}

// Returns {meta, body}; the meta region is blanked so body line numbers match the editor.
export function extractMeta(source) {
  const start = skipTrivia(source, 0);
  const m = /^export\s+const\s+meta\s*=\s*/.exec(source.slice(start));
  if (!m) {
    const found = source.search(/export\s+const\s+meta\s*=/);
    throw new LintError('Script must begin with `export const meta = {...}`', {
      line: found >= 0 ? lineAt(source, found) : 1,
      hint: found >= 0
        ? 'Move the meta block to the very top of the script. Only comments may come before it.'
        : 'Add `export const meta = { name: \'...\', description: \'...\' }` as the first statement.',
    });
  }
  const parser = new LiteralParser(source, start + m[0].length);
  if (parser.peek() !== '{') parser.fail('meta must be an object literal');
  const meta = parser.object();
  let end = parser.pos;
  const after = skipTrivia(source, end);
  if (source[after] === ';') end = after + 1;
  else if (after < source.length && /[.([?+\-*/|&]/.test(source[after]) && lineAt(source, after) === lineAt(source, end)) {
    parser.pos = after;
    parser.fail(`unexpected \`${source[after]}\` after the meta object`);
  }

  for (const field of ['name', 'description']) {
    if (typeof meta[field] !== 'string' || !meta[field].trim()) {
      throw new LintError(`meta.${field} is required and must be a non-empty string`, {
        line: lineAt(source, start),
        hint: field === 'description' ? 'The description is the one line shown in the permission dialog.' : undefined,
      });
    }
  }
  if (meta.phases !== undefined) {
    if (!Array.isArray(meta.phases) || meta.phases.some(p => !p || typeof p.title !== 'string')) {
      throw new LintError('meta.phases must be an array of { title, detail? } objects', { line: lineAt(source, start) });
    }
  }

  const body = source.slice(0, start) + source.slice(start, end).replace(/[^\n]/g, ' ') + source.slice(end);
  const imp = /^\s*import\s[^\n]*/m.exec(body);
  if (imp) {
    throw new LintError('Workflow scripts cannot import modules', {
      line: lineAt(body, imp.index + imp[0].search(/\S/)),
      hint: 'Scripts have no module, filesystem or Node.js access. Inline helpers in the script.',
    });
  }
  return { meta, body };
}

// Tier 0 problems are plain JavaScript: no meta block is required.
function plainBody(source) {
  if (/^\s*export\s+const\s+meta\s*=/m.test(source)) return extractMeta(source);
  const imp = /^\s*import\s[^\n]*/m.exec(source);
  if (imp) {
    throw new LintError('Scripts cannot import modules', { line: lineAt(source, imp.index + imp[0].search(/\S/)) });
  }
  return { meta: null, body: source };
}

function compile(source, requireMeta = true) {
  const { meta, body } = requireMeta ? extractMeta(source) : plainBody(source);
  try {
    return { meta, fn: new AsyncFunction(...PARAMS, '"use strict";' + body) };
  } catch (e) {
    const ts = /(\)|\w)\s*:\s*(string|number|boolean|any|unknown|void|Promise<|Record<)[\s\S]{0,40}?[=,)]|\binterface\s+\w+|\btype\s+\w+\s*=|\bas\s+(const|string|any)\b|<\w+>\(/;
    let line;
    const tsMatch = ts.exec(body);
    if (tsMatch) line = lineAt(body, tsMatch.index);
    throw new LintError(`SyntaxError: ${e.message}`, {
      line,
      hint: tsMatch
        ? 'This looks like TypeScript. Workflow scripts are plain JavaScript, so remove type annotations, interfaces and generics.'
        : 'The script body runs inside an async function. Top-level `await` and `return` are allowed.',
    });
  }
}

// ------------------------------------------------------------- schemas

export function checkSchema(schema) {
  if (!schema || typeof schema !== 'object' || schema.type !== 'object' || typeof schema.properties !== 'object') {
    throw new Error('Invalid schema: the root must be {type: \'object\', properties: {...}}');
  }
  for (const combinator of ['oneOf', 'anyOf', 'allOf']) {
    // The real API rejects these at the tool-input root with a 400.
    if (combinator in schema) {
      throw new Error(`Invalid schema: ${combinator} is not supported at the top level (API 400: input_schema does not support oneOf, allOf, or anyOf at the top level). Keep an object root and check cross-field rules in code.`);
    }
  }
  for (const r of schema.required || []) {
    if (!(r in schema.properties)) throw new Error(`Invalid schema: required field "${r}" is not in properties (unsatisfiable)`);
  }
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
}

export function validate(value, schema, path = '$') {
  if (!schema || typeof schema !== 'object') return [];
  const errs = [];
  if (schema.type) {
    const types = [].concat(schema.type);
    const t = typeOf(value);
    const ok = types.some(x => x === t || (x === 'number' && t === 'integer'));
    if (!ok) return [`${path} should be ${types.join('|')}, got ${t}`];
  }
  if (schema.enum && !schema.enum.some(e => JSON.stringify(e) === JSON.stringify(value))) {
    errs.push(`${path} should be one of ${JSON.stringify(schema.enum)}`);
  }
  if ('const' in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) {
    errs.push(`${path} should be exactly ${JSON.stringify(schema.const)}`);
  }
  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) errs.push(`${path} is shorter than ${schema.minLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errs.push(`${path} does not match ${schema.pattern}`);
  }
  if (typeOf(value) === 'object') {
    for (const r of schema.required || []) if (!(r in value)) errs.push(`${path}.${r} is required`);
    for (const [k, sub] of Object.entries(schema.properties || {})) {
      if (k in value) errs.push(...validate(value[k], sub, `${path}.${k}`));
    }
    if (schema.additionalProperties === false) {
      for (const k of Object.keys(value)) if (!(k in (schema.properties || {}))) errs.push(`${path}.${k} is not allowed`);
    }
  }
  if (Array.isArray(value)) {
    if (schema.items) value.forEach((v, i) => errs.push(...validate(v, schema.items, `${path}[${i}]`)));
    if (schema.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) errs.push(`${path} has duplicate items`);
  }
  return errs;
}

export function sampleFromSchema(schema, hint = 'sample') {
  if (!schema || typeof schema !== 'object') return hint;
  if ('const' in schema) return schema.const;
  if (schema.enum) return schema.enum[0];
  const t = [].concat(schema.type || 'string')[0];
  if (t === 'object') {
    const out = {};
    for (const [k, sub] of Object.entries(schema.properties || {})) out[k] = sampleFromSchema(sub, `${hint}.${k}`);
    return out;
  }
  if (t === 'array') return [sampleFromSchema(schema.items, `${hint}[0]`)];
  if (t === 'number' || t === 'integer') return 1;
  if (t === 'boolean') return false;
  if (t === 'null') return null;
  return hint;
}

// A model asked for structured output fills the schema in. When a fixture
// answers in prose, shape that prose to the requested schema the same way:
// exact hint keys first, then name heuristics (file/path/name, id/index),
// then the prose itself for strings.
export function fillSchema(schema, text, hints = {}, key = '') {
  if (!schema || typeof schema !== 'object') return text;
  if ('const' in schema) return schema.const;
  if (schema.enum) return schema.enum[0];
  const t = [].concat(schema.type || 'string')[0];
  const lower = key.toLowerCase();
  const hinted = Object.keys(hints).find(h => h.toLowerCase() === lower);
  if (hinted !== undefined && hints[hinted] !== undefined) return hints[hinted];
  if (t === 'object') {
    const out = {};
    for (const [k, sub] of Object.entries(schema.properties || {})) out[k] = fillSchema(sub, text, hints, k);
    return out;
  }
  if (t === 'array') return [fillSchema(schema.items, text, hints, key)];
  if (t === 'number' || t === 'integer') return /id$|index|idx|^n$|num/.test(lower) && hints.index !== undefined ? hints.index : 0;
  if (t === 'boolean') return false;
  if (t === 'null') return null;
  if (/file|path|name/.test(lower) && hints.file !== undefined) return hints.file;
  return text;
}

// The playground's default answers: deterministic, schema-shaped.
export const defaultFixture = {
  respond(call) {
    const label = call.label || call.prompt.slice(0, 40);
    return {
      output: call.schema ? sampleFromSchema(call.schema, label) : `[mock reply] ${call.prompt.slice(0, 80)}`,
      duration: 600 + ((call.id * 397) % 1400),
      tokens: 300 + ((call.id * 211) % 500),
    };
  },
};

// ------------------------------------------------------------- runtime

function clone(v) {
  try {
    return structuredClone(v);
  } catch {
    return v;
  }
}

function describe(v) {
  if (v && typeof v.then === 'function') return 'a Promise';
  if (v === null) return 'null';
  return typeof v;
}

function errorLine(err) {
  const m = /(?:<anonymous>|> (?:Async)?Function):(\d+):(\d+)/.exec(String(err && err.stack));
  return m ? Math.max(1, Number(m[1]) - HEADER_LINES) : undefined;
}

let defaultTick;
if (typeof setImmediate === 'function') {
  defaultTick = () => new Promise(r => setImmediate(r));
} else {
  const ch = new MessageChannel();
  const queue = [];
  ch.port1.onmessage = () => queue.shift()();
  defaultTick = () => new Promise(r => {
    queue.push(r);
    ch.port2.postMessage(0);
  });
}

const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Run a workflow script on the virtual clock.
 * options: {args, fixture, budgetTotal, concurrency, maxAgents, realTimeoutMs}
 * Returns {ok, meta, result, error, trace, stats}; never throws.
 */
export async function runWorkflow(source, options = {}) {
  const {
    args,
    fixture = defaultFixture,
    budgetTotal = null,
    concurrency = 8,
    maxAgents = 1000,
    realTimeoutMs = 4000,
    requireMeta = true,
  } = options;

  const trace = { agents: [], logs: [], phases: [], warnings: [] };
  const state = {};
  const timers = [];
  const waiting = [];
  let now = 0;
  let seq = 0;
  let spent = 0;
  let running = 0;
  let peak = 0;
  let currentPhase = null;
  const warn = message => trace.warnings.push({ at: now, message });

  const finish = (extra) => {
    for (const a of trace.agents) {
      if (a.status === 'running' || a.status === 'queued') a.status = 'orphaned';
    }
    const orphaned = trace.agents.filter(a => a.status === 'orphaned').length;
    if (orphaned) warn(`${orphaned} agent(s) were still running or queued when the script finished. Did you forget an await, or pass promises where thunks were expected?`);
    return {
      ...extra,
      trace,
      stats: {
        wallClock: now,
        agents: trace.agents.length,
        tokens: spent,
        peakConcurrency: peak,
        agentTime: trace.agents.reduce((s, a) => s + (a.end != null ? a.end - a.start : 0), 0),
      },
    };
  };

  let compiled;
  try {
    compiled = compile(source, requireMeta);
  } catch (e) {
    return finish({ ok: false, meta: null, error: { name: e.name, message: e.message, hint: e.hint, line: e.line } });
  }
  const { meta, fn } = compiled;
  const declaredPhases = new Set(((meta && meta.phases) || []).map(p => p.title));

  const schedule = (delay, fire) => timers.push({ at: now + Math.max(0, delay), seq: seq++, fire });
  const release = () => {
    running--;
    if (waiting.length) waiting.shift()();
  };

  function agent(prompt, opts) {
    if (typeof prompt !== 'string') return Promise.reject(new TypeError(`agent(prompt) expects a string prompt, got ${describe(prompt)}`));
    opts = opts && typeof opts === 'object' ? opts : {};
    if (opts.schema !== undefined) {
      try {
        checkSchema(opts.schema);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    if (budgetTotal != null && spent >= budgetTotal) {
      return Promise.reject(new Error(`Token budget exhausted: agent() refused (spent ${spent} of ${budgetTotal})`));
    }
    if (trace.agents.length >= maxAgents) {
      return Promise.reject(new Error(`Agent cap reached (${maxAgents} agents). Is a loop never terminating?`));
    }
    const rec = {
      id: trace.agents.length + 1,
      label: opts.label || prompt.replace(/\s+/g, ' ').slice(0, 48),
      phase: opts.phase ?? currentPhase,
      prompt,
      opts: clone({ ...opts }),
      queuedAt: now,
      start: null,
      end: null,
      status: 'queued',
      output: undefined,
      tokens: 0,
      note: undefined,
    };
    if (opts.phase && declaredPhases.size && !declaredPhases.has(opts.phase)) {
      warn(`agent "${rec.label}" uses phase "${opts.phase}", which is not declared in meta.phases`);
    }
    trace.agents.push(rec);

    return new Promise(resolve => {
      const start = () => {
        running++;
        peak = Math.max(peak, running);
        rec.start = now;
        rec.status = 'running';
        let resp;
        try {
          resp = fixture.respond({
            id: rec.id, prompt, label: opts.label, phase: rec.phase, schema: opts.schema,
            model: opts.model, effort: opts.effort, args, state, now,
          }) || {};
        } catch (e) {
          resp = { fail: `fixture error: ${e.message}` };
        }
        schedule(resp.duration ?? 1000, () => {
          rec.end = now;
          rec.tokens = resp.tokens ?? 400;
          spent += rec.tokens;
          release();
          if (resp.fail) {
            rec.status = 'failed';
            rec.output = null;
            rec.note = resp.fail;
            return resolve(null);
          }
          let out = resp.output;
          if (opts.schema) {
            if (typeof out === 'string') out = fillSchema(opts.schema, out, resp.hints || {});
            const errs = validate(out, opts.schema);
            if (errs.length) {
              rec.status = 'failed';
              rec.output = null;
              rec.note = `the subagent never produced output matching your schema (${errs[0]})`;
              warn(`agent #${rec.id} "${rec.label}" resolved to null: its output never matched your schema (${errs[0]})`);
              return resolve(null);
            }
            out = clone(out);
          } else if (typeof out !== 'string') {
            out = out && typeof out === 'object' ? JSON.stringify(out) : String(out ?? '');
          }
          rec.status = 'done';
          rec.output = clone(out);
          resolve(out);
        });
      };
      if (running < concurrency) start();
      else waiting.push(start);
    });
  }

  function parallel(thunks) {
    if (!Array.isArray(thunks)) return Promise.reject(new TypeError(`parallel() expects an array of thunks, got ${describe(thunks)}`));
    if (thunks.length > 4096) return Promise.reject(new Error('parallel() accepts at most 4096 items'));
    return Promise.all(thunks.map((t, i) => {
      if (typeof t !== 'function') {
        if (t && typeof t.then === 'function') t.then(() => {}, () => {});
        warn(`parallel(): item ${i} is ${describe(t)}, not a function, so it resolved to null. Wrap each call as a thunk: () => agent(...)`);
        return null;
      }
      return Promise.resolve().then(t).catch(e => {
        warn(`parallel(): thunk ${i} threw "${e && e.message}" and resolved to null`);
        return null;
      });
    }));
  }

  function pipeline(items, ...stages) {
    if (!Array.isArray(items)) return Promise.reject(new TypeError(`pipeline() expects an array of items, got ${describe(items)}`));
    if (items.length > 4096) return Promise.reject(new Error('pipeline() accepts at most 4096 items'));
    const bad = stages.findIndex(s => typeof s !== 'function');
    if (bad >= 0) return Promise.reject(new TypeError(`pipeline(): stage ${bad + 1} is ${describe(stages[bad])}, not a function`));
    return Promise.all(items.map(async (item, index) => {
      let prev = item;
      for (let s = 0; s < stages.length; s++) {
        try {
          prev = await stages[s](prev, item, index);
        } catch (e) {
          warn(`pipeline(): stage ${s + 1} threw "${e && e.message}" for item ${index}, which was dropped to null`);
          return null;
        }
      }
      return prev;
    }));
  }

  function phase(title) {
    currentPhase = String(title);
    trace.phases.push({ at: now, title: currentPhase });
    if (declaredPhases.size && !declaredPhases.has(currentPhase)) {
      warn(`phase("${currentPhase}") is not declared in meta.phases; titles must match exactly`);
    }
  }

  let warnedLogObject = false;
  let warnedLogArgs = false;
  function log(message, ...extra) {
    if (extra.length && !warnedLogArgs) {
      warnedLogArgs = true;
      warn(`log() takes one message string; ${extra.length} extra argument(s) were ignored. Build one string, e.g. log(\`scan \${module}\`).`);
    }
    let text = message;
    if (typeof message === 'function') {
      text = `[function ${message.name || 'anonymous'}]`;
      if (!warnedLogObject) {
        warnedLogObject = true;
        warn(`log() received the function ${message.name || '(anonymous)'}, not a string. Did you mean to log a name or a value?`);
      }
    } else if (typeof message !== 'string') {
      try {
        text = JSON.stringify(message) ?? String(message);
      } catch {
        text = String(message);
      }
      if (message !== null && typeof message === 'object' && !warnedLogObject) {
        warnedLogObject = true;
        warn('log() received an object. The dojo shows it as JSON, but the real log(message) expects a string: wrap it in JSON.stringify(...).');
      }
    }
    trace.logs.push({ at: now, phase: currentPhase, message: text });
  }

  const budget = Object.freeze({
    total: budgetTotal,
    spent: () => spent,
    remaining: () => (budgetTotal == null ? Infinity : Math.max(0, budgetTotal - spent)),
  });

  const workflow = () => Promise.reject(new Error('workflow() sub-workflows are not simulated in the dojo'));

  const RealDate = Date;
  function SafeDate(...a) {
    if (!new.target || a.length === 0) {
      throw new Error('Date()/new Date() without arguments is unavailable in workflow scripts (it would break resume). Pass timestamps in via args.');
    }
    return new RealDate(...a);
  }
  SafeDate.now = () => {
    throw new Error('Date.now() is unavailable in workflow scripts (it would break resume). Pass timestamps in via args, or stamp results after the workflow returns.');
  };
  SafeDate.parse = RealDate.parse;
  SafeDate.UTC = RealDate.UTC;
  SafeDate.prototype = RealDate.prototype;
  const SafeMath = Object.create(Math, {
    random: {
      value: () => {
        throw new Error('Math.random() is unavailable in workflow scripts (it would break resume). Vary the prompt or label by index instead.');
      },
    },
  });

  let done = false;
  let result;
  let error;
  const realStart = clock();
  fn(clone(meta), agent, parallel, pipeline, phase, log, clone(args), budget, workflow, SafeDate, SafeMath).then(
    r => {
      done = true;
      result = r;
    },
    e => {
      done = true;
      error = e instanceof Error ? e : new Error(String(e));
    },
  );

  while (!done) {
    await defaultTick();
    if (done) break;
    if (clock() - realStart > realTimeoutMs) {
      error = new Error(`Real-time limit exceeded (${realTimeoutMs} ms). Is a loop spinning without awaiting an agent?`);
      break;
    }
    if (!timers.length) {
      error = new Error('Deadlock: the script is awaiting a promise that can never resolve (no agents are running)');
      break;
    }
    timers.sort((a, b) => a.at - b.at || a.seq - b.seq);
    const t = timers.shift();
    now = t.at;
    t.fire();
  }

  if (error) {
    return finish({ ok: false, meta, error: { name: error.name || 'Error', message: error.message, line: errorLine(error) } });
  }
  return finish({ ok: true, meta, result: clone(result) });
}
