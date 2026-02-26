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
    .rpc('get_diagram_by_share_token', { token: shareToken });
  if (error || !data || data.length === 0) return null;
  return data[0] as unknown as DiagramRecord;
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

export async function deleteDiagram(id: string): Promise<void> {
  const { error } = await supabase.from('diagrams').delete().eq('id', id);
  if (error) throw error;
}

export async function renameDiagram(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('diagrams')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function shareDiagram(diagramId: string): Promise<string | null> {
  // First ensure the diagram has a share_token and is marked as shared
  const { data: existing, error: fetchError } = await supabase
    .from('diagrams')
    .select('share_token, is_shared')
    .eq('id', diagramId)
    .single();

  if (fetchError) return null;

  let shareToken = existing?.share_token;

  // Generate a share token if one doesn't exist
  if (!shareToken) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(8));
    shareToken = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Update the diagram to be shared with the token
  const { error: updateError } = await supabase
    .from('diagrams')
    .update({
      share_token: shareToken,
      is_shared: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', diagramId);

  if (updateError) return null;
  return `${window.location.origin}/diagram/${shareToken}`;
}
