export interface ResourceLink {
  name: string;
  source: string;
  url: string;
  kind: 'Docs' | 'Video' | 'Practice';
}

export interface TopicResources {
  key: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  blurb: string;
  description: string;
  jobDemand: string;
  sectors: { name: string; detail: string }[];
  keywords: string[];
  resources: ResourceLink[];
}

export const TOPIC_CATEGORIES = [
  'Languages',
  'Web & Frameworks',
  'Data & Databases',
  'Infrastructure & DevOps',
  'Computer Science'
] as const;

export const TOPIC_RESOURCES: TopicResources[] = [
  // ── Languages ────────────────────────────────────────────────
  {
    key: 'c',
    title: 'C',
    category: 'Languages',
    difficulty: 'Intermediate',
    blurb: 'The foundation of modern systems programming — memory management, pointers, and low-level control.',
    description: 'C is the backbone of operating systems, embedded devices, and performance-critical software. Understanding C gives you deep insight into how memory, pointers, and compilation actually work — knowledge that transfers directly to C++, Rust, and systems engineering.',
    jobDemand: 'C remains essential in embedded systems, IoT, automotive, aerospace, and OS kernel development. Companies like Intel, ARM, Texas Instruments, and any firmware/hardware-adjacent team actively hire C engineers.',
    sectors: [
      { name: 'Embedded & IoT', detail: 'Microcontrollers, firmware, real-time systems' },
      { name: 'Operating Systems', detail: 'Linux kernel, Windows internals, device drivers' },
      { name: 'Game Engines', detail: 'Performance-critical rendering pipelines, physics engines' },
      { name: 'Aerospace & Automotive', detail: 'Safety-critical systems, avionics, ECU firmware' }
    ],
    keywords: ['c', ' c ', 'pointer', 'malloc', 'gcc', 'ansi c', 'systems programming'],
    resources: [
      { name: 'C Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/c/', kind: 'Docs' },
      { name: 'C Programming Language', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/c-programming-language/', kind: 'Docs' },
      { name: 'Learn C Programming (Full Course)', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=KJgsSFOSQv0', kind: 'Video' },
      { name: 'C Programming Tutorial for Beginners', source: 'Programming with Mosh (YouTube)', url: 'https://www.youtube.com/watch?v=SSS9sBjHxlw', kind: 'Video' }
    ]
  },
  {
    key: 'cpp',
    title: 'C++',
    category: 'Languages',
    difficulty: 'Advanced',
    blurb: 'High-performance OOP and generic programming — the language behind browsers, game engines, and trading systems.',
    description: 'C++ combines low-level memory control with high-level abstractions like templates, RAII, and the STL. It powers performance-critical domains where garbage collection overhead is unacceptable — from AAA game engines to高频 trading platforms.',
    jobDemand: 'C++ engineers are among the highest-paid in systems, graphics, and finance. Companies like Google, Meta, Epic Games, Bloomberg, and Citadel actively recruit senior C++ talent.',
    sectors: [
      { name: 'Game Development', detail: 'Unreal Engine, Unity native plugins, AAA titles' },
      { name: 'Quantitative Finance', detail: 'Low-latency trading, pricing engines, risk models' },
      { name: 'Browsers & Compilers', detail: 'Chrome/Chromium, LLVM, V8 engine' },
      { name: 'Robotics & Simulation', detail: 'ROS, autonomous driving, physics simulation' }
    ],
    keywords: ['c++', 'cpp', 'stl', 'templates', 'raii', 'oop'],
    resources: [
      { name: 'C++ Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/cpp/', kind: 'Docs' },
      { name: 'C++ Programming', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/c-plus-plus/', kind: 'Docs' },
      { name: 'C++ Full Course', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=vLnPwxZdW4Y', kind: 'Video' },
      { name: 'C++ Tutorial for Beginners', source: 'Programming with Mosh (YouTube)', url: 'https://www.youtube.com/watch?v=ZzaPd8Tr0JCk', kind: 'Video' }
    ]
  },
  {
    key: 'java',
    title: 'Java',
    category: 'Languages',
    difficulty: 'Intermediate',
    blurb: 'Enterprise-grade OOP with platform independence — the backbone of Android, banking, and large-scale backends.',
    description: "Java's write-once-run-anywhere philosophy and mature ecosystem make it the default for enterprise backends, Android development, and large distributed systems. The JVM's garbage collection and strong typing make it reliable at massive scale.",
    jobDemand: 'Java remains one of the most in-demand languages globally. Major employers include Google, Amazon, Oracle, Goldman Sachs, and virtually every large enterprise with legacy or greenfield backend systems.',
    sectors: [
      { name: 'Enterprise Backend', detail: 'Spring Boot, microservices, banking systems' },
      { name: 'Android Development', detail: 'Native Android apps, Kotlin interop' },
      { name: 'Big Data', detail: 'Hadoop, Spark, Kafka, Elasticsearch internals' },
      { name: 'Financial Services', detail: 'Core banking, payment processing, trading platforms' }
    ],
    keywords: ['java', ' jvm', 'spring', 'android', 'maven', 'gradle'],
    resources: [
      { name: 'Java Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/java/', kind: 'Docs' },
      { name: 'Java Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/java/', kind: 'Docs' },
      { name: 'Java Programming (Full Course)', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=eIrMbAQSU34', kind: 'Video' },
      { name: 'Java Tutorial for Beginners', source: 'Programming with Mosh (YouTube)', url: 'https://www.youtube.com/watch?v=eIrMbAQSU34', kind: 'Video' }
    ]
  },
  {
    key: 'python',
    title: 'Python',
    category: 'Languages',
    difficulty: 'Beginner',
    blurb: 'The most versatile language today — from scripting and web dev to AI/ML and data science.',
    description: "Python's readable syntax and massive ecosystem make it the go-to for rapid development across domains. It dominates AI/ML research, data science, automation, and is increasingly used for web backends with Django and FastAPI.",
    jobDemand: 'Python is the #1 language for AI/ML roles and is heavily used in data engineering, backend development, and automation. Every major tech company and AI startup uses Python extensively.',
    sectors: [
      { name: 'AI & Machine Learning', detail: 'PyTorch, TensorFlow, scikit-learn, LLMs' },
      { name: 'Data Science', detail: 'Pandas, NumPy, Jupyter, statistical analysis' },
      { name: 'Web Backend', detail: 'Django, Flask, FastAPI, async Python' },
      { name: 'DevOps & Automation', detail: 'Ansible, scripting, CI/CD pipelines' }
    ],
    keywords: ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'pip'],
    resources: [
      { name: 'Python Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/python/', kind: 'Docs' },
      { name: 'Python Programming', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/python-programming-language-tutorial/', kind: 'Docs' },
      { name: 'Python for Beginners (Full Course)', source: 'Programming with Mosh (YouTube)', url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc', kind: 'Video' },
      { name: 'Learn Python (Full Course)', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=rfscVS0vtbw', kind: 'Video' }
    ]
  },
  {
    key: 'php',
    title: 'PHP',
    category: 'Languages',
    difficulty: 'Beginner',
    blurb: 'The language that powers 77% of the web — server-side scripting for WordPress, Laravel, and modern APIs.',
    description: "PHP has evolved significantly with PHP 8+ offering typed properties, match expressions, and JIT compilation. With Laravel and Symfony, it's a productive choice for web applications, and WordPress (43% of the web) runs on PHP.",
    jobDemand: 'PHP powers the majority of the web through WordPress, Drupal, and Laravel. Freelance and agency work is abundant, and companies like Facebook (Hack), Slack, and Shopify use PHP-adjacent stacks.',
    sectors: [
      { name: 'CMS & WordPress', detail: 'WordPress plugins/themes, Drupal, Joomla' },
      { name: 'Web Applications', detail: 'Laravel, Symfony, API development' },
      { name: 'E-commerce', detail: 'WooCommerce, Magento, PrestaShop' },
      { name: 'Freelance & Agencies', detail: 'Client projects, rapid prototyping' }
    ],
    keywords: ['php', 'laravel', 'wordpress', 'drupal', 'composer', 'mysql'],
    resources: [
      { name: 'PHP Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/php/', kind: 'Docs' },
      { name: 'PHP Programming', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/php/', kind: 'Docs' },
      { name: 'PHP Full Course', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=2eeb-cXnVC4', kind: 'Video' },
      { name: 'Laravel PHP Framework Course', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=ImtZ5y3zFGk', kind: 'Video' }
    ]
  },
  // ── Web & Frameworks ─────────────────────────────────────────
  {
    key: 'javascript',
    title: 'JavaScript',
    category: 'Web & Frameworks',
    difficulty: 'Beginner',
    blurb: 'Core language fundamentals: ES6+, closures, the event loop, and async programming.',
    description: "JavaScript is the language of the web — running in every browser and, via Node.js, on servers. Modern JS (ES6+) offers destructuring, modules, async/await, and a rich ecosystem of frameworks for any platform.",
    jobDemand: 'JavaScript is consistently the most-used language on GitHub. Every frontend role requires it, and Node.js makes it viable for full-stack. Companies from startups to FAANG rely on JS/TS.',
    sectors: [
      { name: 'Frontend Web', detail: 'React, Vue, Angular, Svelte, Next.js' },
      { name: 'Full-Stack', detail: 'Node.js, Next.js, Remix, Astro' },
      { name: 'Mobile Apps', detail: 'React Native, Ionic, Expo' },
      { name: 'Desktop Apps', detail: 'Electron, Tauri' }
    ],
    keywords: ['javascript', 'ecmascript', 'es6', 'closure', ' async', 'event loop', 'microtask'],
    resources: [
      { name: 'JavaScript Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/js/', kind: 'Docs' },
      { name: 'JavaScript Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/javascript/', kind: 'Docs' },
      { name: 'JavaScript Tutorial for Beginners', source: 'Programming with Mosh (YouTube)', url: 'https://www.youtube.com/watch?v=W6NZfCO5SIk', kind: 'Video' },
      { name: 'JavaScript Programming (Full Course)', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg', kind: 'Video' }
    ]
  },
  {
    key: 'typescript',
    title: 'TypeScript',
    category: 'Web & Frameworks',
    difficulty: 'Intermediate',
    blurb: 'JavaScript with static types — catch bugs at compile time and scale codebases with confidence.',
    description: "TypeScript adds a powerful type system on top of JavaScript, catching errors at compile time rather than runtime. It's become the industry standard for large-scale web applications, with adoption by Angular, Next.js, and most major frameworks.",
    jobDemand: 'TypeScript adoption has skyrocketed — most new JS projects default to TS. Companies like Microsoft, Google, Airbnb, and Stripe require or strongly prefer TypeScript for frontend and full-stack roles.',
    sectors: [
      { name: 'Frontend Engineering', detail: 'React + TS, Vue + TS, Angular' },
      { name: 'Full-Stack Apps', detail: 'Next.js, Remix, tRPC, NestJS' },
      { name: 'Library Authorship', detail: 'Publishing typed packages to npm' },
      { name: 'Enterprise Web', detail: 'Large codebases needing type safety' }
    ],
    keywords: ['typescript', 'ts', 'type system', 'generics', 'interface', 'enum'],
    resources: [
      { name: 'TypeScript Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/typescript/', kind: 'Docs' },
      { name: 'TypeScript Programming', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/typescript/', kind: 'Docs' },
      { name: 'TypeScript Course for Beginners', source: 'Academind (YouTube)', url: 'https://www.youtube.com/watch?v=BwuLxPH8IDs', kind: 'Video' },
      { name: 'TypeScript Full Course', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=gp5H0Vw39yw', kind: 'Video' }
    ]
  },
  {
    key: 'react',
    title: 'React',
    category: 'Web & Frameworks',
    difficulty: 'Intermediate',
    blurb: 'The most popular UI library — component-based architecture for web, mobile, and beyond.',
    description: "React's declarative component model revolutionized frontend development. With hooks, server components, and a massive ecosystem, it powers everything from small SPAs to Facebook's entire frontend. Pairs naturally with TypeScript and Next.js.",
    jobDemand: 'React is the #1 most requested frontend skill in job postings. Meta, Netflix, Airbnb, Uber, and thousands of startups use React. React Native extends it to mobile.',
    sectors: [
      { name: 'Frontend Web Apps', detail: 'SPAs, dashboards, SaaS products' },
      { name: 'Mobile Development', detail: 'React Native, Expo, Ionic' },
      { name: 'E-commerce', detail: 'Shopify Hydrogen, Next.js Commerce' },
      { name: 'Design Systems', detail: 'Storybook, component libraries' }
    ],
    keywords: ['react', 'jsx', 'hooks', 'next', 'nextjs', 'redux', 'react native'],
    resources: [
      { name: 'React Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/react/', kind: 'Docs' },
      { name: 'React.js Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/react-js/', kind: 'Docs' },
      { name: 'React Course for Beginners', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=LDB4uaJ87e0', kind: 'Video' },
      { name: 'React Full Course', source: 'Programming with Mosh (YouTube)', url: 'https://www.youtube.com/watch?v=bMknfKXIFA8', kind: 'Video' }
    ]
  },
  {
    key: 'nodejs',
    title: 'Node.js',
    category: 'Web & Frameworks',
    difficulty: 'Intermediate',
    blurb: 'Server-side JavaScript: core modules, event loop, streams, concurrency, and memory.',
    description: "Node.js brings JavaScript to the server with an event-driven, non-blocking I/O model. It's ideal for real-time applications, APIs, and microservices. With Express, Fastify, and NestJS, it's a mature backend ecosystem.",
    jobDemand: 'Node.js is the most popular runtime for JavaScript backend development. Used by Netflix, PayPal, LinkedIn, and NASA. Full-stack JS/TS roles almost always require Node.js.',
    sectors: [
      { name: 'API Development', detail: 'REST, GraphQL, tRPC, WebSockets' },
      { name: 'Real-time Apps', detail: 'Chat, collaboration, live dashboards' },
      { name: 'Microservices', detail: 'Service mesh, event-driven architectures' },
      { name: 'Serverless', detail: 'AWS Lambda, Vercel Functions, Cloudflare Workers' }
    ],
    keywords: ['node', 'nodejs', 'node.js', 'backend', 'event loop', 'microtask', 'streams', 'concurrency'],
    resources: [
      { name: 'Node.js Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/nodejs/', kind: 'Docs' },
      { name: 'Node.js Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/nodejs/', kind: 'Docs' },
      { name: 'Backend Development with Node.js & Express', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', kind: 'Video' },
      { name: 'Node.js Crash Course', source: 'Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4', kind: 'Video' }
    ]
  },
  {
    key: 'express',
    title: 'Express.js',
    category: 'Web & Frameworks',
    difficulty: 'Intermediate',
    blurb: 'Middleware pipelines, routing, error handling, and building RESTful endpoints.',
    description: "Express.js is the most popular Node.js web framework. Its minimal, unopinionated design gives you full control over routing, middleware, and error handling — making it ideal for APIs and microservices.",
    jobDemand: 'Express is the de facto standard for Node.js backend development. Nearly every Node.js job listing expects Express knowledge. Pairs with MongoDB, PostgreSQL, and JWT auth.',
    sectors: [
      { name: 'REST API Design', detail: 'CRUD APIs, versioning, rate limiting' },
      { name: 'Microservices', detail: 'Service decomposition, inter-service communication' },
      { name: 'Prototyping', detail: 'Rapid MVP development, hackathons' },
      { name: 'GraphQL Servers', detail: 'Apollo Server, Yoga, express-graphql' }
    ],
    keywords: ['express', 'middleware', 'routing', 'error handling'],
    resources: [
      { name: 'Express.js Articles', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/express-js/', kind: 'Docs' },
      { name: 'Express.js Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/nodejs/ref_express.asp', kind: 'Docs' },
      { name: 'Express.js and Node.js Crash Course', source: 'Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=CnH3kAXSrmU', kind: 'Video' },
      { name: 'Backend Development with Node.js & Express', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', kind: 'Video' }
    ]
  },
  {
    key: 'rest-apis',
    title: 'REST APIs',
    category: 'Web & Frameworks',
    difficulty: 'Intermediate',
    blurb: 'HTTP methods, status codes, authentication (JWT), pagination, and API contracts.',
    description: "REST is the architectural style behind most web APIs. Understanding HTTP verbs, status codes, content negotiation, JWT authentication, pagination, and error contracts is fundamental for any backend or full-stack engineer.",
    jobDemand: 'Every backend developer needs REST API skills. From startups to FAANG, designing and consuming REST APIs is a core daily task. GraphQL knowledge is a valuable complement.',
    sectors: [
      { name: 'Backend Engineering', detail: 'Designing APIs for web and mobile clients' },
      { name: 'Integration', detail: 'Third-party API consumption, webhooks' },
      { name: 'Mobile Backend', detail: 'BFF pattern, API gateways' },
      { name: 'Platform Engineering', detail: 'API standards, OpenAPI specs, versioning' }
    ],
    keywords: ['rest', 'restful', 'api', 'http', 'web services', 'jwt', 'authentication', 'security', 'pagination'],
    resources: [
      { name: 'REST API Introduction', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/rest-api-introduction/', kind: 'Docs' },
      { name: 'REST API Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/whatis/whatis_rest.asp', kind: 'Docs' },
      { name: 'Backend Development with Node.js & Express', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', kind: 'Video' },
      { name: 'REST API Concepts and Examples', source: 'WebConcepts (YouTube)', url: 'https://www.youtube.com/watch?v=Q-BpqyOT3a8', kind: 'Video' }
    ]
  },
  // ── Data & Databases ─────────────────────────────────────────
  {
    key: 'sql',
    title: 'SQL',
    category: 'Data & Databases',
    difficulty: 'Beginner',
    blurb: 'Query languages, joins, aggregations, and transactions for relational databases.',
    description: "SQL is the universal language for querying relational data. From simple SELECTs to complex multi-table JOINs, window functions, and CTEs — SQL is a non-negotiable skill for any data-related role.",
    jobDemand: 'SQL is the most requested skill in data-related job postings. Required for backend developers, data analysts, data engineers, and data scientists. Even NoSQL roles benefit from SQL knowledge.',
    sectors: [
      { name: 'Backend Development', detail: 'PostgreSQL, MySQL, SQLite for application data' },
      { name: 'Data Analytics', detail: 'Business intelligence, reporting, dashboards' },
      { name: 'Data Engineering', detail: 'ETL pipelines, data warehousing, dbt' },
      { name: 'Data Science', detail: 'Exploratory analysis, feature engineering' }
    ],
    keywords: ['sql', 'query', 'aggregation', 'relational', 'transactions', 'joins'],
    resources: [
      { name: 'SQL Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/sql/', kind: 'Docs' },
      { name: 'SQL Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/sql-tutorial/', kind: 'Docs' },
      { name: 'SQL & Database Full Course', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY', kind: 'Video' },
      { name: 'SQL Crash Course', source: 'Bro Code (YouTube)', url: 'https://www.youtube.com/watch?v=ktjCkZ8vECE', kind: 'Video' }
    ]
  },
  {
    key: 'postgresql',
    title: 'PostgreSQL',
    category: 'Data & Databases',
    difficulty: 'Intermediate',
    blurb: 'Advanced RDBMS: indexes, JSONB, EXPLAIN, schema design, and constraints.',
    description: "PostgreSQL is the world's most advanced open-source RDBMS. With JSONB, full-text search, CTEs, window functions, and extensibility via extensions like PostGIS — it's the default choice for serious applications.",
    jobDemand: 'PostgreSQL is the most popular open-source database and is used by Apple, Instagram, Spotify, and NASA. PostgreSQL expertise commands premium salaries in backend and data engineering roles.',
    sectors: [
      { name: 'Application Backends', detail: 'Primary data store for web applications' },
      { name: 'Geospatial', detail: 'PostGIS, location-based services' },
      { name: 'Analytics', detail: 'TimescaleDB for time-series, Citus for distributed' },
      { name: 'Data Warehousing', detail: 'OLAP queries, materialized views' }
    ],
    keywords: ['postgres', 'psql', 'index', 'jsonb', 'b-tree', 'gin'],
    resources: [
      { name: 'PostgreSQL Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/postgresql/', kind: 'Docs' },
      { name: 'PostgreSQL Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/postgresql-tutorial/', kind: 'Docs' },
      { name: 'Full PostgreSQL Course', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=qw--VYLpxG4', kind: 'Video' },
      { name: 'PostgreSQL Crash Course', source: 'Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=qw--VYLpxG4', kind: 'Video' }
    ]
  },
  {
    key: 'mongodb',
    title: 'MongoDB',
    category: 'Data & Databases',
    difficulty: 'Beginner',
    blurb: 'The leading NoSQL document database — flexible schemas, horizontal scaling, and aggregation pipelines.',
    description: "MongoDB stores data as flexible JSON-like documents, making it ideal for rapidly evolving schemas and horizontal scaling. Its aggregation framework rivals SQL for complex analytics, and it pairs naturally with Node.js.",
    jobDemand: 'MongoDB is the most popular NoSQL database, used by Forbes, eBay, and Verizon. Full-stack JS roles frequently require MongoDB knowledge alongside Node.js and React.',
    sectors: [
      { name: 'Web Applications', detail: 'Content management, user profiles, catalogs' },
      { name: 'Real-time Analytics', detail: 'Event logging, IoT data, clickstreams' },
      { name: 'Mobile Backends', detail: 'Realm sync, flexible schemas for apps' },
      { name: 'Startup MVPs', detail: 'Rapid iteration without schema migrations' }
    ],
    keywords: ['mongodb', 'mongo', 'nosql', 'document', 'aggregation', 'bson'],
    resources: [
      { name: 'MongoDB Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/mongodb/', kind: 'Docs' },
      { name: 'MongoDB Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/mongodb-tutorial/', kind: 'Docs' },
      { name: 'MongoDB Crash Course', source: 'Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=-56x56UppqQ', kind: 'Video' },
      { name: 'MongoDB Full Course', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=-56x56UppqQ', kind: 'Video' }
    ]
  },
  {
    key: 'dbms',
    title: 'Database Design & DBMS',
    category: 'Data & Databases',
    difficulty: 'Beginner',
    blurb: 'Data modeling, normalization, ER diagrams, and core database management concepts.',
    description: "Understanding database design fundamentals — normalization (1NF through BCNF), ER modeling, ACID properties, and indexing strategies — is critical for building reliable, performant applications at any scale.",
    jobDemand: 'Database design knowledge is expected of every backend developer and DBA. Interview questions on normalization, indexing, and transaction isolation levels are standard at top companies.',
    sectors: [
      { name: 'Backend Engineering', detail: 'Schema design, migrations, query optimization' },
      { name: 'Data Architecture', detail: 'Data modeling for warehouses and lakes' },
      { name: 'DBA', detail: 'Performance tuning, backup/recovery, replication' },
      { name: 'Cloud Databases', detail: 'RDS, Aurora, Cloud SQL, CosmosDB' }
    ],
    keywords: ['dbms', 'database design', 'normalization', 'er model', 'schema'],
    resources: [
      { name: 'DBMS Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/dbms/', kind: 'Docs' },
      { name: 'DBMS Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/dbms/', kind: 'Docs' },
      { name: 'SQL & Database Full Course', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY', kind: 'Video' },
      { name: 'DBMS Full Course', source: 'GeeksforGeeks (YouTube)', url: 'https://www.youtube.com/watch?v=CARomDqCzVc', kind: 'Video' }
    ]
  },
  // ── Infrastructure & DevOps ──────────────────────────────────
  {
    key: 'git',
    title: 'Git & Version Control',
    category: 'Infrastructure & DevOps',
    difficulty: 'Beginner',
    blurb: 'Branching strategies, merging, conflict resolution, and clean commit history.',
    description: "Git is the universal version control system. Mastering branching (feature branches, gitflow), rebasing, conflict resolution, and writing clean commit messages separates professional developers from beginners.",
    jobDemand: 'Git is a non-negotiable skill for every developer. Every job interview assumes Git proficiency, and GitHub profiles serve as developer portfolios.',
    sectors: [
      { name: 'All Software Development', detail: 'Every team uses version control' },
      { name: 'Open Source', detail: 'Contributing to OSS, maintaining public repos' },
      { name: 'DevOps & CI/CD', detail: 'GitOps, automated pipelines, code review' },
      { name: 'Technical Leadership', detail: 'Branch strategies, release management' }
    ],
    keywords: ['git', 'github', 'version control', 'branching', 'commit'],
    resources: [
      { name: 'Git Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/git/', kind: 'Docs' },
      { name: 'Git Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/git/', kind: 'Docs' },
      { name: 'Git & GitHub for Beginners', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=RGOj5yH7evk', kind: 'Video' },
      { name: 'Git & GitHub Crash Course', source: 'Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=SWYqp7iBY_T', kind: 'Video' }
    ]
  },
  {
    key: 'docker',
    title: 'Docker & Containers',
    category: 'Infrastructure & DevOps',
    difficulty: 'Intermediate',
    blurb: 'Containerization, multi-stage builds, volumes, networking, and Docker Compose.',
    description: "Docker packages applications into portable containers that run consistently across environments. Multi-stage builds minimize image sizes, Docker Compose orchestrates multi-container apps, and understanding networking/volumes is key for production.",
    jobDemand: 'Docker is the most in-demand DevOps skill. Used by virtually every tech company for local development, CI/CD, and production deployments. Often paired with Kubernetes.',
    sectors: [
      { name: 'DevOps & CI/CD', detail: 'Containerized builds, deployment pipelines' },
      { name: 'Microservices', detail: 'Service isolation, dependency management' },
      { name: 'Cloud Native', detail: 'Kubernetes, ECS, Cloud Run, Azure Containers' },
      { name: 'Development Environments', detail: 'Consistent local dev, docker-compose' }
    ],
    keywords: ['docker', 'container', 'compose', 'multi-stage', 'image'],
    resources: [
      { name: 'Docker Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/docker-tutorial/', kind: 'Docs' },
      { name: 'Docker Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/docker/', kind: 'Docs' },
      { name: 'Docker Tutorial for Beginners', source: 'TechWorld with Nana (YouTube)', url: 'https://www.youtube.com/watch?v=fqMOX6JJhGo', kind: 'Video' },
      { name: 'Docker Crash Course', source: 'Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE', kind: 'Video' }
    ]
  },
  {
    key: 'linux',
    title: 'Linux & Command Line',
    category: 'Infrastructure & DevOps',
    difficulty: 'Intermediate',
    blurb: 'Shell scripting, file systems, process management, and server administration.',
    description: "Linux runs 90%+ of cloud infrastructure and all of the top supercomputers. Knowing the command line — file manipulation, permissions, pipes, cron, and shell scripting — is essential for backend and DevOps roles.",
    jobDemand: 'Linux proficiency is expected for any server-side, DevOps, or cloud role. AWS, GCP, and Azure instances predominantly run Linux. Shell scripting saves hours of manual work.',
    sectors: [
      { name: 'Server Administration', detail: 'Web servers, deployment, monitoring' },
      { name: 'Cloud & DevOps', detail: 'AWS EC2, Kubernetes nodes, CI runners' },
      { name: 'Embedded Systems', detail: 'Raspberry Pi, Yocto, Buildroot' },
      { name: 'Cybersecurity', detail: 'Penetration testing, forensics, hardening' }
    ],
    keywords: ['linux', 'bash', 'shell', 'command line', 'terminal', 'unix', 'ubuntu', 'centos'],
    resources: [
      { name: 'Linux Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/linux/', kind: 'Docs' },
      { name: 'Linux Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/linux-tutorial/', kind: 'Docs' },
      { name: 'Linux Crash Course', source: 'Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=sWbUDq4S6Y8', kind: 'Video' },
      { name: 'Linux Command Line Full Course', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=e7BufAVwDiM', kind: 'Video' }
    ]
  },
  {
    key: 'aws',
    title: 'AWS & Cloud',
    category: 'Infrastructure & DevOps',
    difficulty: 'Advanced',
    blurb: 'Cloud computing foundations — EC2, S3, Lambda, RDS, IAM, and modern cloud-native architectures.',
    description: "AWS dominates cloud computing with 32% market share. Understanding core services (EC2, S3, Lambda, RDS, IAM), serverless patterns, and cloud architecture is critical for modern backend and DevOps roles.",
    jobDemand: 'AWS skills command a 20-30% salary premium. The AWS Solutions Architect certification is the most valuable cloud certification. Every company is migrating to or already on the cloud.',
    sectors: [
      { name: 'Cloud Architecture', detail: 'Designing scalable, fault-tolerant systems' },
      { name: 'Serverless', detail: 'Lambda, API Gateway, DynamoDB, Step Functions' },
      { name: 'DevOps', detail: 'CloudFormation, CDK, CodePipeline, ECS/EKS' },
      { name: 'Data Engineering', detail: 'S3 data lakes, Glue, Redshift, Athena' }
    ],
    keywords: ['aws', 'cloud', 'ec2', 's3', 'lambda', 'serverless', 'iam', 'rds'],
    resources: [
      { name: 'AWS Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/amazon-web-services/', kind: 'Docs' },
      { name: 'AWS Cloud Practitioner', source: 'W3Schools', url: 'https://www.w3schools.com/aws/index.php', kind: 'Docs' },
      { name: 'AWS Certified Cloud Practitioner', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=SOTamWNgDKc', kind: 'Video' },
      { name: 'AWS Full Course', source: 'Simplilearn (YouTube)', url: 'https://www.youtube.com/watch?v=SOTamWNgDKc', kind: 'Video' }
    ]
  },
  // ── Computer Science ─────────────────────────────────────────
  {
    key: 'dsa',
    title: 'Data Structures & Algorithms',
    category: 'Computer Science',
    difficulty: 'Intermediate',
    blurb: 'Arrays, linked lists, trees, graphs, sorting, and complexity analysis for interviews.',
    description: "DSA is the foundation of efficient programming. Arrays, hash maps, trees, graphs, and algorithms like binary search, BFS/DFS, and dynamic programming are standard in technical interviews at every major tech company.",
    jobDemand: 'DSA knowledge is the primary filter in technical interviews at FAANG, unicorns, and competitive startups. Mastering these concepts is the fastest path to a high-paying software engineering role.',
    sectors: [
      { name: 'Technical Interviews', detail: 'LeetCode, HackerRank, coding assessments' },
      { name: 'Systems Design', detail: 'Choosing the right data structure for scale' },
      { name: 'Competitive Programming', detail: 'ICPC, Google Code Jam, Codeforces' },
      { name: 'Performance Optimization', detail: 'Algorithmic complexity, memory efficiency' }
    ],
    keywords: ['data structure', 'algorithm', 'dsa', 'linked list', 'tree', 'graph', 'sorting', 'array'],
    resources: [
      { name: 'DSA Tutorial', source: 'W3Schools', url: 'https://www.w3schools.com/dsa/', kind: 'Docs' },
      { name: 'Data Structures Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/data-structures/', kind: 'Docs' },
      { name: 'Data Structures in JavaScript', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=8hly31xKli0', kind: 'Video' },
      { name: 'Algorithms Full Course', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=8hly31xKli0', kind: 'Video' }
    ]
  },
  {
    key: 'ml',
    title: 'Machine Learning & AI',
    category: 'Computer Science',
    difficulty: 'Advanced',
    blurb: 'Supervised learning, neural networks, NLP fundamentals, and the math behind modern AI.',
    description: "Machine learning powers everything from recommendation engines to large language models. Understanding regression, classification, neural networks, and the math (linear algebra, probability, calculus) behind them opens the most exciting career paths in tech.",
    jobDemand: 'AI/ML roles are the fastest-growing and highest-paid in tech. From ML engineers to research scientists, demand far exceeds supply. Python + math foundations + ML frameworks are the entry ticket.',
    sectors: [
      { name: 'AI Research', detail: 'LLMs, computer vision, reinforcement learning' },
      { name: 'MLOps', detail: 'Model deployment, monitoring, feature stores' },
      { name: 'Data Science', detail: 'Predictive modeling, A/B testing, analytics' },
      { name: 'Product AI', detail: 'Recommendations, search ranking, personalization' }
    ],
    keywords: ['machine learning', 'ai', 'artificial intelligence', 'neural network', 'deep learning', 'pytorch', 'tensorflow'],
    resources: [
      { name: 'Machine Learning Tutorial', source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/machine-learning/', kind: 'Docs' },
      { name: 'ML Course for Beginners', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=NWONeJKn6kc', kind: 'Video' },
      { name: 'Machine Learning Full Course', source: 'Simplilearn (YouTube)', url: 'https://www.youtube.com/watch?v=GwIo3gDZCVQ', kind: 'Video' },
      { name: 'Python for Machine Learning', source: 'freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=7eh4d6sabA0', kind: 'Video' }
    ]
  }
];

function keywordMatches(text: string, rawKeyword: string): boolean {
  const keyword = rawKeyword.trim();
  if (!keyword) return false;
  // Word-boundary matching so single-letter keywords like 'c' or 'ts' cannot
  // match every word that merely contains those letters.
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Only require a trailing boundary when the keyword ends in a word
  // character; ending punctuation (e.g. 'c++', 'node.js') has none.
  const lastChar = keyword[keyword.length - 1];
  const trailing = /[A-Za-z0-9_]/.test(lastChar) ? '\\b' : '';
  return new RegExp(`\\b${escaped}${trailing}`, 'i').test(text);
}

export function resolveResources(text: string | null | undefined): TopicResources[] {
  if (!text) return [];
  return TOPIC_RESOURCES.filter(topic =>
    topic.keywords.some(keyword => keywordMatches(text, keyword))
  );
}

export function findTopic(key: string): TopicResources | undefined {
  return TOPIC_RESOURCES.find(t => t.key === key);
}

export function getTopicsByCategory(): Record<string, TopicResources[]> {
  const grouped: Record<string, TopicResources[]> = {};
  for (const topic of TOPIC_RESOURCES) {
    if (!grouped[topic.category]) grouped[topic.category] = [];
    grouped[topic.category].push(topic);
  }
  return grouped;
}