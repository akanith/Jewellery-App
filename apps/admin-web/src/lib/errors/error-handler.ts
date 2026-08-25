import { AppError, ErrorCode } from './app-error';

/**
 * ERROR NORMALIZATION ENGINE
 * 
 * Intercepts raw errors from Supabase, PostgreSQL, Network, or third-party libraries
 * and transforms them into clean, predictable AppError instances.
 * 
 * Absolute Rule: The UI layer must NEVER see [object Object] or unhandled exception blobs.
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    const msg = error.message;

    // Supabase / Postgres error mapping
    if (msg.includes('JWT') || msg.includes('token') || msg.includes('invalid claim')) {
      return new AppError('Your session has expired. Please sign in again.', ErrorCode.UNAUTHORIZED, 401, error);
    }
    if (msg.includes('row-level security') || msg.includes('RLS')) {
      return new AppError('You do not have permission to perform this action.', ErrorCode.FORBIDDEN, 403, error);
    }
    if (msg.includes('unique constraint') || msg.includes('already exists')) {
      return new AppError('A record with this information already exists.', ErrorCode.CONFLICT, 409, error);
    }
    if (msg.includes('foreign key constraint')) {
      return new AppError('The referenced record does not exist or has dependent records.', ErrorCode.VALIDATION_ERROR, 400, error);
    }
    if (msg.includes('FetchError') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return new AppError('Network connection failure. Please check your internet connection.', ErrorCode.NETWORK_ERROR, 503, error);
    }

    return new AppError(msg, ErrorCode.INTERNAL_ERROR, 500, error);
  }

  if (typeof error === 'string') {
    return new AppError(error, ErrorCode.INTERNAL_ERROR, 500);
  }

  if (typeof error === 'object' && error !== null) {
    // Handling Supabase PostgrestError objects safely
    const obj = error as Record<string, unknown>;
    const message = typeof obj.message === 'string' ? obj.message : 'Database operation failed';
    const code = typeof obj.code === 'string' ? obj.code : 'UNKNOWN_DB_ERROR';

    return new AppError(message, ErrorCode.DATABASE_ERROR, 400, { dbCode: code, ...obj });
  }

  return new AppError('An unknown error occurred.', ErrorCode.INTERNAL_ERROR, 500);
}
