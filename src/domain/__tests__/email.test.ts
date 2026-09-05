import { describe, expect, it } from 'vitest';
import {
  entryApprovedEmail, entryRejectedEmail, eventConfirmationEmail,
  invitationEmail, mentorshipRequestEmail,
} from '@/server/email/render';

const ALL = [
  invitationEmail({ inviterName: 'A Reviewer', token: 'tok' }),
  entryApprovedEmail({ name: 'Śrīvāsa Ṭhākura', slug: 'srivasa-thakura' }),
  entryRejectedEmail({ name: 'Anna Novak', reason: 'We could not verify the role.' }),
  eventConfirmationEmail({
    name: 'Anna', eventTitle: 'Annual gathering', whenLocal: '14 Nov, 18:30',
    timezone: 'Asia/Kolkata', eventId: 'e1',
  }),
  mentorshipRequestEmail({ mentorName: 'A Mentor', requesterName: 'A Member', message: 'Hello.' }),
];

describe('every template', () => {
  it('carries a subject, a text part and an HTML part', () => {
    for (const email of ALL) {
      expect(email.subject.length).toBeGreaterThan(0);
      expect(email.text.length).toBeGreaterThan(0);
      expect(email.html).toContain('<!doctype html>');
    }
  });

  it('styles inline, never in a <style> block', () => {
    // Gmail strips <style>. A rule that is not on the element does not exist.
    for (const email of ALL) {
      expect(email.html).not.toContain('<style');
    }
  });

  it('offers a plain-text alternative that is not the HTML', () => {
    for (const email of ALL) {
      expect(email.text).not.toContain('<');
    }
  });
});

describe('escaping', () => {
  it('escapes markup in user-supplied values', () => {
    // A member's own name reaches this template. An unescaped one is an
    // injection into every inbox that receives it.
    const email = entryRejectedEmail({
      name: '<script>alert(1)</script>',
      reason: 'Contains "quotes" & ampersands',
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.html).toContain('&amp;');
  });

  it('escapes the URL in a button href', () => {
    const email = invitationEmail({ inviterName: 'x', token: '"><img src=x>' });
    expect(email.html).not.toContain('"><img');
  });
});

describe('content rules', () => {
  it('always states the reason on a rejection', () => {
    const email = entryRejectedEmail({ name: 'Anna', reason: 'The cohort did not match.' });
    expect(email.text).toContain('The cohort did not match.');
    expect(email.html).toContain('The cohort did not match.');
  });

  it('names the event’s own timezone, because an email is read anywhere', () => {
    const email = eventConfirmationEmail({
      name: 'Anna', eventTitle: 'Gathering', whenLocal: '14 Nov, 18:30',
      timezone: 'Asia/Kolkata', eventId: 'e1',
    });
    expect(email.text).toContain('Asia/Kolkata');
  });

  it('distinguishes a waiting-list confirmation from a place', () => {
    const waitlisted = eventConfirmationEmail({
      name: 'Anna', eventTitle: 'Gathering', whenLocal: 'x',
      timezone: 'UTC', eventId: 'e1', waitlisted: true,
    });
    expect(waitlisted.subject.toLowerCase()).toContain('waiting list');
  });

  it('includes a preheader so the inbox preview is not the first link', () => {
    for (const email of ALL) {
      expect(email.html).toContain('max-height:0');
    }
  });
});
