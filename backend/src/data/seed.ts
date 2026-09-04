import { Skill, Role, Assessment } from '@skillbridge/types';

export const INITIAL_SKILLS: Skill[] = [
  {
    id: 'skill_javascript',
    canonicalName: 'JavaScript',
    category: 'Programming Languages',
    description: 'Core language concepts including ES6+, closures, event loop, and asynchronous programming.',
    aliases: ['js', 'es6', 'ecmascript'],
    prerequisites: []
  },
  {
    id: 'skill_nodejs',
    canonicalName: 'Node.js',
    category: 'Runtimes & Frameworks',
    description: 'Server-side JavaScript runtime environment, core modules, event loop, and stream handling.',
    aliases: ['node', 'nodejs', 'node.js'],
    prerequisites: ['skill_javascript']
  },
  {
    id: 'skill_express',
    canonicalName: 'Express.js',
    category: 'Runtimes & Frameworks',
    description: 'Minimalist web framework for Node.js, middleware pipeline, and REST routing.',
    aliases: ['express', 'expressjs'],
    prerequisites: ['skill_nodejs']
  },
  {
    id: 'skill_sql',
    canonicalName: 'SQL',
    category: 'Databases',
    description: 'Relational query language: complex multi-table joins, aggregations, subqueries, and transactions.',
    aliases: ['structured query language', 'relational queries'],
    prerequisites: []
  },
  {
    id: 'skill_postgresql',
    canonicalName: 'PostgreSQL',
    category: 'Databases',
    description: 'Advanced open-source RDBMS, foreign keys, B-Tree & GIN indexes, JSONB, and EXPLAIN query analysis.',
    aliases: ['postgres', 'psql'],
    prerequisites: ['skill_sql']
  },
  {
    id: 'skill_rest_api',
    canonicalName: 'REST APIs',
    category: 'System Design & Architecture',
    description: 'HTTP verbs, status codes, JWT authentication, pagination, and API error contracts.',
    aliases: ['restful', 'rest api', 'web services'],
    prerequisites: []
  },
  {
    id: 'skill_git',
    canonicalName: 'Git',
    category: 'Tools & Version Control',
    description: 'Distributed version control, branching strategies, merge conflict resolution, and clean history.',
    aliases: ['github', 'version control', 'git workflow'],
    prerequisites: []
  },
  {
    id: 'skill_docker',
    canonicalName: 'Docker',
    category: 'DevOps & Infrastructure',
    description: 'Containerization, Dockerfile multi-stage builds, port bindings, volumes, and Docker Compose.',
    aliases: ['containers', 'docker compose'],
    prerequisites: []
  },
  {
    id: 'skill_redis',
    canonicalName: 'Redis',
    category: 'Databases & Caching',
    description: 'In-memory key-value cache, TTL expiration, and caching strategies.',
    aliases: ['caching', 'redis cache'],
    prerequisites: []
  }
];

export const INITIAL_ROLES: Role[] = [
  {
    id: 'role_junior_backend',
    slug: 'junior-backend-engineer',
    title: 'Junior Backend Engineer',
    category: 'Software Engineering',
    description: 'Responsible for server-side logic, database design, REST APIs, authentication, and basic deployment workflows.',
    marketContext: {
      region: 'Bangladesh / Emerging Tech Hubs',
      experienceLevel: '0 - 2 years',
      typicalTitles: [
        'Junior Software Engineer (Backend)',
        'Associate Backend Developer',
        'Junior Node.js Developer'
      ]
    },
    roleSkills: [
      {
        skillId: 'skill_javascript',
        required: true,
        roleWeight: 0.90,
        marketDemandFrequency: 0,
        proficiencyTarget: 'Intermediate'
      },
      {
        skillId: 'skill_nodejs',
        required: true,
        roleWeight: 0.95,
        marketDemandFrequency: 0,
        proficiencyTarget: 'Intermediate'
      },
      {
        skillId: 'skill_sql',
        required: true,
        roleWeight: 0.90,
        marketDemandFrequency: 0,
        proficiencyTarget: 'Intermediate'
      },
      {
        skillId: 'skill_postgresql',
        required: true,
        roleWeight: 0.85,
        marketDemandFrequency: 0,
        proficiencyTarget: 'Intermediate'
      },
      {
        skillId: 'skill_rest_api',
        required: true,
        roleWeight: 0.95,
        marketDemandFrequency: 0,
        proficiencyTarget: 'Intermediate'
      },
      {
        skillId: 'skill_git',
        required: true,
        roleWeight: 0.80,
        marketDemandFrequency: 0,
        proficiencyTarget: 'Intermediate'
      },
      {
        skillId: 'skill_docker',
        required: false,
        roleWeight: 0.65,
        marketDemandFrequency: 0,
        proficiencyTarget: 'Beginner'
      },
      {
        skillId: 'skill_redis',
        required: false,
        roleWeight: 0.50,
        marketDemandFrequency: 0,
        proficiencyTarget: 'Beginner'
      }
    ]
  }
];

