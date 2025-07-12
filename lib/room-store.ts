// Simple in-memory store for rooms and messages (in production, use a database)
export const roomStore = new Map();
export const messageStore = new Map<string, any[]>();