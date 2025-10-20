/**
 * Claude Streaming Proxy
 *
 * This module handles streaming responses from Claude API with comprehensive
 * debug logging to understand the streaming event structure.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { WebSocket } from 'ws';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY not found - Claude proxy will not work');
}

const client = new Anthropic({
  apiKey: ANTHROPIC_API_KEY || '',
});

// ──────────────────────────────────────────────────────────────────────────────
// Types for frontend communication
// ──────────────────────────────────────────────────────────────────────────────

export type ClaudeClientMessage =
  | { type: 'message'; text: string; context?: string }
  | { type: 'stop' };

export type ClaudeServerMessage =
  | { type: 'content_delta'; text: string; index: number }
  | { type: 'content_complete'; index: number }
  | { type: 'message_complete' }
  | { type: 'error'; message: string }
  | { type: 'debug'; event: string; data: any };

// ──────────────────────────────────────────────────────────────────────────────
// WebSocket Handler
// ──────────────────────────────────────────────────────────────────────────────

export async function handleClaudeProxy(ws: WebSocket) {
  console.log('🔵 Claude WebSocket connection established');

  let isStreaming = false;
  let currentStream: AsyncIterable<any> | null = null;

  ws.on('message', async (data: Buffer) => {
    try {
      const message: ClaudeClientMessage = JSON.parse(data.toString());

      // ────────────────────────────────────────────────────────────────────────
      // Handle STOP command
      // ────────────────────────────────────────────────────────────────────────
      if (message.type === 'stop') {
        console.log('🛑 Stop command received');
        isStreaming = false;
        currentStream = null;
        return;
      }

      // ────────────────────────────────────────────────────────────────────────
      // Handle MESSAGE command
      // ────────────────────────────────────────────────────────────────────────
      if (message.type === 'message') {
        if (!ANTHROPIC_API_KEY) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'ANTHROPIC_API_KEY not configured'
          } satisfies ClaudeServerMessage));
          return;
        }

        console.log('📨 Received message:', message.text.substring(0, 100));
        isStreaming = true;

        try {
          // Create streaming request to Claude
          const stream = await client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: message.text
            }],
            stream: true,
          });

          currentStream = stream;

          // ──────────────────────────────────────────────────────────────────
          // Process streaming events
          // ──────────────────────────────────────────────────────────────────
          for await (const event of stream) {
            // Stop processing if stop command was received
            if (!isStreaming) {
              console.log('🛑 Streaming stopped by user');
              break;
            }

            // ────────────────────────────────────────────────────────────────
            // DEBUG LOGGING - Log every event with full details
            // ────────────────────────────────────────────────────────────────
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📊 CLAUDE STREAM EVENT');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Event Type:', event.type);
            console.log('Full Event:', JSON.stringify(event, null, 2));
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            // Send debug event to frontend
            ws.send(JSON.stringify({
              type: 'debug',
              event: event.type,
              data: event
            } satisfies ClaudeServerMessage));

            // ────────────────────────────────────────────────────────────────
            // Handle different event types
            // ────────────────────────────────────────────────────────────────
            if (event.type === 'message_start') {
              console.log('🎬 Message Start:', {
                id: event.message?.id,
                model: event.message?.model,
                role: event.message?.role,
                usage: event.message?.usage
              });
            } else if (event.type === 'content_block_start') {
              console.log('📝 Content Block Start:', {
                index: event.index,
                content_block: event.content_block
              });
            } else if (event.type === 'content_block_delta') {
              // This is where text chunks arrive
              if (event.delta?.type === 'text_delta') {
                const text = event.delta.text;
                console.log('✍️  Text Delta:', {
                  index: event.index,
                  text: text,
                  length: text.length
                });

                // Send text to frontend
                ws.send(JSON.stringify({
                  type: 'content_delta',
                  text: text,
                  index: event.index
                } satisfies ClaudeServerMessage));
              }
            } else if (event.type === 'content_block_stop') {
              console.log('✅ Content Block Stop:', {
                index: event.index
              });

              ws.send(JSON.stringify({
                type: 'content_complete',
                index: event.index
              } satisfies ClaudeServerMessage));
            } else if (event.type === 'message_delta') {
              console.log('📊 Message Delta:', {
                delta: event.delta,
                usage: event.usage
              });
            } else if (event.type === 'message_stop') {
              console.log('🏁 Message Stop');

              ws.send(JSON.stringify({
                type: 'message_complete'
              } satisfies ClaudeServerMessage));
            } else {
              // Handle any other event types (ping, error, etc.)
              console.log('❓ Unknown/unhandled event type:', (event as any).type);
            }
          }

          console.log('✅ Stream completed successfully');
          isStreaming = false;

        } catch (error) {
          console.error('❌ Claude API Error:', error);

          ws.send(JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          } satisfies ClaudeServerMessage));

          isStreaming = false;
        }
      }

    } catch (error) {
      console.error('❌ WebSocket message handling error:', error);

      ws.send(JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to parse message'
      } satisfies ClaudeServerMessage));
    }
  });

  ws.on('close', () => {
    console.log('🔴 Claude WebSocket connection closed');
    isStreaming = false;
    currentStream = null;
  });

  ws.on('error', (error) => {
    console.error('❌ Claude WebSocket error:', error);
    isStreaming = false;
    currentStream = null;
  });
}
