import { NextResponse } from 'next/server';
import { getPostgresRuntimeStatus } from '../../../../lib/postgres';

export async function GET() {
  return NextResponse.json({
    data: {
      database: getPostgresRuntimeStatus()
    }
  });
}
