import { BdJobsScraper } from './bdjobs-scraper.service';

type MockResponse = { ok: boolean; status: number; text: () => Promise<string> };

function textResponse(data: any, status = 200): MockResponse {
  return { ok: status < 400, status, text: async () => JSON.stringify(data) };
}

function bodyOf(input: any): string {
  return decodeURIComponent(String(input));
}

function setupFetch(handler: (body: string) => MockResponse) {
  global.fetch = jest.fn(async (input: any) => {
    return handler(bodyOf(input)) as unknown as Response;
  }) as unknown as typeof fetch;
}

describe('BdJobsScraper', () => {
  beforeEach(() => {
    delete process.env.JOB_BD_PAGES;
  });

  it('normalizes list-API records into backend-ready items', async () => {
    setupFetch(body => {
      expect(body).toContain('rpp=50');
      return textResponse({
        message: 'Success',
        statuscode: '1',
        data: [{
          Jobid: '12345',
          jobTitle: 'Junior Backend Developer',
          companyName: 'Acme BD',
          location: 'Gulshan, Dhaka',
          jobContext: 'Build REST APIs',
          jobDescription: '<ul><li>Node.js</li><li>PostgreSQL</li></ul>',
          publishDate: '2026-09-03T12:00:00Z',
          WorkPlace: 'Office'
        }]
      });
    });

    const scraper = new BdJobsScraper();
    const items = await scraper.scrape({ maxPages: 1 });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      externalId: '12345',
      title: 'Junior Backend Developer',
      company: 'Acme BD',
      location: 'Gulshan, Dhaka',
      postingUrl: 'https://bdjobs.com/h/details/12345?ln=1',
      isRemote: false
    });
    expect(items[0].description).toBe('Build REST APIs Node.js PostgreSQL');
    expect(items[0].postedAt).toBe('2026-09-03T12:00:00.000Z');
  });

  it('stops when an empty page is returned', async () => {
    let calls = 0;
    setupFetch(() => {
      calls += 1;
      return textResponse({ message: 'Success', statuscode: '1', data: [] });
    });

    const scraper = new BdJobsScraper();
    const items = await scraper.scrape({ maxPages: 5 });
    expect(items).toHaveLength(0);
    expect(calls).toBe(1);
  });

  it('stops on a non-OK response', async () => {
    setupFetch(() => textResponse({}, 429));
    const scraper = new BdJobsScraper();
    const items = await scraper.scrape({ maxPages: 3 });
    expect(items).toHaveLength(0);
  });

  it('marks remote/hybrid postings as remote', async () => {
    setupFetch(() => textResponse({
      message: 'Success', statuscode: '1', data: [
        { Jobid: '1', jobTitle: 'Dev', companyName: 'A', location: 'Dhaka', WorkPlace: 'Remote' },
        { Jobid: '2', jobTitle: 'Dev', companyName: 'B', location: 'Dhaka', WorkPlace: 'Hybrid' },
        { Jobid: '3', jobTitle: 'Dev', companyName: 'C', location: 'Dhaka', WorkPlace: 'Office' }
      ]
    }));
    const scraper = new BdJobsScraper();
    const items = await scraper.scrape({ maxPages: 1 });
    expect(items.map(i => i.isRemote)).toEqual([true, true, false]);
  });

  it('enriches engineering-titled items with the details-API description', async () => {
    global.fetch = jest.fn(async (input: any) => {
      const url = String(input);
      if (url.includes('/JobSearch/GetJobSearch')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            message: 'Success', statuscode: '1', data: [{
              Jobid: '9001',
              jobTitle: 'Full Stack Software Developer',
              companyName: 'Reputed Bank',
              location: 'Dhaka',
              jobContext: 'blurb',
              WorkPlace: 'Office'
            }]
          })
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          statuscode: '1',
          data: [{
            JobId: '9001',
            JobTitle: 'Full Stack Software Developer',
            JobDescription: '<p>Build backend services and RESTful APIs using Node.js and PostgreSQL.</p>',
            SkillsRequired: 'JavaScript, Docker, Git'
          }]
        })
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const scraper = new BdJobsScraper();
    const items = await scraper.scrape({ maxPages: 1 });

    expect(items).toHaveLength(1);
    expect(items[0].description).toContain('RESTful APIs using Node.js and PostgreSQL');
    expect(items[0].skillsRequired).toBe('JavaScript, Docker, Git');
  });

  it('skips records without an id or title', async () => {
    setupFetch(() => textResponse({
      message: 'Success', statuscode: '1', data: [
        { companyName: 'A', jobTitle: 'Dev' },
        { Jobid: '2', companyName: 'B' },
        { Jobid: '3', jobTitle: 'Dev', companyName: 'C' }
      ]
    }));
    const scraper = new BdJobsScraper();
    const items = await scraper.scrape({ maxPages: 1 });
    expect(items).toHaveLength(1);
    expect(items[0].externalId).toBe('3');
  });
});
