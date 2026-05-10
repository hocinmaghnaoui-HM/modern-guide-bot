import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: (onLogout: () => void) => React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("dashboard_auth");
    setAuthed(stored === "1");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("dashboard_auth");
    setAuthed(false);
  };

  if (authed === null) return null;

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return <>{children(handleLogout)}</>;
}

function Router({ onLogout }: { onLogout: () => void }) {
  return (
    <Switch>
      <Route path="/">{() => <Dashboard onLogout={onLogout} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div dir="rtl" className="dark bg-background min-h-screen text-foreground font-sans">
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthGuard>
              {(onLogout) => <Router onLogout={onLogout} />}
            </AuthGuard>
          </WouterRouter>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
