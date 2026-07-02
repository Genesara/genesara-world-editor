import { HttpResponse } from 'msw';
import type { ProblemDetail } from '../types';

export function problemResponse(
  status: number,
  title: string,
  detail: string,
  request: Request,
): HttpResponse<ProblemDetail> {
  const body: ProblemDetail = {
    type: 'about:blank',
    title,
    status,
    detail,
    instance: new URL(request.url).pathname,
  };
  return HttpResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}
