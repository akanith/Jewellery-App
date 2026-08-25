/// STANDARDIZED ERROR ARCHITECTURE — APP EXCEPTION
enum AppExceptionType {
  unauthorized,
  forbidden,
  notFound,
  validation,
  conflict,
  database,
  network,
  unknown,
}

class AppException implements Exception {
  final String message;
  final AppExceptionType type;
  final String? code;
  final dynamic details;

  const AppException({
    required this.message,
    this.type = AppExceptionType.unknown,
    this.code,
    this.details,
  });

  /// Always produces a clean, user-friendly message for UI presentation.
  String toUserMessage() {
    return message.isNotEmpty ? message : 'An unexpected error occurred. Please try again.';
  }

  @override
  String toString() => 'AppException(type: $type, message: $message, code: $code)';
}
