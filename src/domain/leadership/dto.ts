import { assetUrl } from '@/lib/assets';

export type LeadershipStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type LeadershipMediaKind = 'PHOTO' | 'DOCUMENT';

/** What the repository returns for one attached file. */
export type LeadershipMediaRecord = {
  id: string;
  kind: LeadershipMediaKind;
  title: string;
  description: string | null;
  orderIndex: number;
  createdAt: Date;
  asset: { id: string; key: string; bucket: string; mime: string; bytes: number };
};

export type LeadershipProfileRecord = {
  id: string;
  slug: string;
  honorific: string | null;
  name: string;
  initiatedName: string | null;
  role: string | null;
  headline: string | null;
  bio: string;
  focusAreas: string | null;
  initiatives: string | null;
  status: LeadershipStatus;
  orderIndex: number;
  portraitAlt: string | null;
  portraitAsset: { id: string; key: string; bucket: string } | null;
  media: LeadershipMediaRecord[];
  updatedAt: Date;
};

export type LeadershipMediaDto = {
  id: string;
  kind: LeadershipMediaKind;
  title: string;
  description: string | null;
  url: string | null;
  mime: string;
  bytes: number;
  createdAt: string;
};

export type LeadershipProfileDto = {
  id: string;
  slug: string;
  honorific: string | null;
  name: string;
  initiatedName: string | null;
  /**
   * Honorific and name, assembled once. Every surface that shows this person
   * needs the same string, and three surfaces concatenating it three ways is
   * how one of them ends up saying "His Grace" twice.
   */
  displayName: string;
  role: string | null;
  headline: string | null;
  /** The raw text, for the editor. */
  bio: string;
  /** The same text split for rendering, so no component parses prose. */
  paragraphs: string[];
  focusAreas: string[];
  initiatives: string[];
  status: LeadershipStatus;
  portraitUrl: string | null;
  portraitAlt: string | null;
  photos: LeadershipMediaDto[];
  documents: LeadershipMediaDto[];
  updatedAt: string;
};

/** Blank lines separate paragraphs. Nothing else in the text is interpreted. */
export function toParagraphs(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** One item per line, for the two list fields. */
export function toLines(text: string | null): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function toMediaDto(record: LeadershipMediaRecord): LeadershipMediaDto {
  return {
    id: record.id,
    kind: record.kind,
    title: record.title,
    description: record.description,
    url: assetUrl(record.asset),
    mime: record.asset.mime,
    bytes: record.asset.bytes,
    createdAt: record.createdAt.toISOString(),
  };
}

export function toLeadershipDto(record: LeadershipProfileRecord): LeadershipProfileDto {
  const displayName = [record.honorific, record.name].filter(Boolean).join(' ');

  return {
    id: record.id,
    slug: record.slug,
    honorific: record.honorific,
    name: record.name,
    initiatedName: record.initiatedName,
    displayName,
    role: record.role,
    headline: record.headline,
    bio: record.bio,
    paragraphs: toParagraphs(record.bio),
    focusAreas: toLines(record.focusAreas),
    initiatives: toLines(record.initiatives),
    status: record.status,
    portraitUrl: assetUrl(record.portraitAsset),
    // Alt text is never invented from the name: "photograph of X" tells a
    // screen-reader user nothing the adjacent heading has not already said.
    portraitAlt: record.portraitAlt,
    photos: record.media.filter((m) => m.kind === 'PHOTO').map(toMediaDto),
    documents: record.media.filter((m) => m.kind === 'DOCUMENT').map(toMediaDto),
    updatedAt: record.updatedAt.toISOString(),
  };
}