export const INITIAL_ASSESSMENT: Assessment = {
  id: 'assessment_backend_diagnostic',
  title: 'Backend Engineering Core Diagnostic',
  description: 'Evaluate practical knowledge across asynchronous JavaScript, Node.js event loop, SQL queries, REST design, and containerization.',
  timeLimitMinutes: 15,
  passingScore: 70,
  version: '1.0.0',
  questions: [
    {
      id: 'q1',
      assessmentId: 'assessment_backend_diagnostic',
      prompt: 'What will be printed to the console when executing the following snippet?',
      codeSnippet: `console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');`,
      questionType: 'OUTPUT_PREDICTION',
      options: ['1, 2, 3, 4', '1, 4, 3, 2', '1, 4, 2, 3', '3, 1, 4, 2'],
      correctAnswer: '1, 4, 3, 2',
      explanation: 'Synchronous code runs first (1, 4), then microtasks from resolved promises (3), and lastly macrotasks from setTimeout queue (2).',
      subSkill: 'Event Loop & Microtasks',
      difficulty: 'Intermediate',
      points: 15
    },
    {
      id: 'q2',
      assessmentId: 'assessment_backend_diagnostic',
      prompt: 'In a Node.js Express server, how should an asynchronous error inside a route handler be properly forwarded to the global error middleware?',
      codeSnippet: `app.get('/users', async (req, res, next) => {
  try {
    const users = await db.fetchUsers();
    res.json(users);
  } catch (err) {
    // What should go here?
  }
});`,
      questionType: 'CODE_DEBUG',
      options: ['throw err;', 'res.status(500).send(err);', 'next(err);', 'return err;'],
      correctAnswer: 'next(err);',
      explanation: 'Calling next(err) passes the error down the Express middleware stack to trigger configured error-handling middleware.',
      subSkill: 'Express Error Handling',
      difficulty: 'Intermediate',
      points: 15
    },
    {
      id: 'q3',
      assessmentId: 'assessment_backend_diagnostic',
      prompt: 'Which SQL clause is used to filter rows AFTER an aggregate function like COUNT() or AVG() has been applied?',
      questionType: 'MCQ',
      options: ['WHERE', 'HAVING', 'GROUP BY', 'LIMIT'],
      correctAnswer: 'HAVING',
      explanation: 'WHERE filters rows before grouping/aggregation; HAVING filters the aggregated groups created by GROUP BY.',
      subSkill: 'SQL Aggregations',
      difficulty: 'Beginner',
      points: 15
    },
    {
      id: 'q4',
      assessmentId: 'assessment_backend_diagnostic',
      prompt: 'Why does adding a B-Tree index on a PostgreSQL column significantly speed up SELECT queries with WHERE filters while potentially slowing down bulk INSERTs?',
      questionType: 'MCQ',
      options: [
        'Because indexes compress the table into memory.',
        'Because the index allows logarithmic O(log N) lookup time, but every INSERT must also update the balanced tree structure.',
        'Because PostgreSQL disables ACID transactions on indexed tables.',
        'Because B-Trees replace the raw table data entirely.'
      ],
      correctAnswer: 'Because the index allows logarithmic O(log N) lookup time, but every INSERT must also update the balanced tree structure.',
      explanation: 'B-Tree indexes maintain a sorted balanced tree for fast range and equality searches, adding a small write overhead to keep the tree balanced on modifications.',
      subSkill: 'PostgreSQL Indexing',
      difficulty: 'Intermediate',
      points: 20
    },
    {
      id: 'q5',
      assessmentId: 'assessment_backend_diagnostic',
      prompt: 'Which HTTP method should be used for an endpoint that completely replaces an existing resource and is designed to be idempotent?',
      questionType: 'MCQ',
      options: ['POST', 'PATCH', 'PUT', 'DELETE'],
      correctAnswer: 'PUT',
      explanation: 'PUT completely replaces the target resource and is idempotent (repeated identical calls have the same outcome). PATCH is for partial updates.',
      subSkill: 'RESTful Semantics',
      difficulty: 'Beginner',
      points: 15
    },
    {
      id: 'q6',
      assessmentId: 'assessment_backend_diagnostic',
      prompt: 'What is the purpose of multi-stage builds in a production Node.js Dockerfile?',
      codeSnippet: `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/server.js"]`,
      questionType: 'MCQ',
      options: [
        'To run two Node.js servers simultaneously for load balancing.',
        'To separate devDependencies/compilers from the final lightweight image, reducing image size and attack surface.',
        'To bypass Docker daemon security restrictions.',
        'To automatically publish the container to Docker Hub.'
      ],
      correctAnswer: 'To separate devDependencies/compilers from the final lightweight image, reducing image size and attack surface.',
      explanation: 'Multi-stage builds leave compilation tools (TypeScript, linters, devDependencies) in builder stages, producing a lean and secure final runtime image.',
      subSkill: 'Docker Multi-stage Builds',
      difficulty: 'Intermediate',
      points: 20
    }
  ]
};
