import { Either, left, right } from 'fp-ts/Either';

export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class DatabaseError extends DomainError {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message, 'DATABASE_ERROR', 500);
  }
}

export type Result<E extends DomainError, T> = Either<E, T>;

export const success = <T>(value: T): Either<never, T> => right(value);

export const failure = <E extends DomainError>(error: E): Either<E, never> =>
  left(error);

export function SafeResult() {
  return function (
    target,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: []) {
      try {
        const result = await originalMethod.apply(this, args);
        return right(result);
      } catch (error) {
        if (error instanceof DomainError) {
          return left(error);
        }
        return left(new DatabaseError('Unexpected error', error as Error));
      }
    };

    return descriptor;
  };
}
