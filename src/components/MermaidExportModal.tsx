import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check } from 'lucide-react';

interface MermaidExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
}

export default function MermaidExportModal({ open, onOpenChange, code }: MermaidExportModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base">Exportar Mermaid.js</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Cole este código em{' '}
            <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer" className="underline text-primary">
              mermaid.live
            </a>{' '}
            ou em qualquer markdown que suporte Mermaid.
          </p>
          <Textarea
            value={code}
            readOnly
            rows={12}
            className="font-mono text-xs bg-muted"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado!' : 'Copiar código'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
