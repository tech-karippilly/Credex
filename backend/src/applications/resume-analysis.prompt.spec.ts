import { CareerDocument } from '../careers/schemas/career.schema';
import { ApplicationDocument } from './schemas/application.schema';
import { buildResumeAnalysisPrompt } from './resume-analysis.prompt';

describe('buildResumeAnalysisPrompt', () => {
  it('includes the career record and resume instead of a generic job description', () => {
    const career = {
      title: 'Business & Sales Marketing Executive',
      location: 'Irinjalakuda, Kerala',
      employmentType: 'Full-time',
      experience: '2+ years',
      workplace: 'On-site',
      salary: '₹2–3 LPA',
      responsibilities: ['Generate leads'],
      requirements: ['Good communication skills'],
      goodToHave: ['NBFC experience'],
    } as CareerDocument;

    const application = {
      candidate: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+919999999999',
        experience: '4',
        location: 'Thrissur',
      },
      coverLetter: 'I have led regional sales.',
    } as ApplicationDocument;

    const prompt = buildResumeAnalysisPrompt(
      career,
      application,
      'Closed 40 new client accounts.',
    );

    expect(prompt).toContain('Business & Sales Marketing Executive');
    expect(prompt).toContain('Irinjalakuda, Kerala');
    expect(prompt).toContain('Full-time');
    expect(prompt).toContain('2+ years');
    expect(prompt).toContain('On-site');
    expect(prompt).toContain('₹2–3 LPA');
    expect(prompt).toContain('Generate leads');
    expect(prompt).toContain('Good communication skills');
    expect(prompt).toContain('NBFC experience');
    expect(prompt).toContain('John Doe');
    expect(prompt).toContain('I have led regional sales.');
    expect(prompt).toContain('Closed 40 new client accounts.');
    expect(prompt).toContain('Do not assume a generic role');
  });
});
