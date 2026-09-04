import { Question } from '@skillbridge/types';

/**
 * Curated diagnostic question bank for the Junior Backend role.
 *
 * On each diagnostic attempt the backend draws a random, sub-skill-balanced
 * subset of these questions so retakes show a fresh set. Questions deliberately
 * vary wording/values so alternatives feel different across attempts.
 */

const BANK: Question[] = [
  // ============================================================
  // Event Loop & Microtasks
  // ============================================================
  {
    id: 'd_q_el_01',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'Which of the following code snippets prints the output "1, 4, cannotLog"?',
    codeSnippet: `console.log('1');
function tricky() {
  try {
    setTimeout(() => console.log('2'), 0);
    Promise.resolve().then(() => console.log('cannotLog'));
  } catch (e) {
    console.log('3');
  }
}
tricky();
console.log('4');`,
    questionType: 'OUTPUT_PREDICTION',
    options: [
      '1, 4, 3, 2',
      '1, 4, cannotLog, 2',
      '1, cannotLog, 4, 2',
      '1, 4, 2, cannotLog'
    ],
    correctAnswer: '1, 4, cannotLog, 2',
    explanation:
      'Synchronous code runs first, so 1 then 4 print immediately. Microtask callbacks (the resolved Promise) run before the macrotask queue, so cannotLog prints before the setTimeout callback 2. The try/catch does not catch async throwaway errors here.',
    subSkill: 'Event Loop & Microtasks',
    difficulty: 'Intermediate',
    points: 15
  },
  {
    id: 'd_q_el_02',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'In the Node.js event loop, what is the correct processing order for the given callback phases?',
    questionType: 'MCQ',
    options: [
      'Timers -> I/O callbacks -> poll -> check -> close',
      'Check -> Timers -> close -> poll -> I/O callbacks',
      'Poll -> check -> timers -> I/O callbacks -> close',
      'Timers -> poll -> check -> I/O callbacks -> close'
    ],
    correctAnswer: 'Timers -> I/O callbacks -> poll -> check -> close',
    explanation:
      'Each iteration runs pending timers, then pending I/O callbacks, then the poll phase (which blocks awaiting I/O), then setImmediate callbacks in the check phase, and finally close callbacks.',
    subSkill: 'Event Loop & Microtasks',
    difficulty: 'Intermediate',
    points: 15
  },

  // ============================================================
  // Express Error Handling & Async
  // ============================================================
  {
    id: 'd_q_ex_01',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'Which of the following about forwarding errors in Express 4+ is TRUE?',
    questionType: 'MCQ',
    options: [
      'Throwing inside an async route handler is automatically caught and passed to error middleware.',
      'You must call next(err) to route async errors to the error-handling middleware; thrown errors inside async functions are not automatically caught.',
      'res.sendStatus(500) automatically triggers the global error handler.',
      'Errors are ignored once a response has been sent.',
    ],
    correctAnswer:
      'You must call next(err) to route async errors to the error-handling middleware; thrown errors inside async functions are not automatically caught.',
    explanation:
      'Express 4 does not automatically catch rejected promises from async handlers. You must call next(err), or wrap with a helper, so the error is passed to middleware with the (err, req, res, next) signature.',
    subSkill: 'Express Error Handling',
    difficulty: 'Intermediate',
    points: 15
  },
  {
    id: 'd_q_ex_02',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'What should go in the placeholder to correctly handle the async error in this Express route?',
    codeSnippet: `app.get('/stats', async (req, res, next) => {
  try {
    const stats = await db.computeStats();
    res.json(stats);
  } catch (err) {
    // placeholder
  }
});`,
    questionType: 'CODE_DEBUG',
    options: ['throw err;', 'return err;', 'next(err);', 'res.status(500).send();'],
    correctAnswer: 'next(err);',
    explanation:
      'next(err) signals Express to skip to the error-handling middleware, matching the (err, req, res, next) signature expected there.',
    subSkill: 'Express Error Handling',
    difficulty: 'Intermediate',
    points: 15
  },

  // ============================================================
  // SQL Aggregations
  // ============================================================
  {
    id: 'd_q_sql_01',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'Which SQL clause is used to apply a condition to GROUPS produced by GROUP BY (after aggregation), not to individual rows?',
    questionType: 'MCQ',
    options: ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'],
    correctAnswer: 'HAVING',
    explanation:
      'WHERE filters raw rows before grouping; HAVING filters the aggregated groups produced by GROUP BY.',
    subSkill: 'SQL Aggregations',
    difficulty: 'Beginner',
    points: 15
  },
  {
    id: 'd_q_sql_02',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'For the table below, which query returns only departments with an average salary ABOVE 70000?',
    codeSnippet: `employees(id, name, dept, salary)
(1,'Ann','Eng',90000)
(2,'Bob','Eng',80000)
(3,'Cid','Sales',50000)
(4,'Dan','Sales',40000)`,
    questionType: 'SQL_QUERY',
    options: [
      'SELECT dept FROM employees WHERE AVG(salary) > 70000 GROUP BY dept;',
      'SELECT dept FROM employees GROUP BY dept HAVING AVG(salary) > 70000;',
      'SELECT dept FROM employees HAVING AVG(salary) > 70000 GROUP BY dept;',
      'SELECT dept FROM employees WHERE salary > 70000 GROUP BY dept;'
    ],
    correctAnswer: 'SELECT dept FROM employees GROUP BY dept HAVING AVG(salary) > 70000;',
    explanation:
      'HAVING filters aggregated groups: only the Eng group (avg 85000) qualifies. WHERE cannot reference aggregates, and it is written before GROUP BY.',
    subSkill: 'SQL Aggregations',
    difficulty: 'Intermediate',
    points: 15
  },

  // ============================================================
  // PostgreSQL Indexing
  // ============================================================
  {
    id: 'd_q_pg_01',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'Why can a B-Tree index dramatically speed up equality and range lookups while adding write overhead?',
    questionType: 'MCQ',
    options: [
      'It compresses the heap table into a single array in memory.',
      'It lets the planner locate rows in O(log N) time, but INSERT/UPDATE/DELETE must also maintain the balanced tree.',
      'It disables MVCC so reads never block.',
      'It replaces the base table so no separate lookup is needed.'
    ],
    correctAnswer:
      'It lets the planner locate rows in O(log N) time, but INSERT/UPDATE/DELETE must also maintain the balanced tree.',
    explanation:
      'B-Tree indexes keep keys sorted for fast search; every write that changes an indexed column must keep the tree balanced, adding overhead to writes.',
    subSkill: 'PostgreSQL Indexing',
    difficulty: 'Intermediate',
    points: 20
  },
  {
    id: 'd_q_pg_02',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'Which scenario is the WORST use of a standard B-Tree index?',
    questionType: 'MCQ',
    options: [
      'frequent exact-match lookups on a high-cardinality column',
      'range queries on a low-cardinality column ordered by index',
      'searching on a column that is frequently wrapped in a function such as LOWER(name) without a matching expression index',
      'ORDER BY on the leading index column'
    ],
    correctAnswer:
      'searching on a column that is frequently wrapped in a function such as LOWER(name) without a matching expression index',
    explanation:
      "Applying a function to the indexed column prevents the planner from using a plain B-Tree index; you would need an expression index like CREATE INDEX ON t (LOWER(name)).",
    subSkill: 'PostgreSQL Indexing',
    difficulty: 'Intermediate',
    points: 20
  },

  // ============================================================
  // RESTful Semantics
  // ============================================================
  {
    id: 'd_q_rest_01',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'Which HTTP method replaces a resource wholesale and is idempotent?',
    questionType: 'MCQ',
    options: ['POST', 'PATCH', 'PUT', 'DELETE'],
    correctAnswer: 'PUT',
    explanation:
      'PUT fully replaces the target resource and repeated identical calls produce the same state (idempotent). PATCH performs partial updates.',
    subSkill: 'RESTful Semantics',
    difficulty: 'Beginner',
    points: 15
  },
  {
    id: 'd_q_rest_02',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'A client submits the same POST to /orders twice by accident. What should a well-designed API do to avoid creating two duplicate orders?',
    questionType: 'MCQ',
    options: [
      'Return 400 on the second call because POST is non-idempotent.',
      'Require an idempotency key header and return the first order for repeated keys.',
      'Generate a random order id on the server so duplicates are distinct.',
      'Use PUT for order creation instead.'
    ],
    correctAnswer:
      'Require an idempotency key header and return the first order for repeated keys.',
    explanation:
      'Idempotency keys let the server recognize retries (same key) and return the previously-created resource, preventing duplicate side effects from non-idempotent POSTs.',
    subSkill: 'RESTful Semantics',
    difficulty: 'Intermediate',
    points: 15
  },

  // ============================================================
  // Docker Multi-stage Builds
  // ============================================================
  {
    id: 'd_q_dk_01',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'What is the main benefit of a multi-stage Dockerfile for a TypeScript/Node production build?',
    codeSnippet: `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/main.js"]`,
    questionType: 'MCQ',
    options: [
      'It runs the app across multiple hosts for load balancing.',
      'It strips devDependencies, transpilers, and build tools from the final image, shrinking size and attack surface.',
      'It lets two server processes share one image to increase throughput.',
      'It automatically pushes the image to a registry on build.'
    ],
    correctAnswer:
      'It strips devDependencies, transpilers, and build tools from the final image, shrinking size and attack surface.',
    explanation:
      'The builder stage compiles the app and keeps dev tooling; the runner stage copies only the dist output and production deps, producing a lean, more secure image.',
    subSkill: 'Docker Multi-stage Builds',
    difficulty: 'Intermediate',
    points: 20
  },
  {
    id: 'd_q_dk_02',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'A production image should ideally run as a NON-root user. Which Dockerfile line accomplishes that?',
    questionType: 'MCQ',
    options: [
      'RUN chmod 777 /app',
      'USER node',
      'ENV NODE_ENV=production',
      'EXPOSE 3000'
    ],
    correctAnswer: 'USER node',
    explanation:
      'USER switches the context to the node user (provided by the node base image), so the process does not run with root privileges — reducing blast radius.',
    subSkill: 'Docker Multi-stage Builds',
    difficulty: 'Beginner',
    points: 15
  },

  // ============================================================
  // Node.js / Async / Streams
  // ============================================================
  {
    id: 'd_q_nd_01',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'Which construct correctly limits concurrency so no more than N async tasks run at once?',
    questionType: 'OUTPUT_PREDICTION',
    codeSnippet: `async function limited(items, limit, fn) {
  const workers = [];
  const queue = [...items];
  for (let i = 0; i < limit; i++) {
    workers.push((async () => {
      while (queue.length) {
        const item = queue.shift();
        await fn(item);
      }
    })());
  }
  return Promise.all(workers);
}`,
    options: [
      'Promise.all over N workers pulling from a shared queue — correct concurrency cap.',
      'It runs items sequentially one at a time.',
      'It ignores the limit and runs everything in parallel.',
      'It will deadlock because shift() blocks.'
    ],
    correctAnswer:
      'Promise.all over N workers pulling from a shared queue — correct concurrency cap.',
    explanation:
      'Each worker loops over the shared queue; because only N workers start, at most N tasks are in flight at once, and Promise.all awaits completion.',
    subSkill: 'Async Concurrency',
    difficulty: 'Intermediate',
    points: 20
  },
  {
    id: 'd_q_nd_02',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'Why is piping a large API response through a readable stream (instead of reading the whole body into memory) preferred for high-traffic proxies?',
    questionType: 'MCQ',
    options: [
      'Streams compress payloads automatically.',
      'Streams process data in chunks with bounded backpressure, keeping memory usage constant regardless of payload size.',
      'Streams bypass the event loop entirely.',
      'Streams are required for HTTPS responses.'
    ],
    correctAnswer:
      'Streams process data in chunks with bounded backpressure, keeping memory usage constant regardless of payload size.',
    explanation:
      'Piping chunks with backpressure means only a bounded window of data is buffered, so a 2 GB response does not require a 2 GB buffer.',
    subSkill: 'Streams & Memory',
    difficulty: 'Intermediate',
    points: 20
  },

  // ============================================================
  // Security / Auth
  // ============================================================
  {
    id: 'd_q_sec_01',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'How should a password be stored in a production PostgreSQL-backed Node.js API?',
    questionType: 'MCQ',
    options: [
      'As a salted, slow hash such as bcrypt with an appropriate cost factor.',
      'As a SHA-256 digest of the plaintext.',
      'As plaintext in an encrypted column.',
      'As a JWT stored in the users table.'
    ],
    correctAnswer:
      'As a salted, slow hash such as bcrypt with an appropriate cost factor.',
    explanation:
      'Slow adaptive hashes (bcrypt/scrypt/argon2) resist brute-force and rainbow-table attacks far better than fast digests like plain SHA-256.',
    subSkill: 'Authentication & Security',
    difficulty: 'Intermediate',
    points: 20
  },
  {
    id: 'd_q_sec_02',
    assessmentId: 'assessment_backend_diagnostic',
    prompt: 'Which is the correct way to protect a JSON API from SQL injection when using parameterized queries?',
    questionType: 'CODE_DEBUG',
    codeSnippet: `// which approach is safe?
// A:
await db.query('SELECT * FROM users WHERE email = ' + email);
// B:
await db.query('SELECT * FROM users WHERE email = $1', [email]);`,
    options: [
      'A, because string concatenation is faster.',
      'B, because parameters are sent separately and never concatenated into the SQL text.',
      'Both are equally safe.',
      'Neither; you must escape quotes manually.'
    ],
    correctAnswer:
      'B, because parameters are sent separately and never concatenated into the SQL text.',
    explanation:
      'Parameterized queries pass values separately from the SQL text, so attacker input can never alter the SQL structure — eliminating injection.',
    subSkill: 'Authentication & Security',
    difficulty: 'Intermediate',
    points: 20
  }
];

