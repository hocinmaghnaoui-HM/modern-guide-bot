import { useState } from "react";
import { Eye, EyeOff, Lock, Bot, Shield } from "lucide-react";

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { valid?: boolean; error?: string };

      if (data.valid) {
        localStorage.setItem("dashboard_auth", "1");
        onSuccess();
      } else {
        setError(data.error || "كلمة مرور خاطئة");
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setPassword("");
      }
    } catch {
      setError("تعذر الاتصال بالخادم، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div
        data-testid="login-card"
        className={`relative z-10 w-full max-w-sm mx-4 transition-transform ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
        style={shake ? { animation: "shake 0.5s ease-in-out" } : {}}
      >
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4">
            <Bot className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">لوحة تحكم البوت الذكي</h1>
          <p className="text-sm text-muted-foreground mt-1">أدخل كلمة المرور للمتابعة</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/30">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-muted-foreground">منطقة محمية</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="password-input">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="password-input"
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full bg-background border border-border rounded-lg pr-10 pl-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  dir="ltr"
                />
                <button
                  type="button"
                  data-testid="toggle-password-visibility"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                data-testid="login-error"
                className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              >
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              data-testid="button-login"
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>جارٍ التحقق...</span>
                </>
              ) : (
                <span>دخول</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          بوت تيليغرام الذكي • لوحة الإدارة
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}
