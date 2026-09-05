import { NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    let dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
    
    if (!dbUser) {
      // Auto-backfill user if webhook failed
      const clerkUser = await currentUser();
      if (clerkUser) {
        const clerkEmail = clerkUser.emailAddresses[0]?.emailAddress || '';
        const clerkUsername = clerkUser.username || 
                             (clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : 
                             clerkEmail.split('@')[0]);

        dbUser = await prisma.user.create({
          data: {
            clerkId: userId,
            email: clerkEmail,
            username: clerkUsername,
            // Never self-elevate. Admins are granted deliberately, via the admin console.
            role: 'USER',
            canCreateEvents: false,
          }
        });
      }
    }

    if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPERADMIN')) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Admin is authorized. Let's proactively sync all Clerk users to Prisma to ensure the dashboard is accurate.
    try {
      const client = await clerkClient();
      const clerkUsers = await client.users.getUserList();

      for (const u of clerkUsers.data) {
        const email = u.emailAddresses[0]?.emailAddress || '';
        const username = u.username || 
                        (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : 
                        email.split('@')[0]);
        
        await prisma.user.upsert({
          where: { clerkId: u.id },
          update: {
            email: email,
            username: username,
          },
          create: {
            clerkId: u.id,
            email: email,
            username: username,
            // Never self-elevate. Admins are granted deliberately, via the admin console.
            role: 'USER',
            canCreateEvents: false,
          }
        });
      }
    } catch (syncError) {
      console.warn("Could not sync users from Clerk (API key may be missing):", syncError);
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clerkId: true,
        email: true,
        username: true,
        role: true,
        canCreateEvents: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Fetch Users Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
