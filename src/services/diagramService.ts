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
      .eq('owner_id', ownerId)
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
    .rpc('get_diagram_by_share_token', { token: shareToken });
  if (error || !data || data.length === 0) return null;
  return data[0] as unknown as DiagramRecord;
}

const PAGE_SIZE = 12;

export async function loadUserDiagrams(
  userId: string,
  page = 0,
): Promise<{ diagrams: DiagramRecord[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE; // fetch 1 extra to detect hasMore
  const { data, error } = await supabase
    .from('diagrams')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })
    .range(from, to);
  if (error) return { diagrams: [], hasMore: false };
  const rows = (data || []) as unknown as DiagramRecord[];
  const hasMore = rows.length > PAGE_SIZE;
  return { diagrams: hasMore ? rows.slice(0, PAGE_SIZE) : rows, hasMore };
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

export async function deleteDiagram(id: string, ownerId: string): Promise<void> {
  const { error } = await supabase.from('diagrams').delete().eq('id', id).eq('owner_id', ownerId);
  if (error) throw error;
}

export async function saveSharedDiagram(
  diagramId: string,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): Promise<void> {
  const { error } = await supabase
    .from('diagrams')
    .update({
      nodes: nodes as any,
      edges: edges as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', diagramId);

  if (error) {
    throw new Error('Você não tem permissão de edição neste diagrama.');
  }
}

export async function renameDiagram(id: string, title: string, ownerId: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 100) {
    throw new Error('Título inválido: deve ter entre 1 e 100 caracteres');
  }
  const { error } = await supabase
    .from('diagrams')
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', ownerId);
  if (error) throw error;
}

export async function shareDiagram(diagramId: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('share-diagram', {
    body: { diagramId },
  });
  if (error || !data?.shareUrl) return null;
  return data.shareUrl as string;
}
