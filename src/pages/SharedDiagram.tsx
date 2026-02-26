import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DiagramCanvas from '@/components/DiagramCanvas';
import { loadDiagramByToken } from '@/services/diagramService';
import { useDiagramStore } from '@/store/diagramStore';

export default function SharedDiagram() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareToken) return;
    loadDiagramByToken(shareToken).then((diagram) => {
      if (diagram) {
        const store = useDiagramStore.getState();
        store.loadDiagram(diagram.nodes, diagram.edges);
        store.setDiagramName(diagram.title);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [shareToken]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando diagrama...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Diagrama não encontrado.</p>
      </div>
    );
  }

  return <DiagramCanvas shareToken={shareToken} />;
}
