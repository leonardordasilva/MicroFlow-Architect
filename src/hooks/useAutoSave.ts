import { useEffect, useRef, useState } from 'react';
import { useDiagramStore } from '@/store/diagramStore';

const STORAGE_KEY = 'microflow_autosave_v1';
const DEBOUNCE_MS = 1500;

export interface AutoSaveData {
  nodes: any[];
  edges: any[];
  title: string;
  savedAt: string;
  version: '1';
}

export type SaveStatus = 'idle' | 'saving' | 'saved';

export function useAutoSave() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const diagramName = useDiagramStore((s) => s.diagramName);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip first render (initial empty state)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Don't save empty canvas
    if (nodes.length === 0) return;

    setSaveStatus('saving');

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const data: AutoSaveData = {
        nodes,
        edges,
        title: diagramName,
        savedAt: new Date().toISOString(),
        version: '1',
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setSaveStatus('saved');
      } catch {
        setSaveStatus('idle');
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodes, edges, diagramName]);

  return { saveStatus };
}

export function getAutoSave(): AutoSaveData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AutoSaveData;
    if (!data.nodes || !data.edges) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearAutoSave() {
  localStorage.removeItem(STORAGE_KEY);
}
