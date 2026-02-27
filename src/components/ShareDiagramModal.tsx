import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Loader2, Trash2, Search } from 'lucide-react';
import {
  searchUsersByEmail, shareDiagramWithUser, listDiagramShares, revokeShare,
  type ShareRecord,
} from '@/services/shareService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagramId: string;
  ownerId: string;
}

interface UserResult {
  id: string;
  email: string;
}

export default function ShareDiagramModal({ open, onOpenChange, diagramId, ownerId }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

  // Load existing shares on open
  useEffect(() => {
    if (open && diagramId) {
      setLoadingShares(true);
      listDiagramShares(diagramId).then(setShares).finally(() => setLoadingShares(false));
      setQuery('');
      setResults([]);
      setSelected(new Set());
    }
  }, [open, diagramId]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const users = await searchUsersByEmail(query, ownerId);
      setResults(users);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, ownerId]);

  const alreadySharedIds = new Set(shares.map((s) => s.shared_with_id));

  const toggleSelect = useCallback((userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const handleShareSelected = async () => {
    if (selected.size === 0) return;
    setSharing(true);
    let successCount = 0;
    let errorCount = 0;
    for (const userId of selected) {
      try {
        await shareDiagramWithUser(diagramId, ownerId, userId);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    if (successCount > 0) {
      toast({ title: `Diagrama compartilhado com ${successCount} usuário(s)!` });
    }
    if (errorCount > 0) {
      toast({ title: `${errorCount} erro(s) ao compartilhar`, variant: 'destructive' });
    }
    setSelected(new Set());
    const updated = await listDiagramShares(diagramId);
    setShares(updated);
    setSharing(false);
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

  const displayUsers = results;
  const isLoadingList = searching;

  const renderUserRow = (user: UserResult) => {
    const alreadyShared = alreadySharedIds.has(user.id);
    const isSelected = selected.has(user.id);
    return (
      <label
        key={user.id}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-accent/50 border-b last:border-b-0 ${
          alreadyShared ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${isSelected ? 'bg-accent' : ''}`}
      >
        <input
          type="checkbox"
          checked={isSelected || alreadyShared}
          disabled={alreadyShared}
          onChange={() => !alreadyShared && toggleSelect(user.id)}
          className="h-4 w-4 rounded border-border accent-primary shrink-0"
        />
        <span className="truncate flex-1">{user.email}</span>
        {alreadyShared && (
          <span className="text-xs text-muted-foreground shrink-0">Já tem acesso</span>
        )}
      </label>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Compartilhar Diagrama</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários por e-mail..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* User list (search results only) */}
          <div className="border rounded-md max-h-56 overflow-y-auto">
            {isLoadingList ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : displayUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {query.trim() === '' ? 'Digite um e-mail para buscar usuários' : 'Nenhum usuário encontrado'}
              </p>
            ) : (
              displayUsers.map(renderUserRow)
            )}
          </div>

          {/* Selected count + share button */}
          {selected.size > 0 && (
            <Button onClick={handleShareSelected} disabled={sharing} className="w-full">
              {sharing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Compartilhar com {selected.size} usuário(s)
            </Button>
          )}

          {/* Existing shares */}
          <div className="flex-1 overflow-y-auto">
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
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
