import { BadGatewayException } from '@nestjs/common';
import { parseAiAnalysis } from './parse-ai-analysis';

describe('parseAiAnalysis', () => {
  it('parses a fenced JSON analysis and clamps the score', () => {
    const parsed = parseAiAnalysis(`\`\`\`json
    {
      "score": 128,
      "summary": "Strong sales background.",
      "strengths": ["Lead generation"],
      "gaps": ["No NBFC work"],
      "recommendation": "shortlist"
    }
    \`\`\``);

    expect(parsed).toEqual({
      score: 100,
      summary: 'Strong sales background.',
      strengths: ['Lead generation'],
      gaps: ['No NBFC work'],
      recommendation: 'SHORTLIST',
    });
  });

  it('rejects an analysis that is not JSON', () => {
    expect(() => parseAiAnalysis('not json')).toThrow(BadGatewayException);
  });
});
