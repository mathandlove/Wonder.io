/**
 * "Talk to me" handler for wonder.io (Goal 2): emails a visitor's message to
 * Elliott using Brevo transactional email.
 * https://developers.brevo.com/reference/sendtransacemail
 *
 * The site also stores each message in Supabase (talk_messages), so a failed
 * email here never loses a message. Replies go to the visitor through Reply-To.
 */
import { Request, Response } from 'express';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const TALK_TO_ME_TO = process.env.TALK_TO_ME_TO || 'elliott@wonder.io';
// Must be a sender on the Brevo-authenticated wonder.io domain. Not elliott@,
// because Gmail can hide mail that arrives "from" one of your own send-as addresses.
const TALK_TO_ME_SENDER = process.env.TALK_TO_ME_SENDER || 'noreply@wonder.io';

const MESSAGE_MAX_LENGTH = 2000;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple per-IP rate limit. In-memory is enough for one Render instance;
// it resets on restart, which is fine for spam damping.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const recentByIp = new Map<string, number[]>();

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return (first || req.socket.remoteAddress || 'unknown').trim();
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (recentByIp.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    recentByIp.set(ip, recent);
    return true;
  }
  recent.push(now);
  recentByIp.set(ip, recent);
  return false;
}

export async function handleTalkToMe(req: Request, res: Response) {
  const { message, email, pagePath, website } = req.body || {};

  // Honeypot: real visitors never fill the hidden "website" field.
  if (website) {
    return res.status(200).json({ success: true });
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const replyTo = typeof email === 'string' ? email.trim() : '';
  if (replyTo && (replyTo.length > 254 || !emailRegex.test(replyTo))) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (isRateLimited(clientIp(req))) {
    return res.status(429).json({ error: 'Too many messages, try again later' });
  }

  if (!BREVO_API_KEY) {
    console.error('BREVO_API_KEY is not configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const text = message.trim().slice(0, MESSAGE_MAX_LENGTH);
  const page = typeof pagePath === 'string' ? pagePath.slice(0, 300) : '';
  const preview = text.replace(/\s+/g, ' ').slice(0, 60);

  const payload: Record<string, unknown> = {
    sender: { name: 'Wonder.io Talk to me', email: TALK_TO_ME_SENDER },
    to: [{ email: TALK_TO_ME_TO, name: 'Elliott' }],
    subject: `Talk to me: ${preview}`,
    textContent: [
      text,
      '',
      '---',
      `Reply email: ${replyTo || '(none given)'}`,
      `Page: ${page || '(unknown)'}`,
    ].join('\n'),
  };
  if (replyTo) {
    payload.replyTo = { email: replyTo };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return res.status(200).json({ success: true });
    }

    const errorData = await response.json().catch(() => ({}));
    console.error('Brevo transactional email error:', response.status, errorData);
    return res.status(502).json({ error: 'Failed to send message' });
  } catch (error) {
    console.error('Talk to me error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}
