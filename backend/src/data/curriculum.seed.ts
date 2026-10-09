import { CurriculumProfile } from '@skillbridge/types';

/**
 * Static curriculum reference data used by the curriculum-coverage analysis.
 * Two archetypes are provided: a university computer-science degree (heavy on
 * theory and databases, light on modern web tooling) and a full-stack web
 * bootcamp (heavy on hands-on web engineering). Coverage is expressed per skill
 * the platform tracks so the analyzer can gap a role's required skills against
 * what a given program teaches.
 */
export const INITIAL_CURRICULA: CurriculumProfile[] = [
  {
    id: 'curr_bsc_cse',
    institutionName: 'B.Sc. in Computer Science & Engineering',
    type: 'UNIVERSITY_DEGREE',
    coverageAreas: [
      {
        skillId: 'skill_javascript',
        canonicalName: 'JavaScript',
        academicEmphasis: 'MODERATE',
        practicalHoursEstimate: 30,
        syllabusTopics: ['Language basics', 'DOM & events', 'Async callbacks']
      },
      {
        skillId: 'skill_typescript',
        canonicalName: 'TypeScript',
        academicEmphasis: 'NOT_COVERED',
        practicalHoursEstimate: 0,
        syllabusTopics: []
      },
      {
        skillId: 'skill_react',
        canonicalName: 'React',
        academicEmphasis: 'NOT_COVERED',
        practicalHoursEstimate: 0,
        syllabusTopics: []
      },
      {
        skillId: 'skill_html_css',
        canonicalName: 'HTML & CSS',
        academicEmphasis: 'MODERATE',
        practicalHoursEstimate: 20,
        syllabusTopics: ['Semantic markup', 'Box model', 'Responsive layout basics']
      },
      {
        skillId: 'skill_nodejs',
        canonicalName: 'Node.js',
        academicEmphasis: 'NOT_COVERED',
        practicalHoursEstimate: 0,
        syllabusTopics: []
      },
      {
        skillId: 'skill_express',
        canonicalName: 'Express.js',
        academicEmphasis: 'NOT_COVERED',
        practicalHoursEstimate: 0,
        syllabusTopics: []
      },
      {
        skillId: 'skill_sql',
        canonicalName: 'SQL',
        academicEmphasis: 'HIGH',
        practicalHoursEstimate: 45,
        syllabusTopics: ['Relational model', 'Joins & aggregation', 'Normalization', 'Transactions']
      },
      {
        skillId: 'skill_postgresql',
        canonicalName: 'PostgreSQL',
        academicEmphasis: 'THEORY_ONLY',
        practicalHoursEstimate: 8,
        syllabusTopics: ['Indexing concepts', 'Query planning theory']
      },
      {
        skillId: 'skill_mongodb',
        canonicalName: 'MongoDB',
        academicEmphasis: 'NOT_COVERED',
        practicalHoursEstimate: 0,
        syllabusTopics: []
      },
      {
        skillId: 'skill_rest_api',
        canonicalName: 'REST APIs',
        academicEmphasis: 'MODERATE',
        practicalHoursEstimate: 15,
        syllabusTopics: ['HTTP fundamentals', 'Client-server architecture']
      },
      {
        skillId: 'skill_git',
        canonicalName: 'Git',
        academicEmphasis: 'MODERATE',
        practicalHoursEstimate: 10,
        syllabusTopics: ['Version control basics', 'Branching']
      },
      {
        skillId: 'skill_docker',
        canonicalName: 'Docker',
        academicEmphasis: 'NOT_COVERED',
        practicalHoursEstimate: 0,
        syllabusTopics: []
      }
    ]
  },
  {
    id: 'curr_bootcamp_fullstack',
    institutionName: 'Full-Stack Web Development Bootcamp',
    type: 'BOOTCAMP',
    coverageAreas: [
      {
        skillId: 'skill_javascript',
        canonicalName: 'JavaScript',
        academicEmphasis: 'HIGH',
        practicalHoursEstimate: 80,
        syllabusTopics: ['ES6+', 'Closures', 'Event loop', 'Promises & async/await']
      },
      {
        skillId: 'skill_typescript',
        canonicalName: 'TypeScript',
        academicEmphasis: 'MODERATE',
        practicalHoursEstimate: 30,
        syllabusTopics: ['Types & interfaces', 'Generics', 'Type narrowing']
      },
      {
        skillId: 'skill_react',
        canonicalName: 'React',
        academicEmphasis: 'HIGH',
        practicalHoursEstimate: 70,
        syllabusTopics: ['Components & props', 'Hooks', 'State management', 'Routing']
      },
      {
        skillId: 'skill_html_css',
        canonicalName: 'HTML & CSS',
        academicEmphasis: 'HIGH',
        practicalHoursEstimate: 50,
        syllabusTopics: ['Flexbox & Grid', 'Responsive design', 'Accessibility']
      },
      {
        skillId: 'skill_nodejs',
        canonicalName: 'Node.js',
        academicEmphasis: 'HIGH',
        practicalHoursEstimate: 55,
        syllabusTopics: ['Core modules', 'Event loop', 'Streams', 'File system']
      },
      {
        skillId: 'skill_express',
        canonicalName: 'Express.js',
        academicEmphasis: 'HIGH',
        practicalHoursEstimate: 40,
        syllabusTopics: ['Routing', 'Middleware', 'Error handling', 'REST endpoints']
      },
      {
        skillId: 'skill_sql',
        canonicalName: 'SQL',
        academicEmphasis: 'MODERATE',
        practicalHoursEstimate: 30,
        syllabusTopics: ['CRUD', 'Joins', 'Aggregations']
      },
      {
        skillId: 'skill_postgresql',
        canonicalName: 'PostgreSQL',
        academicEmphasis: 'MODERATE',
        practicalHoursEstimate: 25,
        syllabusTopics: ['Schema design', 'Indexes', 'Migrations']
      },
      {
        skillId: 'skill_mongodb',
        canonicalName: 'MongoDB',
        academicEmphasis: 'MODERATE',
        practicalHoursEstimate: 20,
        syllabusTopics: ['Documents & collections', 'Aggregation pipeline', 'Indexing']
      },
      {
        skillId: 'skill_rest_api',
        canonicalName: 'REST APIs',
        academicEmphasis: 'HIGH',
        practicalHoursEstimate: 35,
        syllabusTopics: ['HTTP verbs & status codes', 'JWT auth', 'Pagination', 'Error contracts']
      },
      {
        skillId: 'skill_git',
        canonicalName: 'Git',
        academicEmphasis: 'HIGH',
        practicalHoursEstimate: 15,
        syllabusTopics: ['Branching strategies', 'Pull requests', 'Conflict resolution']
      },
      {
        skillId: 'skill_docker',
        canonicalName: 'Docker',
        academicEmphasis: 'MODERATE',
        practicalHoursEstimate: 20,
        syllabusTopics: ['Images & containers', 'Dockerfile', 'Docker Compose']
      }
    ]
  }
];
