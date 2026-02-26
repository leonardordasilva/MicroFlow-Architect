import { supabase } from '@/integrations/supabase/client';
import type { DiagramNode, DiagramEdge } from '@/types/diagram';

export interface DiagramRecord {
  id: string;
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  owner_id: string;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export async function saveDiagram(
  title: string,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  ownerId: string,
  existingId?: string,
): Promise<DiagramRecord> {
  if (existingId) {
    const { data, error } = await supabase
      .from('diagrams')
      .update({
        title,
        nodes: nodes as any,
        edges: edges as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingId)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as DiagramRecord;
  }

  const { data, error } = await supabase
    .from('diagrams')
    .insert({
      title,
      nodes: nodes as any,
      edges: edges as any,
      owner_id: ownerId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DiagramRecord;
}

export async function loadDiagramByToken(shareToken: string): Promise<DiagramRecord | null> {
  const { data, error } = await supabase
    .from('diagrams')
    .select('*')
    .eq('share_token', shareToken)
    .single();
  if (error) return null;
  return data as unknown as DiagramRecord;
}

export async function loadUserDiagrams(userId: string): Promise<DiagramRecord[]> {
  const { data, error } = await supabase
    .from('diagrams')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });
  if (error) return [];
  return (data || []) as unknown as DiagramRecord[];
}

export async function loadDiagramById(id: string): Promise<DiagramRecord | null> {
  const { data, error } = await supabase
    .from('diagrams')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as unknown as DiagramRecord;
}
