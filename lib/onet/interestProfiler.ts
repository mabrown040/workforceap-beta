/**
 * O*NET Interest Profiler (My Next Move) — Mini-IP (30) API helpers.
 * @see https://services.onetcenter.org/reference/mnm/ip
 */

import { onetApiGet } from '@/lib/onet/client';

export type IpResultRow = {
  href?: string;
  code: string;
  title: string;
  description?: string;
  score: number;
};

export type IpResultsResponse = {
  careers?: string;
  result: IpResultRow[];
  error?: string;
};

export type IpCareerRow = {
  href?: string;
  code: string;
  title: string;
  tags?: { bright_outlook?: boolean };
  fit?: string;
};

export type IpCareersResponse = {
  start?: number;
  end?: number;
  total?: number;
  next?: string;
  prev?: string;
  career?: IpCareerRow[];
  error?: string;
};

export async function getInterestProfilerResults(answers: string): Promise<IpResultsResponse> {
  const a = answers.trim();
  return onetApiGet<IpResultsResponse>('mnm/interestprofiler/results', { answers: a });
}

export async function getInterestProfilerCareers(
  answers: string,
  opts?: { start?: number; end?: number }
): Promise<IpCareersResponse> {
  const a = answers.trim();
  return onetApiGet<IpCareersResponse>('mnm/interestprofiler/careers', {
    answers: a,
    start: opts?.start,
    end: opts?.end,
  });
}

/** Paginated Mini-IP question list — use start/end to fetch all 30 (e.g. 1–20, 21–30). */
export async function getInterestProfilerQuestions30(start?: number, end?: number): Promise<unknown> {
  return onetApiGet<unknown>('mnm/interestprofiler/questions_30', { start, end });
}

export function parseQuestions30Payload(data: unknown): { id: string; text: string; area?: string }[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as { question?: unknown[] };
  const arr = d.question;
  if (!Array.isArray(arr)) return [];
  return arr.map((raw, i) => {
    const o = raw as {
      id?: string | number;
      text?: string;
      stem?: string;
      question?: string;
      interest?: { title?: string };
    };
    const text = o.text ?? o.stem ?? o.question ?? `Question ${i + 1}`;
    const area = o.interest?.title;
    return { id: String(o.id ?? i + 1), text, area };
  });
}

export async function fetchAllMiniIpQuestions(): Promise<{ id: string; text: string; area?: string }[]> {
  const first = await getInterestProfilerQuestions30(1, 20);
  const a = parseQuestions30Payload(first);
  const meta = first as { total?: number };
  const total = typeof meta.total === 'number' ? meta.total : 30;
  if (a.length >= total) return a.slice(0, total);
  const second = await getInterestProfilerQuestions30(a.length + 1, total);
  const b = parseQuestions30Payload(second);
  const merged = [...a, ...b];
  if (merged.length >= total) return merged.slice(0, total);
  const fallback = await getInterestProfilerQuestions30(1, total);
  return parseQuestions30Payload(fallback).slice(0, total);
}
