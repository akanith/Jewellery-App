import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:customer_app/app/app.dart';

void main() {
  testWidgets('Customer App Smoke Test', (WidgetTester tester) async {
    // Build CustomerApp wrapped in ProviderScope
    await tester.pumpWidget(
      const ProviderScope(
        child: CustomerApp(),
      ),
    );

    // Verify CustomerApp renders
    expect(find.byType(CustomerApp), findsOneWidget);
  });
}
