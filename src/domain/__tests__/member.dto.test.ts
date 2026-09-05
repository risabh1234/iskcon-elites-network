import { describe, expect, it } from 'vitest';
import type { Actor } from '@/server/policy';
import { toMemberDto, toSearchDto, type MemberRecord } from '@/domain/member/dto';

const anon: Actor = { kind: 'anonymous' };
const member: Actor = { kind: 'user', name: null, id: 'u1', email: 'u@e.com', role: 'USER', canCreateEvents: false };

const record = (over: Partial<MemberRecord> = {}): MemberRecord => ({
  id: 'm1', slug: 'srivasa-thakura', kind: 'ALUMNUS', legalName: 'Śrīvāsa Ṭhākura',
  initiatedName: 'Gaura Nitai Dāsa', headline: null, bio: 'Bio',
  city: 'Mumbai', countryCode: 'IN', cohort: '2018', email: 'contact@example.com',
  story: null, recommendation: null, status: 'APPROVED', visibility: 'NETWORK',
  approvedAt: new Date('2026-01-02'), createdAt: new Date('2026-01-01'),
  submittedById: 'u1', userId: null, avatarAsset: null,
  expertise: [{ expertise: { slug: 'medicine', label: 'Medicine', category: 'Health' } }],
  roles: [], links: [], ...over,
});

describe('location', () => {
  it('renders the country name rather than the code', () => {
    // Names are resolved in the reader's own language rather than stored, so
    // the register reads correctly wherever it is opened.
    expect(toMemberDto(record(), anon).location).toBe('Mumbai, India');
  });

  it('handles a country with no city, and a city with no country', () => {
    expect(toMemberDto(record({ city: null }), anon).location).toBe('India');
    expect(toMemberDto(record({ countryCode: null }), anon).location).toBe('Mumbai');
  });

  it('is null when neither is known', () => {
    expect(toMemberDto(record({ city: null, countryCode: null }), anon).location).toBeNull();
  });

  it('falls back to the raw code for an unknown country', () => {
    expect(toMemberDto(record({ countryCode: 'ZZ' }), anon).location).toContain('Mumbai');
  });
});

describe('headline', () => {
  it('uses the stored headline when there is one', () => {
    expect(toMemberDto(record({ headline: 'Consultant cardiologist' }), anon).headline)
      .toBe('Consultant cardiologist');
  });

  it('derives one from the current role when there is not', () => {
    const dto = toMemberDto(
      record({ roles: [{ title: 'Registrar', organization: { name: 'NHS England', slug: 'nhs' } }] }),
      anon,
    );
    expect(dto.headline).toBe('Registrar, NHS England');
  });

  it('is null when neither exists', () => {
    expect(toMemberDto(record(), anon).headline).toBeNull();
  });
});

describe('contact visibility', () => {
  it('is withheld from anonymous callers and present for members', () => {
    expect(toMemberDto(record(), anon).email).toBeUndefined();
    expect(toMemberDto(record(), member).email).toBe('contact@example.com');
  });
});

describe('avatar', () => {
  it('is null without an asset', () => {
    const dto = toMemberDto(record(), anon);
    expect(dto.avatarUrl).toBeNull();
    expect(dto.blurhash).toBeNull();
  });

  it('builds a public URL and carries the blurhash when there is one', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    const dto = toMemberDto(
      record({
        avatarAsset: { key: 'profiles/a.jpg', bucket: 'profiles', blurhash: 'LKO2', width: 800, height: 1000 },
      }),
      anon,
    );
    expect(dto.avatarUrl).toBe('https://example.supabase.co/storage/v1/object/public/profiles/profiles/a.jpg');
    expect(dto.blurhash).toBe('LKO2');
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });
});

describe('compatibility fields for the pre-Phase-5 UI', () => {
  it('maps kind to the old roleType', () => {
    expect(toMemberDto(record({ kind: 'ALUMNUS' }), anon).roleType).toBe('Alumni');
    expect(toMemberDto(record({ kind: 'SPEAKER' }), anon).roleType).toBe('Speaker');
    expect(toMemberDto(record({ kind: 'GUEST' }), anon).roleType).toBe('Speaker');
  });

  it('maps status to the old isApproved boolean', () => {
    expect(toMemberDto(record({ status: 'APPROVED' }), anon).isApproved).toBe(true);
    for (const status of ['PENDING', 'REJECTED', 'DRAFT', 'ARCHIVED'] as const) {
      expect(toMemberDto(record({ status }), anon).isApproved).toBe(false);
    }
  });

  it('labels an alumnus by cohort and a guest as Guest', () => {
    expect(toMemberDto(record({ kind: 'ALUMNUS', cohort: '2018' }), anon).primaryLabel).toBe('2018');
    expect(toMemberDto(record({ kind: 'GUEST' }), anon).primaryLabel).toBe('Guest');
    expect(toMemberDto(record({ kind: 'SPEAKER' }), anon).primaryLabel).toBe('Speaker');
  });
});

describe('toSearchDto', () => {
  it('carries the slug and formats the location', () => {
    const dto = toSearchDto({
      id: 'm1', slug: 'anna-novak', kind: 'SPEAKER', legalName: 'Anna Novak',
      initiatedName: null, headline: 'Founder', city: 'Berlin', countryCode: 'DE',
      status: 'APPROVED', rank: 0.9,
    });
    expect(dto.slug).toBe('anna-novak');
    expect(dto.location).toBe('Berlin, Germany');
  });

  it('never carries a rank or an email into the payload', () => {
    const dto = toSearchDto({
      id: 'm1', slug: 's', kind: 'ALUMNUS', legalName: 'A', initiatedName: null,
      headline: null, city: null, countryCode: null, status: 'APPROVED', rank: 0.5,
    });
    expect('rank' in dto).toBe(false);
    expect('email' in dto).toBe(false);
  });
});
