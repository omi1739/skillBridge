export interface ResourceLink {
  name: string;
  source: string;
  url: string;
  kind: 'Docs' | 'Video';
}

export interface TopicResources {
  key: string;
  title: string;
  blurb: string;
  keywords: string[];
  resources: ResourceLink[];
}

export const TOPIC_RESOURCES: TopicResources[] = [
  {
    key: 'sql',
    title: 'SQL',
    blurb: 'Query languages, joins, aggregations, and transactions for relational databases.',
    keywords: ['sql', 'query', 'aggregation', 'relational', 'transactions', 'joins'],
    resources: [
      { name: 'SQL Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/sql/', kind: 'Docs' },
      { name: 'SQL Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/sql-tutorial/', kind: 'Docs' },
      { name: 'SQL & Database Full Course', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY', kind: 'Video' }
    ]
  },
  {
    key: 'postgresql',
    title: 'PostgreSQL',
    blurb: 'Advanced RDBMS concepts: indexes, JSONB, EXPLAIN, schema design, and constraints.',
    keywords: ['postgres', 'psql', 'index', 'jsonb', 'b-tree', 'gin'],
    resources: [
      { name: 'PostgreSQL Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/postgresql/', kind: 'Docs' },
      { name: 'PostgreSQL Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/postgresql-tutorial/', kind: 'Docs' },
      { name: 'Full PostgreSQL Course', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=qw--VYLpxG4', kind: 'Video' }
    ]
  },
  {
    key: 'dbms',
    title: 'Database Design & DBMS',
    blurb: 'Data modeling, normalization, ER diagrams, and core database management concepts.',
    keywords: ['dbms', 'database design', 'normalization', 'er model', 'schema'],
    resources: [
      { name: 'DBMS Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/dbms/', kind: 'Docs' },
      { name: 'SQL & Database Full Course', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY', kind: 'Video' }
    ]
  },
  {
    key: 'javascript',
    title: 'JavaScript',
    blurb: 'Core language fundamentals: ES6+, closures, the event loop, and async programming.',
    keywords: ['javascript', 'ecmascript', 'es6', 'closure', ' async', 'event loop', 'microtask'],
    resources: [
      { name: 'JavaScript Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/js/', kind: 'Docs' },
      { name: 'JavaScript Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/javascript/', kind: 'Docs' },
      { name: 'JavaScript Tutorial for Beginners', source: 'Programming with Mosh (YouTube)', url: 'https://www.youtube.com/watch?v=W6NZfCO5SIk', kind: 'Video' },
      { name: 'JavaScript Programming (Full Course)', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg', kind: 'Video' }
    ]
  },
  {
    key: 'nodejs',
    title: 'Node.js',
    blurb: 'Server-side JavaScript: core modules, event loop, streams, concurrency, and memory.',
    keywords: ['node', 'backend', 'event loop', 'microtask', 'streams', 'concurrency'],
    resources: [
      { name: 'Node.js Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/nodejs/', kind: 'Docs' },
      { name: 'Node.js Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/nodejs/', kind: 'Docs' },
      { name: 'Backend Development with Node.js & Express', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', kind: 'Video' }
    ]
  },
  {
    key: 'express',
    title: 'Express.js',
    blurb: 'Middleware pipelines, routing, error handling, and building RESTful endpoints.',
    keywords: ['express', 'middleware', 'routing', 'error handling'],
    resources: [
      { name: 'Express.js Articles', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/express-js/', kind: 'Docs' },
      { name: 'Backend Development with Node.js & Express', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', kind: 'Video' }
    ]
  },
  {
    key: 'rest-apis',
    title: 'REST APIs',
    blurb: 'HTTP methods, status codes, authentication (JWT), pagination, and API contracts.',
    keywords: ['rest', 'restful', 'api', 'http', 'web services', 'jwt', 'authentication', 'security', 'pagination'],
    resources: [
      { name: 'REST API Introduction', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/rest-api-introduction/', kind: 'Docs' },
      { name: 'Backend Development with Node.js & Express', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', kind: 'Video' }
    ]
  },
  {
    key: 'git',
    title: 'Git & Version Control',
    blurb: 'Branching strategies, merging, conflict resolution, and clean commit history.',
    keywords: ['git', 'github', 'version control', 'branching', 'commit'],
    resources: [
      { name: 'Git Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/git/', kind: 'Docs' },
      { name: 'Git Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/git/', kind: 'Docs' },
      { name: 'Git & GitHub for Beginners', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=RGOj5yH7evk', kind: 'Video' }
    ]
  },
  {
    key: 'docker',
    title: 'Docker & Containers',
    blurb: 'Containerization, multi-stage builds, volumes, networking, and Docker Compose.',
    keywords: ['docker', 'container', 'compose', 'multi-stage', 'image'],
    resources: [
      { name: 'Docker Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/docker-tutorial/', kind: 'Docs' },
      { name: 'Docker Tutorial for Beginners', source: 'TechWorld with Nana (YouTube)', url: 'https://www.youtube.com/watch?v=fqMOX6JJhGo', kind: 'Video' }
    ]
  },
  {
    key: 'redis',
    title: 'Redis & Caching',
    blurb: 'In-memory data stores, TTL expiration, and caching strategies for high-throughput systems.',
    keywords: ['redis', 'cache', 'caching', 'ttl'],
    resources: [
      { name: 'Introduction to Redis', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/introduction-to-redis/', kind: 'Docs' },
      { name: 'Redis Crash Course', source: 'Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=Hbt56gFj998', kind: 'Video' }
    ]
  },
  {
    key: 'dsa',
    title: 'Data Structures & Algorithms',
    blurb: 'Arrays, linked lists, trees, graphs, sorting, and complexity analysis for interviews.',
    keywords: ['data structure', 'algorithm', 'dsa', 'linked list', 'tree', 'graph', 'sorting', 'array'],
    resources: [
      { name: 'DSA Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/dsa/', kind: 'Docs' },
      { name: 'Data Structures Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/data-structures/', kind: 'Docs' },
      { name: 'Data Structures in JavaScript', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=8hly31xKli0', kind: 'Video' }
    ]
  }
];

export function resolveResources(text: string | null | undefined): TopicResources[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return TOPIC_RESOURCES.filter(topic =>
    topic.keywords.some(keyword => lower.includes(keyword.trim()))
  );
}

export function findTopic(key: string): TopicResources | undefined {
  return TOPIC_RESOURCES.find(t => t.key === key);
}