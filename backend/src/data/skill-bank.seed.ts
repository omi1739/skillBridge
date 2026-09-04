/**
 * Seed data for the skill-centric assessment question bank.
 *
 * These questions use the NEW skill-bank shape: easy/medium/hard difficulty,
 * AssessmentQuestionType question types, and a verification_status. They are
 * inserted into the shared `questions` table (assessment_id NULL) with
 * skill_id/topic set so they can be selected for assessments.
 */

export interface SkillBankSeedTopic {
  id: string;
  skillId: string;
  name: string;
  description: string;
}

export interface SkillBankSeedQuestion {
  id: string;
  skillId: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'MCQ' | 'multiple_select' | 'true_false' | 'code_output';
  questionText: string;
  codeSnippet?: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
}

export const SKILL_BANK_TOPICS: SkillBankSeedTopic[] = [
  { id: 'topic_js_functions', skillId: 'skill_javascript', name: 'Functions', description: 'Function declarations, expressions, arrow functions, closures.' },
  { id: 'topic_js_arrays', skillId: 'skill_javascript', name: 'Arrays', description: 'Array iteration, methods, destructuring.' },
  { id: 'topic_js_promises', skillId: 'skill_javascript', name: 'Promises & Async', description: 'Promise chains, async/await, error handling.' },
  { id: 'topic_node_core', skillId: 'skill_nodejs', name: 'Node.js Core', description: 'Event loop, modules, streams, buffers.' },
  { id: 'topic_node_http', skillId: 'skill_nodejs', name: 'HTTP & Routing', description: 'Request/response, middleware, routing.' }
];

