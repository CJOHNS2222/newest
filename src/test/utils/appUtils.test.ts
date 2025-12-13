import { describe, it, expect } from 'vitest';

// Test utility functions from App.tsx
describe('next7DateKeys', () => {
  it('should return 7 date keys', () => {
    const result = next7DateKeys();

    expect(result).toHaveLength(7);
    expect(typeof result[0]).toBe('string');
    expect(result[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
  });

  it('should return consecutive dates', () => {
    const result = next7DateKeys();

    for (let i = 1; i < result.length; i++) {
      const prevDate = new Date(result[i - 1]);
      const currentDate = new Date(result[i]);
      const diffTime = currentDate.getTime() - prevDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(1);
    }
  });
});

// Helper function to test (extracted from App.tsx)
function next7DateKeys(start = new Date()) {
  const keys: string[] = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const k = d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    keys.push(k);
    d.setDate(d.getDate() + 1);
  }
  return keys;
}