import express from 'express';
import cors from 'cors';
import multer from 'multer';
import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

import { SelectionStore } from './store';
import { Point } from './types';
import { handleWhisperProxy } from './whisper-proxy-single'; // Using single-send approach
import { handleAIChat } from './ai-conversation';
import { handleAIValidation, handlePromptTest } from './ai-validation';
import { handleLoadBundleHotspots, handleSaveBundleHotspots, handleListBundleImages, handleGenerateThumbnails, handleListBundleMaps, handleSaveStory, handleLoadMapPaths, handleSaveMapPaths } from './bundle-hotspots';
import {
  handleImageGeneration,
  handleGetStoryImages,
  handleUpdateSceneImage,
  handleGetHistory,
  handleGetQueue,
  handleRenameImage,
  handleUseVersion,
  handleWipeHistory,
  handleWipeAllHistory,
  handleUpdateDescription,
  handleImageUpload,
  handleFixImageReferences
} from './image-generation';

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error('Missing OPENAI_API_KEY');

const app = express();
const port = process.env.PORT || 3001;
const store = new SelectionStore();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/selections', async (req, res) => {
  try {
    const selections = await store.getAllSelections();
    res.json(selections);
  } catch (error) {
    console.error('Error fetching selections:', error);
    res.status(500).json({ error: 'Failed to fetch selections' });
  }
});

app.post('/api/selections', async (req, res) => {
  try {
    const { points, mapId } = req.body;
    
    if (!points || !Array.isArray(points)) {
      return res.status(400).json({ error: 'Invalid points data' });
    }

    // Validate points structure
    const isValidPoints = points.every((p: unknown) =>
      typeof p === 'object' &&
      p !== null &&
      'x' in p &&
      'y' in p &&
      typeof (p as Point).x === 'number' &&
      typeof (p as Point).y === 'number'
    );

    if (!isValidPoints) {
      return res.status(400).json({ error: 'Invalid point structure' });
    }

    const selection = await store.saveSelection({
      points: points as Point[],
      mapId: mapId || 'default'
    });

    res.status(201).json(selection);
  } catch (error) {
    console.error('Error saving selection:', error);
    res.status(500).json({ error: 'Failed to save selection' });
  }
});

app.delete('/api/selections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await store.deleteSelection(id);
    
    if (deleted) {
      res.json({ message: 'Selection deleted successfully' });
    } else {
      res.status(404).json({ error: 'Selection not found' });
    }
  } catch (error) {
    console.error('Error deleting selection:', error);
    res.status(500).json({ error: 'Failed to delete selection' });
  }
});

app.delete('/api/selections', async (req, res) => {
  try {
    await store.clearAllSelections();
    res.json({ message: 'All selections cleared successfully' });
  } catch (error) {
    console.error('Error clearing selections:', error);
    res.status(500).json({ error: 'Failed to clear selections' });
  }
});

// Hotspot routes
app.get('/api/hotspots', async (req, res) => {
  try {
    const hotspots = await store.getAllHotspots();
    res.json(hotspots);
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
});

app.post('/api/hotspots', async (req, res) => {
  try {
    const { x, y, width, height, label, description, lassoSelectionId, points, mapId } = req.body;
    
    if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
      return res.status(400).json({ error: 'Invalid hotspot dimensions' });
    }

    const hotspot = await store.saveHotspot({
      x, y, width, height,
      label: label || 'New Hotspot',
      description,
      lassoSelectionId,
      points,
      mapId: mapId || 'default'
    });

    res.status(201).json(hotspot);
  } catch (error) {
    console.error('Error saving hotspot:', error);
    res.status(500).json({ error: 'Failed to save hotspot' });
  }
});

app.put('/api/hotspots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updated = await store.updateHotspot(id, updates);
    
    if (updated) {
      res.json({ message: 'Hotspot updated successfully' });
    } else {
      res.status(404).json({ error: 'Hotspot not found' });
    }
  } catch (error) {
    console.error('Error updating hotspot:', error);
    res.status(500).json({ error: 'Failed to update hotspot' });
  }
});

app.delete('/api/hotspots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await store.deleteHotspot(id);
    
    if (deleted) {
      res.json({ message: 'Hotspot deleted successfully' });
    } else {
      res.status(404).json({ error: 'Hotspot not found' });
    }
  } catch (error) {
    console.error('Error deleting hotspot:', error);
    res.status(500).json({ error: 'Failed to delete hotspot' });
  }
});

// AI Chat route
app.post('/api/ai/chat', handleAIChat);

// AI Validation route
app.post('/api/ai/validate', handleAIValidation);

// AI Prompt Test route (returns raw AI response for testing)
app.post('/api/ai/prompt-test', handlePromptTest);

// Bundle-based hotspot routes (for editor)
app.get('/api/bundle/hotspots', handleLoadBundleHotspots);
app.post('/api/bundle/hotspots', handleSaveBundleHotspots);
app.get('/api/bundle/images', handleListBundleImages);
app.get('/api/bundle/maps', handleListBundleMaps);
app.get('/api/bundle/map-paths', handleLoadMapPaths);
app.post('/api/bundle/map-paths', handleSaveMapPaths);
app.post('/api/bundle/hotspots/generate-thumbnails', handleGenerateThumbnails);
app.post('/api/bundle/story', handleSaveStory);

// Image generation routes (Gemini API)
app.post('/api/images/generate', handleImageGeneration);
app.get('/api/images/story', handleGetStoryImages);
app.post('/api/images/update-scene', handleUpdateSceneImage);

// Image history and queue routes
app.get('/api/images/history', handleGetHistory);
app.get('/api/images/queue', handleGetQueue);
app.post('/api/images/rename', handleRenameImage);
app.post('/api/images/use-version', handleUseVersion);
app.post('/api/images/wipe-history', handleWipeHistory);
app.post('/api/images/wipe-all-history', handleWipeAllHistory);
app.post('/api/images/update-description', handleUpdateDescription);
app.post('/api/images/upload', upload.single('file'), handleImageUpload);
app.post('/api/images/fix-references', handleFixImageReferences);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Check for SSL certs (shared with frontend for mobile testing)
const certDir = path.resolve(__dirname, '../../.cert');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');
const hasSSL = fs.existsSync(keyPath) && fs.existsSync(certPath);

// Create HTTP or HTTPS server for WebSocket upgrade
const server = hasSSL
  ? https.createServer({
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }, app).listen(port, () => {
      console.log(`🚀 Server running on https://localhost:${port} (HTTPS enabled for mobile)`);
      console.log(`🔌 WebSocket endpoint: wss://localhost:${port}/api/stt/socket`);
      console.log(`🔑 OpenAI API Key: ${key ? '✅ Loaded' : '❌ Missing'}`);
    })
  : app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
      console.log(`🔌 WebSocket endpoint: ws://localhost:${port}/api/stt/socket`);
      console.log(`🔑 OpenAI API Key: ${key ? '✅ Loaded' : '❌ Missing'}`);
    });

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade
server.on('upgrade', (request: IncomingMessage, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

  if (pathname === '/api/stt/socket') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      handleWhisperProxy(ws, request);
    });
  } else {
    socket.destroy();
  }
});