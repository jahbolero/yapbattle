// Simple in-memory store for rooms and messages (in production, use a database)
// Add persistence layer to avoid data loss during development

let _roomStore: Map<string, any> | null = null;
let _messageStore: Map<string, any[]> | null = null;

function getRoomStore() {
  if (!_roomStore) {
    _roomStore = new Map();
    // Try to restore from global if it exists (development hot reload)
    if (typeof global !== 'undefined' && (global as any).__roomStore) {
      _roomStore = (global as any).__roomStore;
    } else if (typeof global !== 'undefined') {
      (global as any).__roomStore = _roomStore;
    }
  }
  return _roomStore;
}

function getMessageStore() {
  if (!_messageStore) {
    _messageStore = new Map();
    // Try to restore from global if it exists (development hot reload)
    if (typeof global !== 'undefined' && (global as any).__messageStore) {
      _messageStore = (global as any).__messageStore;
    } else if (typeof global !== 'undefined') {
      (global as any).__messageStore = _messageStore;
    }
  }
  return _messageStore;
}

export const roomStore = getRoomStore();
export const messageStore = getMessageStore();