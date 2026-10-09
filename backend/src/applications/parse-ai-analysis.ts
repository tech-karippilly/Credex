import { BadGatewayException } from '@nestjs/common';

export interface ParsedAiAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
}

const RECOMMENDATIONS = new Set(['SHORTLIST', 'REVIEW', 'REJECT']);

export function parseAiAnalysis(raw: string): ParsedAiAnalysis {
  const json = extractJson(raw);
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new BadGatewayException('Resume analysis failed');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new BadGatewayException('Resume analysis failed');
  }

  const record = parsed as Record<string, unknown>;
  const score = normalizeScore(record.score);
  const summary = normalizeText(record.summary);
  const recommendation = normalizeRecommendation(record.recommendation);

  if (score === null || !summary || !recommendation) {
    throw new BadGatewayException('Resume analysis failed');
  }

  return {
    score,
    summary,
    strengths: normalizeList(record.strengths),
    gaps: normalizeList(record.gaps),
    recommendation,
  };
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function normalizeScore(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 4000) : null;
}

function normalizeRecommendation(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return RECOMMENDATIONS.has(normalized) ? normalized : null;
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 12);
}
