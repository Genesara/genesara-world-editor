import type { ProblemDetail } from '../types';

export class ApiError extends Error {
  readonly status: number;
  readonly detail?: string;
  readonly title: string;
  readonly problem: ProblemDetail;
  readonly warning?: string;

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${problem.status}`);
    this.name = 'ApiError';
    this.problem = problem;
    this.status = problem.status;
    this.detail = problem.detail;
    this.title = problem.title;
    this.warning = problem.warning;
  }

  get is401() {
    return this.status === 401;
  }
  get is403() {
    return this.status === 403;
  }
  get is404() {
    return this.status === 404;
  }
  get is429() {
    return this.status === 429;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
