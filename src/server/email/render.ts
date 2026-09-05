import { BRAND, SITE_NAME, siteUrl } from '@/lib/site';

/**
 * Transactional email, rendered as a string.
 *
 * Hand-written rather than React Email + Resend, deliberately. Email clients
 * are a 1998 rendering target: Outlook uses Word's engine, Gmail strips <style>
 * blocks, and nothing supports modern layout — so every rule has to be inline
 * on the element anyway. A React renderer would produce the same inline styles
 * through more dependencies, and this project has no mail provider configured
 * to send them with. See ADR-0034.
 *
 * The palette mirrors the site's tokens, which is the one place email and web
 * are allowed to agree by duplication (see BRAND).
 *
 * design-literal-allow-file: email HTML must carry inline pixel values on every
 * element. No mail client resolves CSS custom properties, and several ignore
 * rem — the tokens simply cannot reach this output.
 */
export type EmailContent = {
  subject: string;
  /** Rendered by clients that refuse HTML, and by screen readers in some. */
  text: string;
  html: string;
};

type Button = { label: string; href: string };

function layout(options: {
  preheader: string;
  heading: string;
  paragraphs: string[];
  button?: Button;
  footnote?: string;
}): string {
  const { preheader, heading, paragraphs, button, footnote } = options;

  // Inline styles only. A <style> block is stripped by Gmail.
  const p = `margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:${BRAND.inkMuted}`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.paper}">
<span style="display:none;font-size:1px;color:${BRAND.paper};max-height:0;overflow:hidden">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper}">
<tr><td align="center" style="padding:40px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${BRAND.line}">
<tr><td style="padding:40px">
<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.inkMuted}">${escapeHtml(SITE_NAME)}</p>
<h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:26px;line-height:1.2;font-weight:normal;color:${BRAND.ink}">${escapeHtml(heading)}</h1>
${paragraphs.map((text) => `<p style="${p}">${escapeHtml(text)}</p>`).join('\n')}
${
  button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0"><tr><td style="background:${BRAND.accent}">
<a href="${escapeAttr(button.href)}" style="display:inline-block;padding:12px 24px;font-family:Georgia,serif;font-size:16px;color:#ffffff;text-decoration:none">${escapeHtml(button.label)}</a>
</td></tr></table>`
    : ''
}
${footnote ? `<p style="margin:32px 0 0;padding-top:24px;border-top:1px solid ${BRAND.line};font-family:Georgia,serif;font-size:13px;line-height:1.5;color:${BRAND.inkMuted}">${escapeHtml(footnote)}</p>` : ''}
</td></tr></table>
<p style="margin:24px 0 0;font-family:Georgia,serif;font-size:12px;color:${BRAND.inkMuted}">${escapeHtml(SITE_NAME)}</p>
</td></tr></table></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const escapeAttr = escapeHtml;

function plain(heading: string, paragraphs: string[], button?: Button, footnote?: string): string {
  return [
    heading,
    '',
    ...paragraphs,
    ...(button ? ['', `${button.label}: ${button.href}`] : []),
    ...(footnote ? ['', footnote] : []),
    '',
    SITE_NAME,
  ].join('\n');
}

function build(options: Parameters<typeof layout>[0] & { subject: string }): EmailContent {
  return {
    subject: options.subject,
    text: plain(options.heading, options.paragraphs, options.button, options.footnote),
    html: layout(options),
  };
}

// ── Templates ─────────────────────────────────────────────────────────────

export function invitationEmail(options: { inviterName: string; token: string }): EmailContent {
  return build({
    subject: `You have been invited to ${SITE_NAME}`,
    preheader: 'An invitation to join the register.',
    heading: 'An invitation to the register',
    paragraphs: [
      `${options.inviterName} has invited you to join ${SITE_NAME} — a register of people who practise a tradition and a profession without asking either to make room for the other.`,
      'Creating an account takes a minute. Your entry is reviewed before it appears.',
    ],
    button: { label: 'Accept the invitation', href: `${siteUrl()}/sign-up?invite=${options.token}` },
    footnote: 'If you were not expecting this, you can ignore it. The invitation expires on its own.',
  });
}

export function entryApprovedEmail(options: { name: string; slug: string }): EmailContent {
  return build({
    subject: 'Your entry is published',
    preheader: 'Your directory entry has been reviewed and published.',
    heading: 'Your entry is published',
    paragraphs: [
      `${options.name}, your entry has been reviewed and is now part of the register.`,
      'Members can find you by name, field or city. You can edit it at any time.',
    ],
    button: { label: 'View your entry', href: `${siteUrl()}/directory/${options.slug}` },
  });
}

export function entryRejectedEmail(options: { name: string; reason: string }): EmailContent {
  return build({
    subject: 'About your directory entry',
    preheader: 'Your entry was not published. Here is why.',
    heading: 'Your entry was not published',
    paragraphs: [
      `${options.name}, a reviewer looked at your entry and did not publish it.`,
      // The reason is always included: a rejection without one is not a
      // decision the person can act on.
      `Their reason: ${options.reason}`,
      'You can edit the entry and submit it again.',
    ],
    button: { label: 'Edit your entry', href: `${siteUrl()}/directory/submit` },
  });
}

export function eventConfirmationEmail(options: {
  name: string;
  eventTitle: string;
  whenLocal: string;
  timezone: string;
  eventId: string;
  waitlisted?: boolean;
}): EmailContent {
  return build({
    subject: options.waitlisted
      ? `Waiting list: ${options.eventTitle}`
      : `You are registered: ${options.eventTitle}`,
    preheader: options.waitlisted ? 'You are on the waiting list.' : 'Your place is confirmed.',
    heading: options.waitlisted ? 'You are on the waiting list' : 'Your place is confirmed',
    paragraphs: [
      `${options.name}, ${options.waitlisted ? 'the event is full and you have been added to the waiting list for' : 'you are registered for'} ${options.eventTitle}.`,
      // The event's own zone is stated explicitly: an email is read anywhere,
      // and a bare time is the classic way people miss a gathering.
      `${options.whenLocal} (${options.timezone}).`,
    ],
    button: { label: 'Add to your calendar', href: `${siteUrl()}/api/events/${options.eventId}/calendar` },
    footnote: options.waitlisted ? 'We will write again if a place opens.' : undefined,
  });
}

export function mentorshipRequestEmail(options: {
  mentorName: string;
  requesterName: string;
  message: string;
}): EmailContent {
  return build({
    subject: `A mentorship request from ${options.requesterName}`,
    preheader: 'Someone in the network has asked for your time.',
    heading: 'A mentorship request',
    paragraphs: [
      `${options.mentorName}, ${options.requesterName} has asked for a conversation.`,
      options.message,
      'Declining is normal, and suggesting someone better placed is welcome.',
    ],
    button: { label: 'Respond to the request', href: `${siteUrl()}/mentorship` },
  });
}
