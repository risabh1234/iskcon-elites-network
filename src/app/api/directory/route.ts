import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. Sync User to Database (Upsert to ensure Foreign Key constraints)
    const email = user.emailAddresses?.[0]?.emailAddress || 'no-email@example.com';
    const dbUser = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        email: email,
        role: 'USER', // Default to USER, not ADMIN
      },
    });

    const body = await request.json();
    const { fullName, category, profileImage, cohort, title, bio, story, recommendation, email: contactEmail } = body;

    if (!fullName || !category || !bio) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Insert into appropriate table based on Category
    if (category === 'Alumni') {
      if (!cohort) return NextResponse.json({ error: 'Cohort required for Alumni' }, { status: 400 });
      
      const newAlumnus = await prisma.alumnus.create({
        data: {
          name: fullName,
          category: category,
          cohort: cohort,
          bio: bio,
          story: story || null,
          recommendation: recommendation || null,
          email: contactEmail || null,
          avatarUrl: profileImage || null,
          addedById: dbUser.id,
          isApproved: dbUser.role === 'ADMIN' || dbUser.role === 'SUPERADMIN',
        }
      });
      return NextResponse.json({ success: true, data: newAlumnus });
    } 
    else if (category === 'Speaker' || category === 'Featured Guest') {
      const actualTitle = category === 'Featured Guest' ? 'Featured Guest' : title;
      if (!actualTitle) return NextResponse.json({ error: 'Title required for Speaker' }, { status: 400 });

      const newSpeaker = await prisma.speaker.create({
        data: {
          name: fullName,
          title: actualTitle,
          bio: bio,
          email: contactEmail || null,
          avatarUrl: profileImage || null,
          addedById: dbUser.id,
          isApproved: dbUser.role === 'ADMIN' || dbUser.role === 'SUPERADMIN',
        }
      });
      return NextResponse.json({ success: true, data: newSpeaker });
    }

    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });

  } catch (error) {
    console.error('Directory API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Only admins may see unapproved entries. Everyone else — including anonymous
    // callers — gets the published directory only.
    let isAdmin = false;
    const { userId } = await auth();
    if (userId) {
      const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
      isAdmin = !!dbUser && (dbUser.role === 'ADMIN' || dbUser.role === 'SUPERADMIN');
    }

    const whereClause = isAdmin ? {} : { isApproved: true };

    const alumni = await prisma.alumnus.findMany({ where: whereClause, orderBy: { createdAt: 'desc' } });
    const speakers = await prisma.speaker.findMany({ where: whereClause, orderBy: { createdAt: 'desc' } });

    return NextResponse.json({ alumni, speakers });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch directory' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPERADMIN')) {
      return new NextResponse('Forbidden: Admins only', { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const category = url.searchParams.get('category'); // 'alumni' or 'speaker'

    if (!id || !category) {
      return NextResponse.json({ error: 'Missing id or category' }, { status: 400 });
    }

    if (category === 'alumni') {
      await prisma.alumnus.delete({ where: { id } });
    } else if (category === 'speaker') {
      await prisma.speaker.delete({ where: { id } });
    } else {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Directory Delete Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
