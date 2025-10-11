export interface Point {
  x: number;
  y: number;
}

export interface Selection {
  id: string;
  points: Point[];
  createdAt: string; // Date as string from API
  mapId?: string;
}

export interface Hotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  description?: string;
  lassoSelectionId?: string;
  points?: Point[];
  createdAt: string;
  mapId?: string;
}

const API_BASE_URL = 'http://localhost:3001/api';

export class SelectionAPI {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async getAllSelections(): Promise<Selection[]> {
    const response = await fetch(`${API_BASE_URL}/selections`);
    return this.handleResponse<Selection[]>(response);
  }

  async saveSelection(points: Point[], mapId: string = 'default'): Promise<Selection> {
    const response = await fetch(`${API_BASE_URL}/selections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ points, mapId }),
    });
    return this.handleResponse<Selection>(response);
  }

  async deleteSelection(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/selections/${id}`, {
      method: 'DELETE',
    });
    await this.handleResponse<{ message: string }>(response);
  }

  async clearAllSelections(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/selections`, {
      method: 'DELETE',
    });
    await this.handleResponse<{ message: string }>(response);
  }

  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return this.handleResponse<{ status: string; timestamp: string }>(response);
  }

  // Hotspot methods
  async getAllHotspots(): Promise<Hotspot[]> {
    const response = await fetch(`${API_BASE_URL}/hotspots`);
    return this.handleResponse<Hotspot[]>(response);
  }

  async saveHotspot(hotspot: Omit<Hotspot, 'id' | 'createdAt'>): Promise<Hotspot> {
    const response = await fetch(`${API_BASE_URL}/hotspots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(hotspot),
    });
    return this.handleResponse<Hotspot>(response);
  }

  async updateHotspot(id: string, updates: Partial<Hotspot>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/hotspots/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    await this.handleResponse<{ message: string }>(response);
  }

  async deleteHotspot(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/hotspots/${id}`, {
      method: 'DELETE',
    });
    await this.handleResponse<{ message: string }>(response);
  }
}

// Singleton instance
export const selectionAPI = new SelectionAPI();