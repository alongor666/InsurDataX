
import { NextResponse } from 'next/server';
import { getAllV4DataFromDb } from '@/lib/db';
import type { V4PeriodData } from '@/data/types';

export async function GET() {
  try {
    const data: V4PeriodData[] = await getAllV4DataFromDb();
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Route Error fetching insurance data:", error);
    // In a real app, you might want to tailor the error message more
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ message: "Error fetching insurance data from database.", error: errorMessage }, { status: 500 });
  }
}
