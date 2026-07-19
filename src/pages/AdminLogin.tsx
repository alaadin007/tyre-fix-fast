import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const [noAccess, setNoAccess] = useState(false);

  const checkAndRoute = async (session: any) => {
    if (!session?.user) return;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (isAdmin) {
      navigate("/admin", { replace: true });
    } else {
      setNoAccess(true);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => checkAndRoute(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => checkAndRoute(s));
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setNoAccess(false);
  };


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/admin` },
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-hero px-4 text-foreground">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-card/70 p-6 shadow-2xl backdrop-blur">
        <h1 className="text-xl font-bold">Operations Console</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {mode === "login" ? "Sign in to continue" : "Create an admin account"}
        </p>

        {noAccess ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
              Your account is signed in but doesn't have admin access yet. Ask an existing admin to grant you the admin role, then refresh this page.
            </div>
            <Button variant="outline" className="w-full" onClick={signOut}>
              Sign out
            </Button>
          </div>
        ) : (
        <>
        <form onSubmit={submit} className="mt-5 grid gap-3">

          <div>
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input
              id="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-xs">Password</Label>
            <Input
              id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
              required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="mt-2">
            {busy ? "…" : mode === "login" ? "Sign in" : "Sign up"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
        </div>
        <Button variant="outline" className="w-full" onClick={google}>
          Continue with Google
        </Button>

        <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
          Admin role required after sign-in. If you don't have access, contact an existing admin.
        </p>
        </>
        )}
      </div>
    </div>
  );
}
