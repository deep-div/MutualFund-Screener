import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      login(email.trim());
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-nav flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-nav-foreground tracking-tight">screener</h1>
          <p className="text-nav-foreground/50 text-sm mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-6 space-y-4 shadow-lg">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-card-foreground text-[13px]">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-9 text-[13px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-card-foreground text-[13px]">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 text-[13px]"
            />
          </div>

          <Button type="submit" className="w-full h-9 text-[13px]">
            Sign In
          </Button>

          <p className="text-center text-muted-foreground text-[11px]">
            This is a mock login — enter any email to continue.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
