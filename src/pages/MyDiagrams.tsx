import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  loadUserDiagrams,
  deleteDiagram,
  renameDiagram,
  shareDiagram,
  type DiagramRecord,
} from '@/services/diagramService';
import { useDiagramStore } from '@/store/diagramStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, ArrowLeft, FileText, Share2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

function DiagramCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4 shadow-sm animate-pulse">
      <div className="mb-2 flex items-center justify-between">
        <div className="h-5 w-2/3 rounded bg-muted" />
      </div>
      <div className="h-3 w-1/2 rounded bg-muted" />
      <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
    </div>
  );
}

export default function MyDiagrams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['diagrams', user?.id],
    queryFn: ({ pageParam = 0 }) => loadUserDiagrams(user!.id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + 1 : undefined,
    enabled: !!user,
    staleTime: 30_000,
  });

  const diagrams = data?.pages.flatMap((p) => p.diagrams) ?? [];

  const deleteMutation = useMutation({
    mutationFn: deleteDiagram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', user?.id] });
      toast({ title: 'Diagrama excluído' });
      setDeleteId(null);
    },
    onError: () => toast({ title: 'Erro ao excluir', variant: 'destructive' }),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameDiagram(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagrams', user?.id] });
      toast({ title: 'Diagrama renomeado' });
      setEditingId(null);
    },
    onError: () => toast({ title: 'Erro ao renomear', variant: 'destructive' }),
  });

  const handleDelete = () => {
    if (deleteId) deleteMutation.mutate(deleteId);
  };

  const handleRename = (id: string) => {
    if (!editTitle.trim()) return;
    renameMutation.mutate({ id, title: editTitle.trim() });
  };

  const handleLoad = (diagram: DiagramRecord) => {
    const store = useDiagramStore.getState();
    store.loadDiagram(diagram.nodes, diagram.edges);
    store.setDiagramName(diagram.title);
    navigate('/');
  };

  const handleShare = async (e: React.MouseEvent, d: DiagramRecord) => {
    e.stopPropagation();
    if (!user) return;
    const url = await shareDiagram(d.id, user.id);
    if (url) {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copiado!', description: url });
    } else {
      toast({ title: 'Erro ao compartilhar', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Meus Diagramas</h1>
          </div>
          <Button onClick={() => navigate('/')}>
            <Plus className="mr-2 h-4 w-4" /> Novo Diagrama
          </Button>
        </div>

        {isError && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="mb-4">Erro ao carregar diagramas.</p>
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['diagrams', user?.id] })}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <DiagramCardSkeleton key={i} />
            ))}
          </div>
        ) : !isError && diagrams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FileText className="mb-4 h-14 w-14 opacity-30" />
            <p className="mb-1">Nenhum diagrama salvo ainda</p>
            <p className="mb-4 text-sm">Crie seu primeiro diagrama de arquitetura</p>
            <Button onClick={() => navigate('/')}>
              <Plus className="mr-2 h-4 w-4" /> Criar primeiro diagrama
            </Button>
          </div>
        ) : !isError ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {diagrams.map((d) => (
                <div
                  key={d.id}
                  className="group relative flex cursor-pointer flex-col rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => handleLoad(d)}
                >
                  <div className="mb-2 flex items-center justify-between">
                    {editingId === d.id ? (
                      <Input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(d.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onBlur={() => handleRename(d.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 text-sm"
                      />
                    ) : (
                      <h3 className="truncate font-semibold text-foreground">{d.title}</h3>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.nodes.length} nós · {d.edges.length} conexões
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Atualizado em {format(new Date(d.updated_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleShare(e, d)}
                      aria-label="Compartilhar"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(d.id);
                        setEditTitle(d.title);
                      }}
                      aria-label="Renomear"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(d.id);
                      }}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
                </Button>
              </div>
            )}
          </>
        ) : null}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir diagrama</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
