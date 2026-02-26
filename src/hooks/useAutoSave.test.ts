import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAutoSave, clearAutoSave, type AutoSaveData } from './useAutoSave';

const STORAGE_KEY = 'microflow_autosave_v1';

describe('getAutoSave', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return null when nothing is saved', () => {
    expect(getAutoSave()).toBeNull();
  });

  it('should return saved data', () => {
    const data: AutoSaveData = {
      nodes: [{ id: '1' }],
      edges: [],
      title: 'Test',
      savedAt: new Date().toISOString(),
      version: '1',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    const result = getAutoSave();
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Test');
    expect(result!.nodes).toHaveLength(1);
  });

  it('should return null for invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json');
    expect(getAutoSave()).toBeNull();
  });

  it('should return null when nodes/edges are missing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: 'Test' }));
    expect(getAutoSave()).toBeNull();
  });
});

describe('clearAutoSave', () => {
  it('should remove the saved data', () => {
    localStorage.setItem(STORAGE_KEY, '{}');
    clearAutoSave();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
