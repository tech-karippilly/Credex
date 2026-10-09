import { CareerDocument } from '../careers/schemas/career.schema';
import { ApplicationDocument } from './schemas/application.schema';

const MAX_RESUME_CHARS = 20000;

export function buildResumeAnalysisPrompt(
  career: CareerDocument,
  application: ApplicationDocument,
  resumeText: string,
): string {
  const trimmedResume = resumeText.trim().slice(0, MAX_RESUME_CHARS);
  const candidate = application.candidate;

  return [
    'You are screening one job application for Credex.',
    'Score the candidate only against the job description below.',
    'Do not assume a generic role, company standard, or job description that is not listed here.',
    '',
    'Job title: ' + career.title,
    'Location: ' + career.location,
    'Employment type: ' + career.employmentType,
    'Experience: ' + career.experience,
    'Workplace: ' + career.workplace,
    'Salary: ' + career.salary,
    'Responsibilities:',
    formatList(career.responsibilities),
    'Requirements:',
    formatList(career.requirements),
    'Good to have:',
    formatList(career.goodToHave),
    '',
    'Candidate:',
    'Name: ' + candidate.name,
    'Email: ' + candidate.email,
    'Phone: ' + candidate.phone,
    'Experience: ' + candidate.experience,
    'Current location: ' + candidate.location,
    'Cover letter: ' + (application.coverLetter?.trim() || 'None provided'),
    '',
    'Resume:',
    trimmedResume,
    '',
    'Return only JSON with this shape:',
    '{',
    '  "score": number from 0 to 100 for suitability to this specific job,',
    '  "summary": short explanation of the score,',
    '  "strengths": string[],',
    '  "gaps": string[],',
    '  "recommendation": "SHORTLIST" or "REVIEW" or "REJECT"',
    '}',
  ].join('\n');
}

function formatList(items: string[] | undefined): string {
  if (!items || items.length === 0) {
    return '- None listed';
  }

  return items.map((item) => `- ${item}`).join('\n');
}
