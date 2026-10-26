export class AppError extends Error {
  constructor(status, reason) {
    super(reason);
    this.status = status;
  }
}
export function assert(condition, status, reason) {
  if (!condition) throw new AppError(status, reason);
}
