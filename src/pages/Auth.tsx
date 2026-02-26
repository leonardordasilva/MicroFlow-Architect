import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDiagramStore } from '@/store/diagramStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

type AuthView = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({
          title: 'E-mail enviado!',
          description: 'Verifique sua caixa de entrada para redefinir sua senha.',
        });
        return;
      }
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Clear canvas on fresh login
        const store = useDiagramStore.getState();
        store.clearCanvas();
        store.setDiagramName('Novo Diagrama');
        store.setCurrentDiagramId(undefined);
        toast({ title: 'Login realizado com sucesso!' });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: 'Conta criada com sucesso!' });
      }
    } catch (err: any) {
      const msgMap: Record<string, string> = {
        'Invalid login credentials': 'Credenciais inválidas. Verifique seu e-mail e senha.',
        'Email not confirmed': 'E-mail não confirmado. Verifique sua caixa de entrada.',
        'User already registered': 'Este e-mail já está cadastrado.',
        'Signup requires a valid password': 'A senha deve ter no mínimo 6 caracteres.',
        'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres.',
        'For security purposes, you can only request this once every 60 seconds':
          'Por segurança, aguarde 60 segundos antes de solicitar novamente.',
      };
      const translated = msgMap[err.message] || err.message;
      toast({ title: 'Erro', description: translated, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
    view === 'login'
      ? 'Entre na sua conta'
      : view === 'signup'
        ? 'Crie sua conta'
        : 'Recupere sua senha';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-lg">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">MicroFlow Architect</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          {view !== 'forgot' && (
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? 'Aguarde...'
              : view === 'login'
                ? 'Entrar'
                : view === 'signup'
                  ? 'Criar conta'
                  : 'Enviar link de recuperação'}
          </Button>
        </form>

        {view === 'login' && (
          <div className="text-center space-y-2">
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={() => setView('forgot')}
            >
              Esqueceu sua senha?
            </button>
            <p className="text-sm text-muted-foreground">
              Não tem conta?{' '}
              <button type="button" className="text-primary underline" onClick={() => setView('signup')}>
                Criar conta
              </button>
            </p>
          </div>
        )}

        {view === 'signup' && (
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <button type="button" className="text-primary underline" onClick={() => setView('login')}>
              Fazer login
            </button>
          </p>
        )}

        {view === 'forgot' && (
          <div className="text-center">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-primary underline"
              onClick={() => setView('login')}
            >
              <ArrowLeft className="h-3 w-3" />
              Voltar ao login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
