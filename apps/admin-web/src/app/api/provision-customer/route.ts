import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    deprecated: true,
    message: 'Legacy Auth provisioning is deprecated. Customer creation writes directly to public.customers and customer login is mobile-only via get_customer_by_mobile().',
  });
}

export async function GET() {
  return NextResponse.json({
    deprecated: true,
    message: 'Legacy Auth provisioning is deprecated. Mobile-only customer login architecture active.',
  });
}
