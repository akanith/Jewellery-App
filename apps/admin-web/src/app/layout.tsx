import type { Metadata } from 'next';
import './globals.css';
import { ADMIN_APP_CONFIG } from '@/config/app-config';
import { AdminLayout } from '@/components/layout/admin-layout';

export const metadata: Metadata = {
  title: ADMIN_APP_CONFIG.APP_TITLE,
  description: 'Owner and Admin Management Portal for Ramyas Jeweller Savings Scheme System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AdminLayout>{children}</AdminLayout>
      </body>
    </html>
  );
}
