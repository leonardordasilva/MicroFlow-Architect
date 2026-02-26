import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import {
  findUserByEmail, shareDiagramWithUser, listDiagramShares, revokeShare,
  type ShareRecord,
} from '@/services/shareService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagramId: string;
  ownerId: string;
}

export default function ShareDiagramModal({ open, onOpenChange, diagramId, ownerId }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

  useEffect(() => {
    if (open && diagramId) {
      setLoadingShares(true);
      listDiagramShares(diagramId).then(setShares).finally(() => setLoadingShares(false));
    }
  }, [open, diagramId]);

  const handleShare = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setLoading(true);
    try {
      const user = await findUserByEmail(trimmed);
      if (!user) {
        toast({ title: 'Usuário não encontrado', description: 'Nenhum usuário cadastrado com este e-mail.', variant: 'destructive' });
        return;
      }
      if (user.id === ownerId) {
        toast({ title: 'Ação inválida', description: 'Você não pode compartilhar consigo mesmo.', variant: 'destructive' });
        return;
      }
      await shareDiagramWithUser(diagramId, ownerId, user.id);
      toast({ title: 'Diagrama compartilhado!', description: `Acesso concedido para ${trimmed}` });
      setEmail('');
      // Refresh shares list
      const updated = await listDiagramShares(diagramId);
      setShares(updated);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (share: ShareRecord) => {
    try {
      await revokeShare(share.id);
      setShares((prev) => prev.filter((s) => s.id !== share.id));
      toast({ title: 'Acesso revogado', description: `${share.shared_with_email} perdeu o acesso.` });
    } catch {
      toast({ title: 'Erro ao revogar', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base">Compartilhar Diagrama</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Adicione usuários por e-mail para dar permissão de edição.
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="email@exemplo.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleShare()}
              disabled={loading}
            />
            <Button onClick={handleShare} disabled={loading || !email.trim()} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            </Button>
          </div>

          {loadingShares ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : shares.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Usuários com acesso:</p>
              {shares.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm truncate">{s.shared_with_email}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRevoke(s)}
                    aria-label="Revogar acesso"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nenhum usuário com acesso compartilhado.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
