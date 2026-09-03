import { SandboxService } from './sandbox.service';
import { store } from '../store';

jest.mock('../store', () => ({
  store: {
    getEvidence: jest.fn(),
    saveEvidence: jest.fn()
  }
}));

jest.mock('./gap.service', () => ({
  gapService: { calculateGaps: jest.fn().mockResolvedValue([]) }
}));

const mockedStore = store as jest.Mocked<typeof store>;

describe('SandboxService', () => {
  const service = new SandboxService();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedStore.getEvidence.mockResolvedValue([]);
    mockedStore.saveEvidence.mockResolvedValue([]);
  });

  describe('getChallenges', () => {
    it('returns the predefined challenge set', () => {
      const challenges = service.getChallenges();
      expect(challenges.length).toBeGreaterThanOrEqual(3);
      expect(challenges.map(c => c.type)).toEqual(expect.arrayContaining(['SQL', 'JAVASCRIPT']));
    });
  });

  describe('executeSQL', () => {
    it('rejects destructive DDL/DML commands', async () => {
      const result = await service.executeSQL('challenge_sql_01', 'DROP TABLE employees', 'user_1');
      expect(result.passed).toBe(false);
      expect(result.message).toMatch(/Destructive/);
    });

    it('fails when required SQL keywords are missing', async () => {
      const result = await service.executeSQL('challenge_sql_01', 'SELECT * FROM employees', 'user_1');
      expect(result.passed).toBe(false);
      expect(result.message).toMatch(/JOIN/);
    });

    it('passes challenge_sql_01 and records verified evidence for a valid query', async () => {
      const query = `
        SELECT d.name, COUNT(e.id) AS c, AVG(e.salary) AS avg
        FROM departments d
        JOIN employees e ON d.id = e.department_id
        GROUP BY d.name
        HAVING COUNT(e.id) > 1
      `;
      const result = await service.executeSQL('challenge_sql_01', query, 'user_1');
      expect(result.passed).toBe(true);
      expect(result.outputRows).toBeDefined();
      expect(result.verifiedEvidence).toBeDefined();
      expect(result.verifiedEvidence!.confidence).toBe('HIGH');
      expect(mockedStore.saveEvidence).toHaveBeenCalled();
    });
  });

  describe('executeJavaScript', () => {
    const correctCode = `async function batchMap(items, batchSize, fn) {
      const results = [];
      for (let i = 0; i < items.length; i += batchSize) {
        const chunk = items.slice(i, i + batchSize);
        const chunkResults = await Promise.all(chunk.map(item => fn(item)));
        results.push(...chunkResults);
      }
      return results;
    }`;

    it('passes the JS challenge with a correct implementation', async () => {
      const result = await service.executeJavaScript('challenge_js_01', correctCode, 'user_1');
      expect(result.passed).toBe(true);
      expect(result.testResults).toBeDefined();
      expect(result.verifiedEvidence).toBeDefined();
      expect(result.verifiedEvidence!.proficiencyScore).toBeGreaterThan(0.9);
    });

    it('fails when the code does not define batchMap', async () => {
      const result = await service.executeJavaScript('challenge_js_01', 'const x = 1;', 'user_1');
      expect(result.passed).toBe(false);
    });

    it('fails when the implementation does not enforce concurrency / order', async () => {
      const wrongCode = `async function batchMap(items, batchSize, fn) {
        return Promise.all(items.map(item => fn(item)));
      }`;
      const result = await service.executeJavaScript('challenge_js_01', wrongCode, 'user_1');
      expect(result.passed).toBe(false);
    });

    it('does not record evidence when the challenge fails', async () => {
      await service.executeJavaScript('challenge_js_01', 'const x = 1;', 'user_1');
      expect(mockedStore.saveEvidence).not.toHaveBeenCalled();
    });
  });
});
