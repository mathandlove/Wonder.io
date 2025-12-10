// API Configuration
// In development: uses localhost:3001
// In production: uses VITE_API_URL environment variable

const DEFAULT_API_URL = 'http://localhost:3001';

export const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
export const WS_URL = API_URL.replace(/^http/, 'ws');

// Convenience exports
export const API_ENDPOINTS = {
  AI_CHAT: `${API_URL}/api/ai/chat`,
  AI_VALIDATE: `${API_URL}/api/ai/validate`,
  AI_PROMPT_TEST: `${API_URL}/api/ai/prompt-test`,
  AI_FEEDBACK: `${API_URL}/api/ai/feedback`,
  STT_SOCKET: `${WS_URL}/api/stt/socket`,
  BUNDLE_HOTSPOTS: `${API_URL}/api/bundle/hotspots`,
  BUNDLE_IMAGES: `${API_URL}/api/bundle/images`,
  BUNDLE_MAPS: `${API_URL}/api/bundle/maps`,
  IMAGES: `${API_URL}/api/images`,
  EMAIL_SUBSCRIBE: `${API_URL}/api/email/subscribe`,
};
