import { IngestionService } from './ingestion.service';
import { INITIAL_ROLES, INITIAL_SKILLS } from '../../data/seed';

function item(title: string) {
  return {
    externalId: title,
    title,
    company: 'Example',
    location: 'Remote',
    description: 'Build software with React, Node.js and SQL.',
    postingUrl: 'https://example.com/job'
  };
}

describe('IngestionService role selection', () => {
  const service = new IngestionService();
  const pick = (title: string, skills: string[]) =>
    (service as any).pickRoleId(item(title), INITIAL_ROLES, skills);

  it('uses explicit full-stack titles', () => {
    expect(pick('Full Stack Developer', ['skill_react', 'skill_nodejs'])).toBe('role_full_stack');
  });

  it('uses explicit frontend titles', () => {
    expect(pick('Senior Frontend Engineer', ['skill_react', 'skill_typescript'])).toBe('role_frontend');
    expect(pick('React Developer', ['skill_react'])).toBe('role_frontend');
  });

  it('uses explicit backend titles', () => {
    expect(pick('Backend Software Engineer', ['skill_nodejs', 'skill_sql'])).toBe('role_junior_backend');
    expect(pick('Node.js Developer', ['skill_nodejs'])).toBe('role_junior_backend');
  });

  it('falls back to the best skill overlap for generic titles', () => {
    expect(pick('Software Engineer', ['skill_react', 'skill_typescript', 'skill_html_css'])).toBe('role_frontend');
    expect(pick('Software Engineer', ['skill_nodejs', 'skill_sql', 'skill_postgresql', 'skill_docker'])).toBe('role_junior_backend');
    expect(pick('Software Engineer', ['skill_react', 'skill_nodejs', 'skill_sql', 'skill_docker'])).toBe('role_full_stack');
  });

  it('rejects technical pre-sales titles even when the body mentions dev skills', () => {
    const classified = (service as any).classifyAndMatch(
      item('Senior Solutions Engineer'),
      INITIAL_SKILLS,
      1
    );
    expect(classified).toBeNull();
  });

  it('sanitizes double-encoded HTML before storing a description', () => {
    const classified = (service as any).classifyAndMatch(
      {
        ...item('Backend Developer'),
        description: '&lt;p&gt;Node.js &amp;amp; SQL&lt;/p&gt;'
      },
      INITIAL_SKILLS,
      1
    );
    expect(classified).not.toBeNull();
    expect(classified.description).toBe('Node.js & SQL');
  });
});
