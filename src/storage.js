// Handles saving/loading grid data to localStorage and JSON files

import { exportData, importData } from './mockApi';

/**
 * Save current grid data to localStorage
 */
export function saveToLocalStorage() {
    const data = exportData();
    localStorage.setItem('billionGridData', JSON.stringify(data));
    console.log(`Saved ${data.length} squares to localStorage`);
}

/**
 * Download grid data as JSON file
 */
export function downloadJsonFile() {
    const data = exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'grid-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`Downloaded grid-data.json with ${data.length} squares`);
}

/**
 * Load grid data from uploaded JSON file
 */
export function loadFromJsonFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                importData(data);
                saveToLocalStorage();
                resolve(data.length);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}
