import { useEffect, useRef, useState } from 'react';
import { useDiagramStore } from '@/store/diagramStore';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'microflow_autosave_v2';
const LEGACY_STORAGE_KEY = 'microflow_autosave_v1';
const DEBOUNCE_MS = 1500;

export interface AutoSaveData {
  nodes: any[];
  edges: any[];
  title: string;
  savedAt: string;
  version: '2';
}

export type SaveStatus = 'idle' | 'saving' | 'saved';

// PERF-06: Compress string using CompressionStream
async function compressString(input: string): Promise<string> {
  const blob = new Blob([input]);
  const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }
  // Merge chunks into a single Uint8Array, then convert to base64
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  let binary = '';
  for (let i = 0; i < merged.length; i++) {
    binary += String.fromCharCode(merged[i]);
  }
  return btoa(binary);
}

// PERF-06: Decompress base64-encoded gzip string
async function decompressString(base64: string): Promise<string> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes]);
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

export function useAutoSave() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const diagramName = useDiagramStore((s) => s.diagramName);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (nodes.length === 0) return;

    setSaveStatus('saving');

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const data: AutoSaveData = {
        nodes,
        edges,
        title: diagramName,
        savedAt: new Date().toISOString(),
        version: '2',
      };
      try {
        const json = JSON.stringify(data);
        const compressed = await compressString(json);
        localStorage.setItem(STORAGE_KEY, compressed);
        setSaveStatus('saved');
      } catch (e: any) {
        // PERF-06: Handle localStorage quota exceeded
        if (e?.name === 'QuotaExceededError' || e?.code === 22) {
          toast({
            title: 'Armazenamento local cheio',
            description: 'O diagrama é muito grande para salvar localmente. Salve na nuvem para não perder seu trabalho.',
            variant: 'destructive',
          });
        }
        setSaveStatus('idle');
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodes, edges, diagramName]);

  return { saveStatus };
}

export async function getAutoSave(): Promise<AutoSaveData | null> {
  try {
    // Try compressed format (v2) first
    const compressed = localStorage.getItem(STORAGE_KEY);
    if (compressed) {
      const json = await decompressString(compressed);
      const data = JSON.parse(json) as AutoSaveData;
      if (!data.nodes || !data.edges) return null;
      return data;
    }

    // Fallback: try legacy uncompressed format (v1)
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as any;
      if (!data.nodes || !data.edges) return null;
      return { ...data, version: '2' } as AutoSaveData;
    }

    return null;
  } catch {
    return null;
  }
}

export function clearAutoSave() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
