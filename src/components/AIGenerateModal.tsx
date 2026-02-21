import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { DiagramNode, DiagramEdge } from '@/types/diagram';

interface AIGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (nodes: DiagramNode[], edges: DiagramEdge[]) => void;
}

export default function AIGenerateModal({ open, onOpenChange, onGenerate }: AIGenerateModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-diagram', {
        body: { description: prompt },
      });

      if (error) throw error;

      if (data?.nodes && data?.edges) {
        onGenerate(data.nodes, data.edges);
        onOpenChange(false);
        setPrompt('');
        toast({ title: 'Diagrama gerado com sucesso!' });
      } else {
        throw new Error('Resposta inválida da IA');
      }
    } catch (err: any) {
      console.error('AI generate error:', err);
      toast({ title: 'Erro ao gerar diagrama', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Diagrama com IA
          </DialogTitle>
          <DialogDescription>
            Descreva a arquitetura de microsserviços que você deseja criar.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          placeholder="Ex: Sistema de e-commerce com serviço de produtos, carrinho, pagamentos via Stripe, fila de pedidos com RabbitMQ e banco PostgreSQL..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          className="resize-none"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Gerar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
