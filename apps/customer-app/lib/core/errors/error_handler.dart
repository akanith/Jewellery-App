import 'package:supabase_flutter/supabase_flutter.dart';
import 'app_exception.dart';

/// DART ERROR NORMALIZATION ENGINE
/// 
/// Intercepts network/Supabase errors and converts them to AppException.
class ErrorHandler {
  static AppException normalize(dynamic error) {
    if (error is AppException) {
      return error;
    }

    if (error is AuthException) {
      final msg = error.message.toLowerCase();
      if (msg.contains('invalid login credentials') || msg.contains('invalid_credentials')) {
        return const AppException(
          message: 'Invalid mobile number or password. Please check your credentials.',
          type: AppExceptionType.unauthorized,
          code: 'invalid_credentials',
        );
      }
      if (msg.contains('user not found') || msg.contains('user_not_found')) {
        return const AppException(
          message: 'User account not found. Please contact support.',
          type: AppExceptionType.notFound,
          code: 'user_not_found',
        );
      }
      return AppException(
        message: error.message.isNotEmpty ? error.message : 'Authentication failed. Please try again.',
        type: AppExceptionType.unauthorized,
        code: error.statusCode,
        details: error,
      );
    }

    final String message = error.toString();

    if (message.contains('JWT') || message.contains('token') || message.contains('SessionExpired')) {
      return const AppException(
        message: 'Your session has expired. Please sign in again.',
        type: AppExceptionType.unauthorized,
      );
    }

    if (message.contains('row-level security') || message.contains('RLS')) {
      return const AppException(
        message: 'You do not have permission to access this resource.',
        type: AppExceptionType.forbidden,
      );
    }

    if (message.contains('SocketException') || message.contains('ClientException') || message.contains('Failed host lookup')) {
      return const AppException(
        message: 'Unable to connect to server. Please check your internet connection.',
        type: AppExceptionType.network,
      );
    }

    return AppException(
      message: message.isNotEmpty ? message : 'An unexpected error occurred.',
      type: AppExceptionType.unknown,
      details: error,
    );
  }
}

