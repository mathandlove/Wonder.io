import express from 'express';
import cors from 'cors';
import { SelectionStore } from './store';
import { Point } from './types';

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
    const isValidPoints = points.every((p: any) => 
      typeof p === 'object' && 
      typeof p.x === 'number' && 
      typeof p.y === 'number'
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 Backend server running on port ${port}`);
  console.log(`📊 API endpoints available at http://localhost:${port}/api`);
});