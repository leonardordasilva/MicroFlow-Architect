import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Brain, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { DiagramNode, DiagramEdge } from '@/types/diagram';

interface AIAnalysisPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export default function AIAnalysisPanel({ open, onOpenChange, nodes, edges }: AIAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (nodes.length === 0) {
      toast({ title: 'Nenhum diagrama para analisar', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setAnalysis('');

    try {
      const diagram = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          label: (n.data as any).label,
        })),
        edges: edges.map((e) => ({
          source: e.source,
          target: e.target,
          label: (e as any).label || '',
        })),
      };

      const { data, error } = await supabase.functions.invoke('analyze-diagram', {
        body: { diagram },
      });

      if (error) throw error;
      setAnalysis(data?.analysis || 'Sem análise disponível.');
    } catch (err: any) {
      console.error('AI analyze error:', err);
      toast({ title: 'Erro ao analisar', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análise de Arquitetura
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <Button onClick={handleAnalyze} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
            Analisar Arquitetura
          </Button>

          {analysis && (
            <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-muted/50 p-4">
              <div dangerouslySetInnerHTML={{ __html: analysis.replace(/\n/g, '<br/>') }} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
