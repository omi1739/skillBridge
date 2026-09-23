import { BadRequestException } from '@nestjs/common';
import {
  ChallengeGeneratorService,
  getDynamicChallenges,
  getOfflineChallenges,
  restoreDynamicChallenges,
  GeneratedChallenge
} from './challenge-generator.service';

describe('ChallengeGeneratorService offline bank', () => {
  let generator: ChallengeGeneratorService;
  const originalKey = process.env.OPENAI_API_KEY;

  beforeAll(() => {
    // Force the offline-bank path: no API key configured.
    delete process.env.OPENAI_API_KEY;
    generator = new ChallengeGeneratorService();
  });

  afterAll(() => {
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
  });

  it('registers a curated offline bank that is immediately listable', () => {
    const offline = getOfflineChallenges();
    expect(offline.length).toBeGreaterThanOrEqual(4);
    expect(offline.some(c => c.type === 'SQL')).toBe(true);
    expect(offline.some(c => c.type === 'JAVASCRIPT')).toBe(true);
    // Eager registration so the sandbox list is usable before any `generate`.
    for (const c of offline) {
      expect(getDynamicChallenges().some(d => d.id === c.id)).toBe(true);
    }
  });

  it('generates a valid offline challenge when no API key is set', async () => {
    const sql = await generator.generate({ type: 'SQL', skillId: 'skill_sql', difficulty: 'Beginner' });
    expect(sql.type).toBe('SQL');
    expect(sql.verified).toBe(true);
    // SQL entries must self-check so they are runnable in the sandbox.
    expect(await generator.sqlSelfCheck(sql)).toBe(true);

    const js = await generator.generate({ type: 'JAVASCRIPT' });
    expect(js.type).toBe('JAVASCRIPT');
    expect(js.testCases && js.testCases.length).toBeGreaterThan(0);
  });

  it('throws for an unsupported type even on the offline path', async () => {
    await expect(generator.generate({ type: 'PYTHON' as any })).rejects.toThrow(BadRequestException);
  });

  it('restoreDynamicChallenges hydrates persisted rows without clobbering existing ids', () => {
    const persisted: GeneratedChallenge[] = [
      {
        id: 'gen_sql_persisted_1',
        title: 'Persisted SQL',
        type: 'SQL',
        skillId: 'skill_sql',
        difficulty: 'Intermediate',
        description: 'From a previous run',
        starterCode: 'SELECT 1;',
        referenceSolution: 'SELECT 1;',
        schemaSql: 'CREATE TABLE t (id INT);',
        seedSql: 'INSERT INTO t VALUES (1);',
        referenceQuery: 'SELECT * FROM t;'
      },
      {
        id: 'offline_sql_01', // already registered eagerly -> must be skipped
        title: 'Stale duplicate',
        type: 'SQL',
        skillId: 'skill_sql',
        difficulty: 'Beginner',
        description: 'Should not overwrite',
        starterCode: 'SELECT 2;',
        referenceSolution: 'SELECT 2;',
        schemaSql: 'CREATE TABLE t (id INT);',
        seedSql: 'INSERT INTO t VALUES (2);',
        referenceQuery: 'SELECT 2;'
      }
    ];

    const restored = restoreDynamicChallenges(persisted);
    expect(restored).toBe(1);
    expect(getDynamicChallenges().some(d => d.id === 'gen_sql_persisted_1')).toBe(true);
    // The offline row was NOT replaced by the stale persisted copy.
    const offline = getOfflineChallenges().find(c => c.id === 'offline_sql_01');
    const live = getDynamicChallenges().find(d => d.id === 'offline_sql_01');
    expect(offline?.starterCode).toBe(live?.starterCode);
  });
});