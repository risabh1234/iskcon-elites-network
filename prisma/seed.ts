import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
/**
 * Seeds a realistic register.
 *
 * Density is a design input, not a convenience: a directory laid out against
 * three rows looks fine and falls apart at two hundred. Long names, missing
 * fields, mixed countries and a backlog of pending entries are all deliberate —
 * they are the cases the UI has to survive.
 *
 * Deterministic: the same seed produces the same register every time, so a
 * screenshot diff means a real change rather than reshuffled fixtures.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/** Mulberry32 — small, fast, and seeded, so runs are reproducible. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = rng(20260905);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(random() * xs.length)]!;
const chance = (p: number) => random() < p;

function slugify(input: string): string {
  return (
    input
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'member'
  );
}

// ── Vocabulary ─────────────────────────────────────────────────────────────

const EXPERTISE = [
  ['medicine', 'Medicine', 'Health'],
  ['surgery', 'Surgery', 'Health'],
  ['psychiatry', 'Psychiatry', 'Health'],
  ['software-engineering', 'Software engineering', 'Technology'],
  ['data-science', 'Data science', 'Technology'],
  ['product-design', 'Product design', 'Technology'],
  ['civil-service', 'Civil service', 'Public life'],
  ['policy', 'Public policy', 'Public life'],
  ['law', 'Law', 'Public life'],
  ['finance', 'Finance', 'Business'],
  ['entrepreneurship', 'Entrepreneurship', 'Business'],
  ['consulting', 'Consulting', 'Business'],
  ['academia', 'Academia', 'Education'],
  ['school-leadership', 'School leadership', 'Education'],
  ['sanskrit', 'Sanskrit studies', 'Tradition'],
  ['vedic-philosophy', 'Vedic philosophy', 'Tradition'],
  ['kirtan', 'Kirtan', 'Tradition'],
  ['agriculture', 'Agriculture', 'Environment'],
  ['sustainability', 'Sustainability', 'Environment'],
  ['journalism', 'Journalism', 'Media'],
] as const;

const ORGANISATIONS = [
  ['aiims', 'All India Institute of Medical Sciences'],
  ['tata-consultancy', 'Tata Consultancy Services'],
  ['infosys', 'Infosys'],
  ['isro', 'Indian Space Research Organisation'],
  ['reserve-bank', 'Reserve Bank of India'],
  ['iit-bombay', 'IIT Bombay'],
  ['oxford', 'University of Oxford'],
  ['nhs', 'NHS England'],
  ['google', 'Google'],
  ['microsoft', 'Microsoft'],
  ['mckinsey', 'McKinsey & Company'],
  ['unicef', 'UNICEF'],
  ['bhaktivedanta-research', 'Bhaktivedanta Research Centre'],
  ['iskcon-juhu', 'ISKCON Juhu'],
  ['deloitte', 'Deloitte'],
] as const;

// Transliterated and Western names mixed, because the register is both.
const GIVEN = [
  'Aditya', 'Ananya', 'Arjun', 'Bhakti', 'Chaitanya', 'Devaki', 'Gaura', 'Govinda',
  'Hari', 'Indira', 'Jagannath', 'Kamala', 'Keshava', 'Lakshmi', 'Madhava', 'Meera',
  'Nitai', 'Padma', 'Radha', 'Raghava', 'Rukmini', 'Shyama', 'Sita', 'Śrīvāsa',
  'Tulasi', 'Uddhava', 'Vrinda', 'Yashoda', 'Anil', 'Priya', 'Rohit', 'Kavita',
  'David', 'Sarah', 'Michael', 'Emma', 'Thomas', 'Claire', 'James', 'Anna',
] as const;

const FAMILY = [
  'Sharma', 'Patel', 'Iyer', 'Reddy', 'Nair', 'Desai', 'Joshi', 'Menon',
  'Bhatt', 'Rao', 'Kulkarni', 'Ṭhākura', 'Dāsa', 'Chatterjee', 'Banerjee',
  'Chen', 'Novak', 'Fernandes', 'O’Brien', 'Whitfield',
] as const;

const INITIATED = [
  'Gaura Nitai Dāsa', 'Rādhā Vallabha Dāsa', 'Śyāmasundara Dāsa', 'Bhakti Vinoda Dāsa',
  'Govinda Priya Devī Dāsī', 'Tulasī Devī Dāsī', 'Nitāi Gaura Dāsa', 'Madhava Dāsa',
] as const;

const CITIES = [
  ['Mumbai', 'IN', 'Asia/Kolkata'], ['Delhi', 'IN', 'Asia/Kolkata'],
  ['Bengaluru', 'IN', 'Asia/Kolkata'], ['Chennai', 'IN', 'Asia/Kolkata'],
  ['Pune', 'IN', 'Asia/Kolkata'], ['Kolkata', 'IN', 'Asia/Kolkata'],
  ['London', 'GB', 'Europe/London'], ['Manchester', 'GB', 'Europe/London'],
  ['New York', 'US', 'America/New_York'], ['San Francisco', 'US', 'America/Los_Angeles'],
  ['Chicago', 'US', 'America/Chicago'], ['Toronto', 'CA', 'America/Toronto'],
  ['Sydney', 'AU', 'Australia/Sydney'], ['Melbourne', 'AU', 'Australia/Melbourne'],
  ['Dubai', 'AE', 'Asia/Dubai'], ['Singapore', 'SG', 'Asia/Singapore'],
  ['Berlin', 'DE', 'Europe/Berlin'], ['Amsterdam', 'NL', 'Europe/Amsterdam'],
  ['Nairobi', 'KE', 'Africa/Nairobi'], ['São Paulo', 'BR', 'America/Sao_Paulo'],
] as const;

const TITLES = [
  'Consultant cardiologist', 'District Magistrate', 'Senior scientist',
  'VP of Engineering', 'Head of Policy', 'Professor of Sanskrit',
  'Partner', 'Founder', 'Principal', 'Director of Research',
  'Chief Medical Officer', 'Lead Data Scientist', 'General Counsel',
] as const;

const BIO_OPENERS = [
  'Has spent twenty years balancing clinical practice with daily sādhana.',
  'Works at the intersection of technology and tradition.',
  'Joined the network after a decade in public service.',
  'Teaches, writes, and keeps a small garden.',
  'Believes the two vocations are one vocation.',
  'Came to the tradition late and has stayed with it since.',
] as const;

const BIO_BODY = [
  'Their work has taken them across three continents, and the practice has come with them everywhere.',
  'They mentor two or three people a year, and say they learn more than they teach.',
  'Much of their week is unremarkable; they consider that the point.',
  'They are quick to say that the credentials are the least interesting thing about them.',
  'They write occasionally, and speak rarely, and are worth listening to when they do.',
] as const;

async function main() {
  console.log('Clearing existing seed data…');
  // Order matters: children before parents, since not every relation cascades.
  await prisma.auditLog.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.mentorshipRequest.deleteMany();
  await prisma.mentorshipProfile.deleteMany();
  await prisma.successStory.deleteMany();
  await prisma.event.deleteMany();
  await prisma.link.deleteMany();
  await prisma.memberRole.deleteMany();
  await prisma.memberExpertise.deleteMany();
  await prisma.member.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.expertise.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding vocabulary…');
  await prisma.expertise.createMany({
    data: EXPERTISE.map(([slug, label, category]) => ({ slug, label, category })),
  });
  await prisma.organization.createMany({
    data: ORGANISATIONS.map(([slug, name]) => ({ slug, name })),
  });

  const expertise = await prisma.expertise.findMany({ select: { id: true, slug: true } });
  const organisations = await prisma.organization.findMany({ select: { id: true } });

  console.log('Seeding users…');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Register Administrator',
      username: 'admin',
      role: 'SUPERADMIN',
      canCreateEvents: true,
      emailVerifiedAt: new Date(),
      // No password: use scripts/set-password.mjs. A seeded credential has a
      // way of surviving into production.
    },
  });

  const contributors = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      prisma.user.create({
        data: {
          email: `contributor${i + 1}@example.com`,
          name: `${pick(GIVEN)} ${pick(FAMILY)}`,
          role: 'USER',
          canCreateEvents: i < 2,
        },
      }),
    ),
  );
  const submitters = [admin, ...contributors];

  console.log('Seeding 200 members…');
  const usedSlugs = new Set<string>();

  for (let i = 0; i < 200; i += 1) {
    const legalName = `${pick(GIVEN)} ${pick(FAMILY)}`;
    const [city, countryCode, timezone] = pick(CITIES);

    let slug = slugify(legalName);
    if (usedSlugs.has(slug)) {
      let n = 2;
      while (usedSlugs.has(`${slug}-${n}`)) n += 1;
      slug = `${slug}-${n}`;
    }
    usedSlugs.add(slug);

    // A realistic backlog: most approved, a visible pending queue, a few
    // rejected and a couple archived — so the admin console has work to show.
    const roll = random();
    const status =
      roll < 0.78 ? 'APPROVED' : roll < 0.92 ? 'PENDING' : roll < 0.97 ? 'REJECTED' : 'ARCHIVED';

    const kind = chance(0.72) ? 'ALUMNUS' : chance(0.7) ? 'SPEAKER' : 'GUEST';
    const submitter = pick(submitters);

    const member = await prisma.member.create({
      data: {
        slug,
        kind,
        legalName,
        // Not everyone has one, and those who do are often known by it.
        initiatedName: chance(0.35) ? pick(INITIATED) : null,
        headline: chance(0.85) ? pick(TITLES) : null,
        bio: `${pick(BIO_OPENERS)} ${pick(BIO_BODY)}`,
        city,
        countryCode,
        timezone,
        cohort: kind === 'ALUMNUS' ? String(2004 + Math.floor(random() * 21)) : null,
        email: chance(0.6) ? `${slug}@example.com` : null,
        recommendation: chance(0.25) ? pick(BIO_BODY) : null,
        status,
        visibility: 'NETWORK',
        approvedAt: status === 'APPROVED' ? new Date(Date.now() - random() * 3.15e10) : null,
        approvedById: status === 'APPROVED' ? admin.id : null,
        submittedById: submitter.id,
        deletedAt: status === 'ARCHIVED' ? new Date() : null,
        createdAt: new Date(Date.now() - random() * 6.3e10),
      },
    });

    // One to three areas of expertise, deduped.
    const areas = new Set<string>();
    const count = 1 + Math.floor(random() * 3);
    while (areas.size < count) areas.add(pick(expertise).id);
    await prisma.memberExpertise.createMany({
      data: [...areas].map((expertiseId) => ({ memberId: member.id, expertiseId })),
    });

    if (chance(0.8)) {
      await prisma.memberRole.create({
        data: {
          memberId: member.id,
          organizationId: pick(organisations).id,
          title: pick(TITLES),
          isCurrent: true,
          startedOn: new Date(Date.now() - random() * 3.15e11),
        },
      });
    }

    if (chance(0.5)) {
      await prisma.link.create({
        data: {
          memberId: member.id,
          kind: 'LINKEDIN',
          url: `https://www.linkedin.com/in/${slug}`,
        },
      });
    }

    if (chance(0.18)) {
      await prisma.mentorshipProfile.create({
        data: {
          memberId: member.id,
          isAccepting: chance(0.7),
          capacity: 1 + Math.floor(random() * 4),
          focusAreas: pick(TITLES),
          blurb: pick(BIO_BODY),
        },
      });
    }
  }

  console.log('Seeding 30 events…');
  for (let i = 0; i < 30; i += 1) {
    const [city, countryCode, timezone] = pick(CITIES);
    // Two thirds upcoming, one third past, so both tabs have content.
    const offsetDays = chance(0.66) ? random() * 240 : -random() * 400;
    const startsAt = new Date(Date.now() + offsetDays * 86_400_000);
    const title = `${pick(['Annual gathering', 'Kirtan evening', 'Career roundtable', 'Bhagavad-gītā study', 'Mentorship mixer', 'Regional meet'])} — ${city}`;

    let slug = slugify(title);
    if (usedSlugs.has(slug)) slug = `${slug}-${i}`;
    usedSlugs.add(slug);

    const mode = chance(0.6) ? 'IN_PERSON' : chance(0.5) ? 'ONLINE' : 'HYBRID';

    await prisma.event.create({
      data: {
        slug,
        title,
        description: pick(BIO_BODY),
        startsAt,
        endsAt: new Date(startsAt.getTime() + 2 * 3_600_000),
        timezone,
        mode,
        venue: mode === 'ONLINE' ? null : `ISKCON ${city}`,
        city: mode === 'ONLINE' ? null : city,
        countryCode: mode === 'ONLINE' ? null : countryCode,
        onlineUrl: mode === 'IN_PERSON' ? null : 'https://meet.example.com/gathering',
        capacity: chance(0.5) ? 20 + Math.floor(random() * 180) : null,
        status: 'PUBLISHED',
        isHighlighted: i === 0,
        createdById: admin.id,
      },
    });
  }

  console.log('Seeding 20 stories…');
  const approvedMembers = await prisma.member.findMany({
    where: { status: 'APPROVED' },
    select: { id: true, legalName: true },
    take: 20,
  });

  for (let i = 0; i < 20; i += 1) {
    const subject = approvedMembers[i % approvedMembers.length];
    const title = `How ${subject?.legalName ?? 'a member'} came to the network`;
    let slug = slugify(title);
    if (usedSlugs.has(slug)) slug = `${slug}-${i}`;
    usedSlugs.add(slug);

    await prisma.successStory.create({
      data: {
        slug,
        title,
        excerpt: pick(BIO_OPENERS),
        body: Array.from({ length: 6 }, () => pick(BIO_BODY)).join('\n\n'),
        status: i < 16 ? 'PUBLISHED' : 'DRAFT',
        publishedAt: i < 16 ? new Date(Date.now() - random() * 3.15e10) : null,
        authorId: admin.id,
        memberId: subject?.id ?? null,
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    members: await prisma.member.count(),
    approved: await prisma.member.count({ where: { status: 'APPROVED', deletedAt: null } }),
    pending: await prisma.member.count({ where: { status: 'PENDING' } }),
    events: await prisma.event.count(),
    stories: await prisma.successStory.count(),
    mentors: await prisma.mentorshipProfile.count(),
  };

  console.log('\nSeeded:', counts);
  console.log('\nAdmin account: admin@example.com (no password set)');
  console.log("Set one with: node scripts/set-password.mjs admin@example.com '<a long password>'");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
