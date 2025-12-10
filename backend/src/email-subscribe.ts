/**
 * Email subscription handler using Brevo API
 * https://developers.brevo.com/reference/createcontact
 */
import { Request, Response } from 'express';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID ? parseInt(process.env.BREVO_LIST_ID, 10) : undefined;

interface BrevoContactPayload {
  email: string;
  listIds?: number[];
  updateEnabled?: boolean;
}

interface BrevoErrorResponse {
  code: string;
  message: string;
}

export async function handleEmailSubscribe(req: Request, res: Response) {
  const { email } = req.body;

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

  try {
    const payload: BrevoContactPayload = {
      email: email.toLowerCase().trim(),
      updateEnabled: true, // Update contact if already exists
    };

    // Add to specific list if configured
    if (BREVO_LIST_ID) {
      payload.listIds = [BREVO_LIST_ID];
    }

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    // Handle various response scenarios
    if (response.status === 201) {
      // Successfully created new contact
      return res.status(201).json({
        success: true,
        message: 'Successfully subscribed'
      });
    }

    if (response.status === 204) {
      // Contact already exists and was updated
      return res.status(200).json({
        success: true,
        message: 'Subscription updated'
      });
    }

    // Handle error responses
    const errorData: BrevoErrorResponse = await response.json();

    if (errorData.code === 'duplicate_parameter') {
      // Contact already exists (and updateEnabled didn't apply for some reason)
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
