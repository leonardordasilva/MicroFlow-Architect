import { useState, useCallback, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileJson } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ImportDiagramSchema } from '@/schemas/diagramSchema';
import { ZodError } from 'zod';

interface ImportJSONModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: { nodes: any[]; edges: any[]; name?: string }) => void;
}

export default function ImportJSONModal({ open, onOpenChange, onImport }: ImportJSONModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const validated = ImportDiagramSchema.parse(parsed);
      onImport({ nodes: validated.nodes, edges: validated.edges, name: validated.name });
      onOpenChange(false);
      setJsonText('');
    } catch (err: any) {
      if (err instanceof ZodError) {
        const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
        toast({ title: 'Validação falhou', description: messages, variant: 'destructive' });
      } else {
        toast({ title: 'JSON inválido', description: err.message, variant: 'destructive' });
      }
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast({ title: 'Formato inválido', description: 'Apenas arquivos .json são aceitos', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setJsonText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Diagrama JSON
          </DialogTitle>
          <DialogDescription>Arraste um arquivo .json ou cole o conteúdo abaixo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
              dragging
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-muted-foreground'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileJson className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {dragging ? 'Solte o arquivo aqui' : 'Arraste um .json ou clique para selecionar'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

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
