import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    deprecated: true,
    message: 'Legacy Auth test route is deprecated. Mobile-only customer login architecture active.',
  });
}
