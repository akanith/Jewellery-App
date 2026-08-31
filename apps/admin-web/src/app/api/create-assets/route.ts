import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    let assetsDir = path.resolve(process.cwd(), 'apps/customer-app/assets');
    if (!fs.existsSync(assetsDir)) {
      assetsDir = path.resolve(process.cwd(), '../customer-app/assets');
    }
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const buf = Buffer.from(base64Png, 'base64');

    fs.writeFileSync(path.join(assetsDir, 'icon.png'), buf);
    fs.writeFileSync(path.join(assetsDir, 'splash.png'), buf);
    fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), buf);

    return NextResponse.json({ success: true, message: 'PNG assets created', assetsDir });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
