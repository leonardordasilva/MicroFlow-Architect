import { useAuth } from '@/hooks/useAuth';
import DiagramCanvas from '@/components/DiagramCanvas';
import AuthPage from '@/pages/Auth';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <DiagramCanvas />;
};

export default Index;
