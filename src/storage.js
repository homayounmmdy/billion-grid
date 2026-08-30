// storage.js

/**
 * Send ONLY the newly claimed square to the server.
 * The server will handle reading the existing file and appending it safely.
 */
export async function saveNewSquareToServer(newSquare) {
  try {
    console.log('Attempting to save new square to server...', newSquare);

    const response = await fetch('/api/save-grid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newSquare),
    });

    if (!response.ok) {
      console.error('Server responded with status:', response.status);
      return false;
    }

    const result = await response.json();
    if (result.success) {
      console.log('✅ Successfully appended to public/grid-data.json');
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
