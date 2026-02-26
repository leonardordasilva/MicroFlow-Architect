import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check URL hash for recovery token (Supabase appends #access_token=...&type=recovery)
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setReady(true);
      return;
    }

    // Also listen for the PASSWORD_RECOVERY auth event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // If no hash and no event after 3s, show error
    const timeout = setTimeout(() => {
      if (!ready) {
        setError('Link de recuperação inválido ou expirado. Solicite um novo link na tela de login.');
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter no mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Senha atualizada com sucesso!' });
      navigate('/');
    } catch (err: any) {
      const msgMap: Record<string, string> = {
        'New password should be different from the old password.': 'A nova senha deve ser diferente da senha atual.',
        'Auth session missing!': 'Sessão expirada. Solicite um novo link de recuperação.',
      };
      const translated = msgMap[err.message] || err.message;
      toast({ title: 'Erro', description: translated, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-lg">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">MicroFlow Architect</h1>
          <p className="text-sm text-muted-foreground">Defina sua nova senha</p>
        </div>

        {error ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Voltar ao login
            </Button>
          </div>
        ) : !ready ? (
          <p className="text-center text-sm text-muted-foreground">
            Verificando link de recuperação...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Aguarde...' : 'Redefinir senha'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
