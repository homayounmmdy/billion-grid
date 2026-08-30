// storage.js
import { exportData } from './mockApi';

export async function saveToServer() {
  const data = exportData();
  try {
    console.log('Attempting to save to server...', data.length, 'squares');

    const response = await fetch('/api/save-grid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // Check if the response is actually OK before parsing JSON
    if (!response.ok) {
      console.error('Server responded with status:', response.status);
      const text = await response.text();
      console.error('Response body:', text);
      return false;
    }

    const result = await response.json();
    if (result.success) {
      console.log('✅ Successfully saved to public/grid-data.json via server');
      return true;
    } else {
      console.error('❌ Server reported failure:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Network error while saving to server:', error);
    return false;
  }
}

export function saveToLocalStorage() {
    const data = exportData();
    localStorage.setItem('billionGridData', JSON.stringify(data));
}
