/**
 * EmailSignUpScene Component
 * Displays an email signup form with cardboard bubble styling matching the app aesthetic.
 * Integrates with Brevo for email list management.
 */
import { useState } from 'react';
import type { EmailSignUpScene } from '@core/types/scene';
import type { SceneProps } from './registry';
import { API_ENDPOINTS } from '../../config';
import './EmailSignUpScene.css';

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export default function EmailSignUpScene({ scene }: SceneProps<EmailSignUpScene>) {
  const [email, setEmail] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const title = scene.title || 'Stay in the Story!';
  const subtitle = scene.subtitle || 'Sign up for updates on new books and adventures';
  const buttonText = scene.buttonText || 'Subscribe';
  const successMessage = scene.successMessage || "You're all set! Watch your inbox for magical updates.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      setSubmitState('error');
      return;
    }

    setSubmitState('loading');
    setErrorMessage('');

    try {
      const response = await fetch(API_ENDPOINTS.EMAIL_SUBSCRIBE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to subscribe');
      }

      // Save subscription status to localStorage so we skip this scene next time
      localStorage.setItem('wonder-email-subscribed', 'true');

      // Dispatch event to notify ScrollDownToast to update its text
      window.dispatchEvent(new CustomEvent('email-subscribed'));

      setSubmitState('success');
      setEmail('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
      setSubmitState('error');
    }
  };

  return (
    <div className="email-signup-scene-container">
      <div className="email-signup-bubble">
        <div className="email-signup-bubble-inner">
          {submitState === 'success' ? (
            <div className="email-signup-success">
              <div className="success-icon">✓</div>
              <p className="success-message">{successMessage}</p>
            </div>
          ) : (
            <>
              <h2 className="email-signup-title">{title}</h2>
              <p className="email-signup-subtitle">{subtitle}</p>

              <form onSubmit={handleSubmit} className="email-signup-form">
                <div className="email-input-wrapper">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (submitState === 'error') {
                        setSubmitState('idle');
                        setErrorMessage('');
                      }
                    }}
                    placeholder="Enter your email"
                    className={`email-input ${submitState === 'error' ? 'email-input-error' : ''}`}
                    disabled={submitState === 'loading'}
                    aria-label="Email address"
                  />
                </div>

                {errorMessage && (
                  <p className="email-error-message">{errorMessage}</p>
                )}

                <button
                  type="submit"
                  className="email-submit-button"
                  disabled={submitState === 'loading'}
                >
                  {submitState === 'loading' ? (
                    <span className="loading-spinner" />
                  ) : (
                    buttonText
                  )}
                </button>
              </form>

              <p className="email-privacy-note">
                We respect your privacy. Unsubscribe anytime.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
