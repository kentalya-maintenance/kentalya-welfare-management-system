
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { compare } from 'bcryptjs';

import { db } from '@/db';
import { appUsers } from '@/db/schema';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const username =
      typeof body.username === 'string'
        ? body.username.trim()
        : '';

    const password =
      typeof body.password === 'string'
        ? body.password
        : '';

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Enter your username and password.' },
        { status: 400 },
      );
    }

    if (username.length > 100 || password.length > 200) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password.' },
        { status: 400 },
      );
    }

    const [user] = await db
      .select()
      .from(appUsers)
      .where(eq(appUsers.username, username))
      .limit(1);

    if (!user || !user.passwordHash || user.isActive !== 'yes') {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password.' },
        { status: 401 },
      );
    }

    const passwordMatches = await compare(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password.' },
        { status: 401 },
      );
    }

    await createSession({
      userId: user.id,
      username: user.username,
      role: user.role,
      employeeId: user.employeeId ?? null,
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employeeId,
      },
    });
  } catch (error) {
    console.error('Welfare login error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Unable to log in. Please try again.',
      },
      { status: 500 },
    );
  }
}