export function getAllBankQuestions(): Question[] {
  return BANK.map(q => ({ ...q, options: [...(q.options || [])] }));
}

/** In-place Fisher-Yates shuffle of an array. Returns the same array. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface DiagnosticOptions {
  /** Number of questions to include (default 8). */
  count?: number;
  /** Force one question per listed sub-skill before filling remaining slots. */
  balanceSubSkills?: boolean;
}

/**
 * Draw a random, sub-skill-balanced subset of diagnostic questions for one
 * attempt. Returns only answer-omitted "client-safe" questions so the correct
 * answer is never leaked to the browser before submission.
 */
export function drawDiagnosticQuestions(opts: DiagnosticOptions = {}): Question[] {
  const count = Math.max(1, Math.min(BANK.length, opts.count ?? 8));
  const balance = opts.balanceSubSkills !== false;

  const picked: Question[] = [];
  if (balance) {
    // Group by sub-skill and take one from each to guarantee coverage.
    const bySkill = new Map<string, Question[]>();
    for (const q of BANK) {
      const list = bySkill.get(q.subSkill) || [];
      list.push(q);
      bySkill.set(q.subSkill, list);
    }
    const skills = shuffle(Array.from(bySkill.values()));
    for (const group of skills) {
      if (picked.length >= count) break;
      picked.push(shuffle([...group])[0]);
    }
  }

  // Fill remaining slots with random unused questions.
  const used = new Set(picked.map(q => q.id));
  const rest = shuffle(BANK.filter(q => !used.has(q.id)));
  for (const q of rest) {
    if (picked.length >= count) break;
    picked.push(q);
  }

  const result = picked.slice(0, count).map(q => ({
    ...q,
    correctAnswer: undefined,
    explanation: undefined
  }));
  // Re-add optional/union-safe fields; strip answer-bearing fields entirely.
  return result.map(({ correctAnswer: _ca, explanation: _ex, ...rest }) => rest as Question);
}
