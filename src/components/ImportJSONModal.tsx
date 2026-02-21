import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ImportJSONModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: { nodes: any[]; edges: any[]; name?: string }) => void;
}

export default function ImportJSONModal({ open, onOpenChange, onImport }: ImportJSONModalProps) {
  const [jsonText, setJsonText] = useState('');

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.nodes || !parsed.edges) {
        throw new Error('JSON deve conter "nodes" e "edges"');
      }
      onImport(parsed);
      onOpenChange(false);
      setJsonText('');
    } catch (err: any) {
      toast({ title: 'JSON inválido', description: err.message, variant: 'destructive' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setJsonText(ev.target?.result as string);
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Diagrama JSON
          </DialogTitle>
          <DialogDescription>Cole o JSON ou selecione um arquivo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input type="file" accept=".json" onChange={handleFileUpload} className="text-sm text-muted-foreground" />
          <Textarea
            placeholder='{ "nodes": [...], "edges": [...] }'
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={8}
            className="font-mono text-xs resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!jsonText.trim()}>Importar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
