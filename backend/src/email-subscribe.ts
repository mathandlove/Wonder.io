/**
 * Email subscription handler using Brevo API
 * https://developers.brevo.com/reference/createcontact
 *
 * Callers send { email, source, page }. The signup location is stored on the
 * Brevo contact so automations can send different messages per source:
 *   SIGNUP_SOURCE      first place they signed up (set once, never overwritten)
 *   SIGNUP_PAGE        page path or book of that first signup
 *   LAST_SIGNUP_SOURCE most recent place they signed up
 * The three attributes were created in Brevo (Contacts > Settings > Attributes).
 */
import { Request, Response } from 'express';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID ? parseInt(process.env.BREVO_LIST_ID, 10) : undefined;

// Keep in sync with the callers: wonder.io LandingPage.vue and EndElements.vue,
// experiment EmailSignUpScene.tsx. Anything else is stored as "unknown".
const SIGNUP_SOURCES = ['landing_page', 'end_of_book', 'experiment'] as const;

// Per-source welcome email: a Brevo template ID in WELCOME_TEMPLATE_<SOURCE>
// (e.g. WELCOME_TEMPLATE_END_OF_BOOK=3). Unset means no welcome for that source.
// Sent only to new contacts.
function welcomeTemplateId(source: string): number | undefined {
  const raw = process.env[`WELCOME_TEMPLATE_${source.toUpperCase()}`];
  const id = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(id) ? id : undefined;
}

async function sendWelcome(apiKey: string, email: string, source: string) {
  const templateId = welcomeTemplateId(source);
  if (!templateId) return;
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: brevoHeaders(apiKey),
      body: JSON.stringify({ templateId, to: [{ email }] }),
    });
    if (!response.ok) {
      console.error('Brevo welcome email error:', source, response.status, await response.text());
    }
  } catch (error) {
    console.error('Welcome email error:', error);
  }
}

interface BrevoContactPayload {
  email: string;
  listIds?: number[];
  attributes?: Record<string, string>;
  updateEnabled?: boolean;
}

interface BrevoErrorResponse {
  code: string;
  message: string;
}

function brevoHeaders(apiKey: string) {
  return {
    'accept': 'application/json',
    'content-type': 'application/json',
    'api-key': apiKey,
  };
}

export async function handleEmailSubscribe(req: Request, res: Response) {
  const { email, source, page } = req.body;

  // Validate email
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Check for API key
  if (!BREVO_API_KEY) {
    console.error('BREVO_API_KEY is not configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const signupSource = (SIGNUP_SOURCES as readonly string[]).includes(source) ? source : 'unknown';
  const signupPage = typeof page === 'string' ? page.slice(0, 200) : '';

  try {
    // Create without updateEnabled so an existing contact's first source is kept.
    const payload: BrevoContactPayload = {
      email: normalizedEmail,
      attributes: {
        SIGNUP_SOURCE: signupSource,
        SIGNUP_PAGE: signupPage,
        LAST_SIGNUP_SOURCE: signupSource,
      },
    };

    // Add to specific list if configured
    if (BREVO_LIST_ID) {
      payload.listIds = [BREVO_LIST_ID];
    }

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: brevoHeaders(BREVO_API_KEY),
      body: JSON.stringify(payload),
    });

    if (response.status === 201) {
      // Successfully created new contact. Welcome email is fire-and-forget so a
      // send failure never fails the signup.
      void sendWelcome(BREVO_API_KEY, normalizedEmail, signupSource);
      return res.status(201).json({
        success: true,
        message: 'Successfully subscribed'
      });
    }

    const errorData: BrevoErrorResponse = await response.json();

    if (errorData.code === 'duplicate_parameter') {
      // Existing contact: record the latest source and make sure they're on the list.
      const update: BrevoContactPayload = {
        email: normalizedEmail,
        attributes: { LAST_SIGNUP_SOURCE: signupSource },
      };
      if (BREVO_LIST_ID) {
        update.listIds = [BREVO_LIST_ID];
      }
      const updateResponse = await fetch(
        `https://api.brevo.com/v3/contacts/${encodeURIComponent(normalizedEmail)}`,
        {
          method: 'PUT',
          headers: brevoHeaders(BREVO_API_KEY),
          body: JSON.stringify({ attributes: update.attributes, listIds: update.listIds }),
        },
      );
      if (!updateResponse.ok) {
        // Still subscribed; only the LAST_SIGNUP_SOURCE update failed.
        console.error('Brevo contact update error:', updateResponse.status, await updateResponse.text());
      }
      return res.status(200).json({
        success: true,
        message: 'Already subscribed'
      });
    }

    console.error('Brevo API error:', errorData);
    return res.status(response.status).json({
      error: errorData.message || 'Failed to subscribe'
    });

  } catch (error) {
    console.error('Email subscription error:', error);
    return res.status(500).json({ error: 'Failed to process subscription' });
  }
}