export const SKILL_BANK_QUESTIONS: SkillBankSeedQuestion[] = [
  // ---- JavaScript - Functions (easy / medium / hard) ----
  {
    id: 'q_js_func_easy_01',
    skillId: 'skill_javascript',
    topic: 'Functions',
    difficulty: 'easy',
    questionType: 'MCQ',
    questionText: 'What does the following code log?',
    codeSnippet: "const greet = (name) => `Hello, ${name}!`;\nconsole.log(greet('Ada'));",
    options: ['Hello, name!', 'Hello, Ada!', 'Hello, greet!', 'ReferenceError'],
    correctAnswer: 'Hello, Ada!',
    explanation: 'Arrow function greet interpolates the name argument; greet(\'Ada\') returns \'Hello, Ada!\'.'
  },
  {
    id: 'q_js_func_easy_02',
    skillId: 'skill_javascript',
    topic: 'Functions',
    difficulty: 'easy',
    questionType: 'MCQ',
    questionText: 'Which of the following is a valid way to declare a function?',
    options: ['function myFn() {}', 'const myFn = () => {}', 'Both A and B', 'None of the above'],
    correctAnswer: 'Both A and B',
    explanation: 'A function declaration and an arrow function assigned to a const are both valid ways to define a function.'
  },
  {
    id: 'q_js_func_easy_03',
    skillId: 'skill_javascript',
    topic: 'Functions',
    difficulty: 'easy',
    questionType: 'MCQ',
    questionText: 'What value does `console.log(typeof function() {})` print?',
    options: ['object', 'function', 'undefined', 'string'],
    correctAnswer: 'function',
    explanation: 'In JavaScript, functions have the type "function".'
  },
  {
    id: 'q_js_func_easy_04',
    skillId: 'skill_javascript',
    topic: 'Functions',
    difficulty: 'easy',
    questionType: 'true_false',
    questionText: 'A function can be assigned to a variable.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    explanation: 'Functions are first-class values in JavaScript and can be assigned, passed, and returned.'
  },
  {
    id: 'q_js_func_medium_02',
    skillId: 'skill_javascript',
    topic: 'Functions',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'What is the result of the following expression?',
    codeSnippet: "const add = (a, b = 10) => a + b;\nconsole.log(add(5));",
    options: ['15', '5', 'NaN', 'undefined'],
    correctAnswer: '15',
    explanation: 'The default parameter b = 10 is used, so 5 + 10 = 15.'
  },
  {
    id: 'q_js_func_medium_03',
    skillId: 'skill_javascript',
    topic: 'Functions',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'What does the following code output?',
    codeSnippet: "const obj = {\n  value: 42,\n  getValue: function() { return this.value; }\n};\nconsole.log(obj.getValue());",
    options: ['undefined', '42', 'this', 'Error'],
    correctAnswer: '42',
    explanation: 'When called as a method, `this` refers to obj, so this.value is 42.'
  },
  {
    id: 'q_js_func_medium_04',
    skillId: 'skill_javascript',
    topic: 'Functions',
    difficulty: 'medium',
    questionType: 'code_output',
    questionText: 'What is the returned value?',
    codeSnippet: "const multiply = (a) => (b) => a * b;\nconst double = multiply(2);\nconst result = double(7);",
    options: undefined,
    correctAnswer: '14',
    explanation: 'Curried function: multiply(2) returns a function that doubles its argument, so 2 * 7 = 14.'
  },
  {
    id: 'q_js_func_medium_05',
    skillId: 'skill_javascript',
    topic: 'Functions',
    difficulty: 'medium',
    questionType: 'true_false',
    questionText: 'Arrow functions create their own `this` binding.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    explanation: 'Arrow functions do not bind their own `this`; they inherit `this` from the enclosing lexical scope.'
  },
  {
    id: 'q_js_func_hard_02',
    skillId: 'skill_javascript',
    topic: 'Functions',
    difficulty: 'hard',
    questionType: 'code_output',
    questionText: 'What is logged by the following IIFE?',
    codeSnippet:
"let x = 1;\nconsole.log((() => x + 1)());\nconsole.log(x);",
    options: undefined,
    correctAnswer: '2\n1',
    explanation: 'The IIFE returns the value 1 + 1 = 2 without mutating x, so x remains 1.'
  },
  {
    id: 'q_js_func_hard_03',
    skillId: 'skill_javascript',
    topic: 'Functions',
    difficulty: 'hard',
    questionType: 'MCQ',
    questionText: 'What is the output of this code?',
    codeSnippet:
"function a() { return b(); }\nfunction b() { return 5; }\nconsole.log(a());",
    options: ['5', 'undefined', 'ReferenceError', 'NaN'],
    correctAnswer: '5',
    explanation: 'Function declarations are hoisted, so b is available when a is invoked, calling the hoisted b which returns 5.'
  },
  {
    id: 'q_js_func_hard_04',
    skillId: 'skill_javascript',
    topic: 'Functions',
    difficulty: 'hard',
    questionType: 'MCQ',
    questionText: 'What is the value of `typeof` for the result of a bounded function?',
    codeSnippet: "function greet() { return 'hi'; }\nconst bound = greet.bind(null);\nconsole.log(typeof bound);",
    options: ['function', 'object', 'bound', 'undefined'],
    correctAnswer: 'function',
    explanation: 'Function.prototype.bind returns a new function, whose type is "function".'
  },
  {
    id: 'q_js_func_medium_01',
    skillId: 'skill_javascript',
    topic: 'Functions',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'What does this program output and why?',
    codeSnippet: "let count = 0;\nfunction inc() { count += 1; }\ninc();\ninc();\nconsole.log(count);",
    options: ['0', '1', '2', 'NaN'],
    correctAnswer: '2',
    explanation: 'The function mutates the outer variable count, incrementing it twice from 0 to 2.'
  },
  {
    id: 'q_js_func_hard_01',
    skillId: 'skill_javascript',
    topic: 'Functions',
    difficulty: 'hard',
    questionType: 'MCQ',
    questionText: 'What is logged, and what does this demonstrate about closures?',
    codeSnippet:
"for (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}",
    options: ['0 1 2', '3 3 3', '0 0 0', 'undefined repeated'],
    correctAnswer: '0 1 2',
    explanation: '`let` creates a new binding per iteration, so each timeout closure captures its own i, logging 0, 1, 2.'
  },

  // ---- JavaScript - Arrays (easy / medium / hard) ----
  {
    id: 'q_js_arr_easy_01',
    skillId: 'skill_javascript',
    topic: 'Arrays',
    difficulty: 'easy',
    questionType: 'code_output',
    questionText: 'What is the value of result?',
    codeSnippet: "const nums = [1, 2, 3, 4];\nconst result = nums.filter(n => n % 2 === 0);",
    options: undefined,
    correctAnswer: '2,4',
    explanation: 'filter keeps only even numbers, producing [2, 4].'
  },
  {
    id: 'q_js_arr_easy_02',
    skillId: 'skill_javascript',
    topic: 'Arrays',
    difficulty: 'easy',
    questionType: 'MCQ',
    questionText: 'Which method adds one or more elements to the end of an array?',
    options: ['push()', 'unshift()', 'pop()', 'shift()'],
    correctAnswer: 'push()',
    explanation: 'push() appends elements to the end of an array.'
  },
  {
    id: 'q_js_arr_easy_03',
    skillId: 'skill_javascript',
    topic: 'Arrays',
    difficulty: 'easy',
    questionType: 'code_output',
    questionText: 'What is the length of the following array after the operation?',
    codeSnippet: "const arr = [1, 2, 3];\narr.push(4);\nconst len = arr.length;",
    options: undefined,
    correctAnswer: '4',
    explanation: 'After pushing one element, the array has 4 elements.'
  },
  {
    id: 'q_js_arr_medium_02',
    skillId: 'skill_javascript',
    topic: 'Arrays',
    difficulty: 'medium',
    questionType: 'code_output',
    questionText: 'What does the following expression produce?',
    codeSnippet: "const nums = [1, 2, 3, 4, 5];\nconst result = nums.map(n => n * 2).filter(n => n > 5);",
    options: undefined,
    correctAnswer: '6,8,10',
    explanation: 'map produces [2,4,6,8,10], then filter keeps 6, 8, 10.'
  },
  {
    id: 'q_js_arr_medium_03',
    skillId: 'skill_javascript',
    topic: 'Arrays',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'What is the value of `result`?',
    codeSnippet: "const arr = ['a', 'b', 'c'];\nconst result = arr.slice(0, 2);",
    options: ["['a', 'b']", "['a', 'b', 'c']", "['a']", "['b', 'c']"],
    correctAnswer: "['a', 'b']",
    explanation: 'slice(0, 2) copies the elements at indices 0 and 1, i.e. [\'a\', \'b\'].'
  },
  {
    id: 'q_js_arr_medium_04',
    skillId: 'skill_javascript',
    topic: 'Arrays',
    difficulty: 'medium',
    questionType: 'code_output',
    questionText: 'What does the following return?',
    codeSnippet: "const words = ['apple', 'banana', 'cherry'];\nconst result = words.includes('banana');",
    options: undefined,
    correctAnswer: 'true',
    explanation: 'includes checks for a value and returns boolean; the array contains \'banana\'.'
  },
  {
    id: 'q_js_arr_medium_05',
    skillId: 'skill_javascript',
    topic: 'Arrays',
    difficulty: 'medium',
    questionType: 'true_false',
    questionText: 'The `map()` method changes the length of the original array.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    explanation: 'map() returns a new array of the same length and does not mutate the original.'
  },
  {
    id: 'q_js_arr_hard_02',
    skillId: 'skill_javascript',
    topic: 'Arrays',
    difficulty: 'hard',
    questionType: 'code_output',
    questionText: 'What is the result of this reduce expression?',
    codeSnippet: "const data = [{v: 1}, {v: 2}, {v: 3}];\nconst total = data.reduce((acc, item) => acc + item.v, 0);",
    options: undefined,
    correctAnswer: '6',
    explanation: 'reduce sums the v values: 1 + 2 + 3 = 6.'
  },
  {
    id: 'q_js_arr_hard_03',
    skillId: 'skill_javascript',
    topic: 'Arrays',
    difficulty: 'hard',
    questionType: 'MCQ',
    questionText: 'Given the code below, which value is logged?',
    codeSnippet:
"const a = [[1, 2], [3, 4]];\nconst flat = a.flat();\nconsole.log(flat.length);",
    options: ['2', '4', '1', 'NaN'],
    correctAnswer: '4',
    explanation: 'flat() flattens one level, producing [1, 2, 3, 4] with length 4.'
  },
  {
    id: 'q_js_arr_hard_04',
    skillId: 'skill_javascript',
    topic: 'Arrays',
    difficulty: 'hard',
    questionType: 'multiple_select',
    questionText: 'Which of the following are pure (non-mutating) array operations?',
    options: ['map()', 'splice()', 'filter()', 'sort()', 'concat()'],
    correctAnswer: ['map()', 'filter()', 'concat()'],
    explanation: 'map, filter, and concat return new arrays without modifying the original; splice and sort mutate in place.'
  },
  {
    id: 'q_js_arr_medium_01',
    skillId: 'skill_javascript',
    topic: 'Arrays',
    difficulty: 'medium',
    questionType: 'code_output',
    questionText: 'What does the following expression evaluate to?',
    codeSnippet: "const total = [1, 2, 3, 4].reduce((acc, n) => acc + n, 0);",
    options: undefined,
    correctAnswer: '10',
    explanation: 'reduce sums the array: 1+2+3+4 = 10.'
  },
  {
    id: 'q_js_arr_hard_01',
    skillId: 'skill_javascript',
    topic: 'Arrays',
    difficulty: 'hard',
    questionType: 'multiple_select',
    questionText: 'Which of the following methods mutate the original array in place?',
    options: ['sort()', 'filter()', 'push()', 'map()', 'splice()'],
    correctAnswer: ['sort()', 'push()', 'splice()'],
    explanation: 'sort, push, and splice mutate the original array; filter and map return new arrays.'
  },

  // ---- JavaScript - Promises & Async (easy / medium / hard) ----
  {
    id: 'q_js_asy_easy_01',
    skillId: 'skill_javascript',
    topic: 'Promises & Async',
    difficulty: 'easy',
    questionType: 'true_false',
    questionText: 'The keyword `await` can only be used inside an `async` function.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    explanation: '`await` is only valid inside async functions (or top-level modules in modern environments).'
  },
  {
    id: 'q_js_asy_easy_02',
    skillId: 'skill_javascript',
    topic: 'Promises & Async',
    difficulty: 'easy',
    questionType: 'MCQ',
    questionText: 'What does `Promise.resolve()` return?',
    options: ['A resolved promise', 'A rejected promise', 'undefined', 'null'],
    correctAnswer: 'A resolved promise',
    explanation: 'Promise.resolve returns a promise that resolves with the given value (or the value itself if it is already a promise).'
  },
  {
    id: 'q_js_asy_easy_03',
    skillId: 'skill_javascript',
    topic: 'Promises & Async',
    difficulty: 'easy',
    questionType: 'MCQ',
    questionText: 'Which statement correctly describes an async function?',
    options: [
      'It always returns a Promise',
      'It cannot use await',
      'It blocks the event loop',
      'It can only be called once'
    ],
    correctAnswer: 'It always returns a Promise',
    explanation: 'An async function always returns a Promise, simplifying asynchronous code with await.'
  },
  {
    id: 'q_js_asy_medium_02',
    skillId: 'skill_javascript',
    topic: 'Promises & Async',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'What is the output of the following promise chain?',
    codeSnippet:
"Promise.resolve(1)\n  .then(x => x + 1)\n  .then(x => console.log(x));",
    options: ['1', '2', 'undefined', 'NaN'],
    correctAnswer: '2',
    explanation: 'The first then transforms 1 plus 1 to 2, which is logged by the second then.'
  },
  {
    id: 'q_js_asy_medium_03',
    skillId: 'skill_javascript',
    topic: 'Promises & Async',
    difficulty: 'medium',
    questionType: 'true_false',
    questionText: '`Promise.all` resolves as soon as any single promise in the array rejects.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    explanation: 'Promise.all rejects immediately when any one of the input promises rejects (fail-fast).'
  },
  {
    id: 'q_js_asy_medium_04',
    skillId: 'skill_javascript',
    topic: 'Promises & Async',
    difficulty: 'medium',
    questionType: 'code_output',
    questionText: 'What is printed by this code?',
    codeSnippet:
"async function getValue() { return 42; }\ngetValue().then(v => console.log(v));",
    options: undefined,
    correctAnswer: '42',
    explanation: 'An async function resolving 42 returns a promise that resolves to 42.'
  },
  {
    id: 'q_js_asy_medium_05',
    skillId: 'skill_javascript',
    topic: 'Promises & Async',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'Which method runs a callback when a promise is rejected?',
    options: ['.then()', '.catch()', '.finally()', '.resolve()'],
    correctAnswer: '.catch()',
    explanation: '.catch() handles rejection of a promise chain.'
  },
  {
    id: 'q_js_asy_hard_02',
    skillId: 'skill_javascript',
    topic: 'Promises & Async',
    difficulty: 'hard',
    questionType: 'MCQ',
    questionText: 'What is the output of the following sequence?',
    codeSnippet:
"console.log(1);\nsetTimeout(() => console.log(2), 0);\nPromise.resolve().then(() => console.log(3));\nconsole.log(4);",
    options: ['1 4 3 2', '1 4 2 3', '1 2 3 4', '4 1 3 2'],
    correctAnswer: '1 4 3 2',
    explanation: 'Synchronous logs (1, 4) run first; microtasks (3) run before macrotasks (setTimeout → 2).'
  },
  {
    id: 'q_js_asy_hard_03',
    skillId: 'skill_javascript',
    topic: 'Promises & Async',
    difficulty: 'hard',
    questionType: 'true_false',
    questionText: 'An unhandled promise rejection will crash a Node.js process by default.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    explanation: 'In modern Node.js, unhandled rejections are treated as fatal and cause the process to exit unless handled.'
  },
  {
    id: 'q_js_asy_hard_04',
    skillId: 'skill_javascript',
    topic: 'Promises & Async',
    difficulty: 'hard',
    questionType: 'code_output',
    questionText: 'What does the following async function return?',
    codeSnippet:
"async function f() {\n  return Promise.reject(new Error('boom'));\n}\nf().then(() => console.log('ok')).catch(e => console.log('err:' + e.message));",
    options: undefined,
    correctAnswer: 'err:boom',
    explanation: 'The rejected promise propagates, and the catch handler logs "err:boom".'
  },
  {
    id: 'q_js_asy_medium_01',
    skillId: 'skill_javascript',
    topic: 'Promises & Async',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'What is the order of the console.log output?',
    codeSnippet:
"console.log('A');\nPromise.resolve().then(() => console.log('B'));\nconsole.log('C');",
    options: ['A B C', 'A C B', 'C A B', 'B A C'],
    correctAnswer: 'A C B',
    explanation: 'Synchronous code (A, C) runs first; the promise callback (B) runs as a microtask afterward.'
  },
  {
    id: 'q_js_asy_hard_01',
    skillId: 'skill_javascript',
    topic: 'Promises & Async',
    difficulty: 'hard',
    questionType: 'code_output',
    questionText: 'What does the following async function return?',
    codeSnippet:
"async function f() {\n  try {\n    return await Promise.reject('oops');\n  } catch (e) {\n    return 'caught:' + e;\n  }\n}\nf().then(console.log);",
    options: undefined,
    correctAnswer: 'caught:oops',
    explanation: 'The rejected promise is awaited inside try and caught, returning the string \'caught:oops\'.'
  },

  // ---- Node.js - Core (easy / medium / hard) ----
  {
    id: 'q_node_core_easy_01',
    skillId: 'skill_nodejs',
    topic: 'Node.js Core',
    difficulty: 'easy',
    questionType: 'MCQ',
    questionText: 'Which module is used to read environment variables in a Node.js application?',
    options: ['fs', 'process', 'path', 'http'],
    correctAnswer: 'process',
    explanation: 'process.env exposes environment variables in Node.js.'
  },
  {
    id: 'q_node_core_medium_01',
    skillId: 'skill_nodejs',
    topic: 'Node.js Core',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'In the Node.js event loop, which phase runs BEFORE timers are executed?',
    options: ['poll', 'close callbacks', 'check', 'microtasks'],
    correctAnswer: 'microtasks',
    explanation: 'Microtasks (promise callbacks and process.nextTick) are drained before each event loop phase, including timers.'
  },
  {
    id: 'q_node_core_hard_01',
    skillId: 'skill_nodejs',
    topic: 'Node.js Core',
    difficulty: 'hard',
    questionType: 'MCQ',
    questionText: 'Why is it a best practice to run CPU-bound work in a Worker Thread rather than blocking the main thread?',
    options: [
      'The main thread cannot handle I/O otherwise',
      'The event loop stays responsive so concurrent I/O requests are not blocked',
      'Worker threads automatically use multiple cores without any setup',
      'It reduces memory usage significantly'
    ],
    correctAnswer: 'The event loop stays responsive so concurrent I/O requests are not blocked',
    explanation: 'Synchronous CPU work blocks the single-threaded event loop; offloading it to Worker Threads keeps the loop responsive for I/O.'
  },

  // ---- Node.js - HTTP & Routing (easy / medium / hard) ----
  {
    id: 'q_node_http_easy_01',
    skillId: 'skill_nodejs',
    topic: 'HTTP & Routing',
    difficulty: 'easy',
    questionType: 'MCQ',
    questionText: 'Which HTTP status code means the requested resource was not found?',
    options: ['200', '301', '404', '500'],
    correctAnswer: '404',
    explanation: '404 Not Found indicates the server cannot find the requested resource.'
  },
  {
    id: 'q_node_http_medium_01',
    skillId: 'skill_nodejs',
    topic: 'HTTP & Routing',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'What is the purpose of middleware in an Express.js application?',
    options: [
      'To render HTML templates',
      'To handle requests sequentially before they reach route handlers',
      'To define the database schema',
      'To compile TypeScript at runtime'
    ],
    correctAnswer: 'To handle requests sequentially before they reach route handlers',
    explanation: 'Middleware functions run in order and can modify the request/response, handle auth, logging, parsing, etc., before route handlers.'
  },
  {
    id: 'q_node_http_hard_01',
    skillId: 'skill_nodejs',
    topic: 'HTTP & Routing',
    difficulty: 'hard',
    questionType: 'MCQ',
    questionText: 'How does Express.js route matching behave when multiple paths match the same request?',
    options: [
      'It only ever matches the first route and stops',
      'It runs all matching middleware and route handlers in order until the response is sent or the stack ends',
      'It throws an error for ambiguous routes',
      'It randomly selects one matching route'
    ],
    correctAnswer: 'It runs all matching middleware and route handlers in order until the response is sent or the stack ends',
    explanation: 'Express matches in registration order; each middleware can call next() to continue down the stack until a handler ends the response.'
  },

  // ---- Node.js - Core (extra easy / medium / hard) ----
  {
    id: 'q_node_core_easy_02',
    skillId: 'skill_nodejs',
    topic: 'Node.js Core',
    difficulty: 'easy',
    questionType: 'MCQ',
    questionText: 'Which of the following is a core module in Node.js?',
    options: ['http', 'jquery', 'lodash', 'axios'],
    correctAnswer: 'http',
    explanation: 'http is a core Node.js module; the others are third-party packages.'
  },
  {
    id: 'q_node_core_easy_03',
    skillId: 'skill_nodejs',
    topic: 'Node.js Core',
    difficulty: 'easy',
    questionType: 'MCQ',
    questionText: 'How do you load a local module named `math.js` in the same directory?',
    options: ["require('./math.js')", "require('math.js')", "import 'math.js'", "require('node:math')"],
    correctAnswer: "require('./math.js')",
    explanation: 'Use a relative path starting with ./ to load a local module.'
  },
  {
    id: 'q_node_core_medium_02',
    skillId: 'skill_nodejs',
    topic: 'Node.js Core',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'Which statement about Node.js streams is correct?',
    options: [
      'Streams process data piece by piece and are memory efficient',
      'Streams load the entire file into memory before processing',
      'Streams only work with network connections',
      'Streams are synchronous by default'
    ],
    correctAnswer: 'Streams process data piece by piece and are memory efficient',
    explanation: 'Streams let you process data incrementally (in chunks) so you do not need to buffer everything in memory.'
  },
  {
    id: 'q_node_core_medium_03',
    skillId: 'skill_nodejs',
    topic: 'Node.js Core',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'What does `process.nextTick` do?',
    options: [
      'Schedules a callback to run before the next event loop cycle (before microtasks/promises of the same phase)',
      'Runs the callback in a new OS thread',
      'Schedules a callback to run after all timers',
      'Returns a promise'
    ],
    correctAnswer: 'Schedules a callback to run before the next event loop cycle (before microtasks/promises of the same phase)',
    explanation: 'process.nextTick callbacks are executed at the end of the current operation, before the event loop continues.'
  },
  {
    id: 'q_node_core_hard_02',
    skillId: 'skill_nodejs',
    topic: 'Node.js Core',
    difficulty: 'hard',
    questionType: 'MCQ',
    questionText: 'What is the correct explanation of buffer pooling in Node.js?',
    options: [
      'Node.js reuses a shared pool of Buffer instances for small allocations to avoid GC pressure',
      'Buffers are stored on the heap without any reuse',
      'Buffer pooling happens only when using streams',
      'Buffers are automatically converted to strings'
    ],
    correctAnswer: 'Node.js reuses a shared pool of Buffer instances for small allocations to avoid GC pressure',
    explanation: 'For small Buffer allocations, Node.js maintains an internal pool so small allocations share backing memory.'
  },
  {
    id: 'q_node_core_hard_03',
    skillId: 'skill_nodejs',
    topic: 'Node.js Core',
    difficulty: 'hard',
    questionType: 'true_false',
    questionText: 'The Node.js event loop is single-threaded, but heavy I/O can run on the OS thread pool via libuv.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    explanation: 'The JavaScript event loop is single-threaded, but libuv wraps OS threads for operations like file I/O and DNS.'
  },

  // ---- Node.js - HTTP & Routing (extra easy / medium / hard) ----
  {
    id: 'q_node_http_easy_02',
    skillId: 'skill_nodejs',
    topic: 'HTTP & Routing',
    difficulty: 'easy',
    questionType: 'MCQ',
    questionText: 'Which HTTP verb is typically used to retrieve a resource?',
    options: ['GET', 'POST', 'DELETE', 'PATCH'],
    correctAnswer: 'GET',
    explanation: 'GET is used to fetch/read a resource without modifying it.'
  },
  {
    id: 'q_node_http_easy_03',
    skillId: 'skill_nodejs',
    topic: 'HTTP & Routing',
    difficulty: 'easy',
    questionType: 'MCQ',
    questionText: 'What status code indicates a successful POST request that created a resource?',
    options: ['201', '200', '404', '500'],
    correctAnswer: '201',
    explanation: '201 Created is returned when a POST successfully creates a new resource.'
  },
  {
    id: 'q_node_http_medium_02',
    skillId: 'skill_nodejs',
    topic: 'HTTP & Routing',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'In Express, how do you define a route parameter that matches a route like /users/:id?',
    options: [
      "app.get('/users/:id', handler)",
      "app.get('/users/id', handler)",
      "app.get('/users/{id}', handler)",
      "app.get('/users/<id>', handler)"
    ],
    correctAnswer: "app.get('/users/:id', handler)",
    explanation: 'Express uses :paramName syntax for route parameters.'
  },
  {
    id: 'q_node_http_medium_03',
    skillId: 'skill_nodejs',
    topic: 'HTTP & Routing',
    difficulty: 'medium',
    questionType: 'MCQ',
    questionText: 'What does CORS middleware address?',
    options: [
      'Cross-origin resource sharing restrictions in the browser',
      'Database connection pooling',
      'Compression of HTTP responses',
      'Session storage'
    ],
    correctAnswer: 'Cross-origin resource sharing restrictions in the browser',
    explanation: 'CORS middleware sets headers to allow browsers to make requests across origins.'
  },
  {
    id: 'q_node_http_hard_02',
    skillId: 'skill_nodejs',
    topic: 'HTTP & Routing',
    difficulty: 'hard',
    questionType: 'MCQ',
    questionText: 'What is the difference between `res.json()` and `res.send()` in Express?',
    options: [
      'res.json always sends a JSON content-type header; res.send guesses the type based on the value',
      'res.send always sends JSON',
      'res.json only works with objects, not arrays',
      'There is no difference'
    ],
    correctAnswer: 'res.json always sends a JSON content-type header; res.send guesses the type based on the value',
    explanation: 'res.json sets Content-Type to application/json and stringifies; res.send infers content type from the payload.'
  },
  {
    id: 'q_node_http_hard_03',
    skillId: 'skill_nodejs',
    topic: 'HTTP & Routing',
    difficulty: 'hard',
    questionType: 'MCQ',
    questionText: 'Why is it important to order middleware like body-parser before route handlers?',
    options: [
      'Because middleware runs in registration order and must parse the body before handlers read req.body',
      'Body-parser must run after handlers',
      'There is no importance',
      'Only the first middleware ever runs'
    ],
    correctAnswer: 'Because middleware runs in registration order and must parse the body before handlers read req.body',
    explanation: 'Middleware added before routes runs first, so body parsing via express.json() must precede handlers that use req.body.'
  }
];
