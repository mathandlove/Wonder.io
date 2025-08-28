import { Selection, Hotspot } from './types';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(__dirname, '../data/selections.json');
const HOTSPOTS_FILE = path.join(__dirname, '../data/hotspots.json');

// Simple file-based storage (in production, use a proper database)
export class SelectionStore {
  private ensureDataDirectory() {
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private loadSelections(): Selection[] {
    this.ensureDataDirectory();
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        const selections = JSON.parse(data);
        // Convert date strings back to Date objects
        return selections.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt)
        }));
      }
    } catch (error) {
      console.error('Error loading selections:', error);
    }
    return [];
  }

  private saveSelections(selections: Selection[]): void {
    this.ensureDataDirectory();
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(selections, null, 2));
    } catch (error) {
      console.error('Error saving selections:', error);
      throw error;
    }
  }

  public async getAllSelections(): Promise<Selection[]> {
    return this.loadSelections();
  }

  public async saveSelection(selection: Omit<Selection, 'id' | 'createdAt'>): Promise<Selection> {
    const selections = this.loadSelections();
    const newSelection: Selection = {
      id: Date.now().toString(), // Simple ID generation
      createdAt: new Date(),
      ...selection
    };
    
    selections.push(newSelection);
    this.saveSelections(selections);
    
    return newSelection;
  }

  public async deleteSelection(id: string): Promise<boolean> {
    const selections = this.loadSelections();
    const initialLength = selections.length;
    const filtered = selections.filter(s => s.id !== id);
    
    if (filtered.length !== initialLength) {
      this.saveSelections(filtered);
      return true;
    }
    return false;
  }

  public async clearAllSelections(): Promise<void> {
    this.saveSelections([]);
  }

  // Hotspot methods
  private loadHotspots(): Hotspot[] {
    this.ensureDataDirectory();
    try {
      if (fs.existsSync(HOTSPOTS_FILE)) {
        const data = fs.readFileSync(HOTSPOTS_FILE, 'utf8');
        const hotspots = JSON.parse(data);
        return hotspots.map((h: any) => ({
          ...h,
          createdAt: new Date(h.createdAt)
        }));
      }
    } catch (error) {
      console.error('Error loading hotspots:', error);
    }
    return [];
  }

  private saveHotspots(hotspots: Hotspot[]): void {
    this.ensureDataDirectory();
    try {
      fs.writeFileSync(HOTSPOTS_FILE, JSON.stringify(hotspots, null, 2));
    } catch (error) {
      console.error('Error saving hotspots:', error);
      throw error;
    }
  }

  public async getAllHotspots(): Promise<Hotspot[]> {
    return this.loadHotspots();
  }

  public async saveHotspot(hotspot: Omit<Hotspot, 'id' | 'createdAt'>): Promise<Hotspot> {
    const hotspots = this.loadHotspots();
    const newHotspot: Hotspot = {
      id: Date.now().toString(),
      createdAt: new Date(),
      ...hotspot
    };
    
    hotspots.push(newHotspot);
    this.saveHotspots(hotspots);
    
    return newHotspot;
  }

  public async updateHotspot(id: string, updates: Partial<Hotspot>): Promise<boolean> {
    const hotspots = this.loadHotspots();
    const index = hotspots.findIndex(h => h.id === id);
    
    if (index !== -1) {
      hotspots[index] = { ...hotspots[index], ...updates };
      this.saveHotspots(hotspots);
      return true;
    }
    return false;
  }

  public async deleteHotspot(id: string): Promise<boolean> {
    const hotspots = this.loadHotspots();
    const initialLength = hotspots.length;
    const filtered = hotspots.filter(h => h.id !== id);
    
    if (filtered.length !== initialLength) {
      this.saveHotspots(filtered);
      return true;
    }
    return false;
  }

  public async clearAllHotspots(): Promise<void> {
    this.saveHotspots([]);
  }
}