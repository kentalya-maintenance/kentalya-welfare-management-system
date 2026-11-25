
import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST() {
  try {
    await deleteSession();

    return NextResponse.json({
      success: true,
      message: 'You have been logged out.',
    });
  } catch (error) {
    console.error('Welfare logout error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to log out. Please try again.',
      },
      { status: 500 },
    );
  }
}
