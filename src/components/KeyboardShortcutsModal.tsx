import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { keys: 'Ctrl + Z', desc: 'Desfazer' },
  { keys: 'Ctrl + Y', desc: 'Refazer' },
  { keys: 'Ctrl + Shift + Z', desc: 'Refazer (alternativo)' },
  { keys: 'Delete', desc: 'Deletar selecionado' },
  { keys: 'Ctrl + S', desc: 'Salvar na nuvem' },
  { keys: 'Ctrl + A', desc: 'Selecionar todos os nós' },
  { keys: 'Escape', desc: 'Fechar modais / deselecionar' },
  { keys: '?', desc: 'Abrir atalhos de teclado' },
];

export default function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base">Atalhos de Teclado</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-foreground">{s.desc}</span>
              <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
