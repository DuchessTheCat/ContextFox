// IndexedDB utility for storing large file contents

const DB_NAME = "ContextFoxDB";
const DB_VERSION = 1;
const STORE_NAME = "fileContents";

interface FileContent {
  id: string; // story ID
  storyContent?: string;
  cardsContent?: string;
  zipParts?: Record<number, string>; // Plain object for storage
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function saveFileContents(storyId: string, data: Partial<FileContent>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Get existing data first
    const getRequest = store.get(storyId);

    getRequest.onsuccess = () => {
      const existing = getRequest.result || { id: storyId };
      const updated = { ...existing, ...data };

      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function loadFileContents(storyId: string): Promise<FileContent | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(storyId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteFileContents(storyId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(storyId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
