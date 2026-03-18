import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-2 2.9v2.4h3.2c1.9-1.8 3-4.4 3-7.4 0-.6-.1-1.2-.2-1.8H12z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 5-0.9 6.7-2.6l-3.2-2.4c-.9.6-2.1 1-3.5 1-2.7 0-4.9-1.8-5.7-4.2H3v2.6C4.7 19.8 8 22 12 22z"
    />
    <path
      fill="#FBBC05"
      d="M6.3 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H3C2.4 8.8 2 10.4 2 12s.4 3.2 1 4.4l3.3-2.6z"
    />
    <path
      fill="#4285F4"
      d="M12 6.8c1.5 0 2.8.5 3.8 1.5l2.8-2.8C17 3.9 14.7 3 12 3 8 3 4.7 5.2 3 7.6l3.3 2.6c.8-2.4 3-4.2 5.7-4.2z"
    />
  </svg>
);

const OAuthDivider = () => (
  <div className="flex items-center gap-3 py-1">
    <span className="h-px flex-1 bg-border" />
    <span className="text-xs font-ui text-muted-foreground">
      or continue with
    </span>
    <span className="h-px flex-1 bg-border" />
  </div>
);

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOAuthCallbackLoading, setIsOAuthCallbackLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const mapGoogleAuthError = (message: string) => {
    const normalized = message.toLowerCase();
    if (
      normalized.includes("unsupported provider") ||
      normalized.includes("provider is not enabled")
    ) {
      return "Google sign-in is not enabled in Supabase yet. Enable Google under Authentication > Providers, then add your redirect URL (for example: http://localhost:5173/auth).";
    }

    return message;
  };

  useEffect(() => {
    const processOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        setIsOAuthCallbackLoading(true);
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        setIsOAuthCallbackLoading(false);

        if (error) {
          toast({
            variant: "destructive",
            title: "Google sign-in failed",
            description: mapGoogleAuthError(error.message),
          });
          return;
        }

        toast({
          title: "Signed in with Google",
          description: "Welcome back.",
        });

        navigate("/dashboard");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) navigate("/dashboard");
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/dashboard");
    });

    processOAuthCallback();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Welcome!",
        description: "Check your email to confirm your account",
      });
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });

    if (error) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Google sign-in failed",
        description: mapGoogleAuthError(error.message),
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <SEO
        title="Sign In"
        description="Sign in or create an account to start collaborating on documents in real-time."
        canonical="/auth"
      />
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-ui"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="w-full max-w-[420px] mx-4 shadow-float border-border/60">
          <CardHeader className="text-center pb-2">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground mb-1">
              Collaborative Docx
            </h2>
            <CardDescription className="font-body text-muted-foreground">
              Sign in to start writing
            </CardDescription>
          </CardHeader>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mx-0 font-ui">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-ui text-sm">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="font-ui"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-ui text-sm">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="font-ui"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="w-full space-y-3">
                    <Button
                      type="submit"
                      className="w-full font-ui rounded-full"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full font-ui rounded-full border border-border bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-50"
                      disabled={loading}
                      onClick={handleGoogleAuth}
                    >
                      <GoogleIcon />
                      <span className="ml-2">Continue with Google</span>
                    </Button>
                    <OAuthDivider />
                  </div>
                </CardFooter>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="font-ui text-sm">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="Jane Austen"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="font-ui"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail" className="font-ui text-sm">
                      Email
                    </Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="font-ui"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword" className="font-ui text-sm">
                      Password
                    </Label>
                    <Input
                      id="signupPassword"
                      type="password"
                      placeholder="Choose a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="font-ui"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="w-full space-y-3">
                    <Button
                      type="submit"
                      className="w-full font-ui rounded-full"
                      disabled={loading}
                    >
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                    <OAuthDivider />
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full font-ui rounded-full border border-border bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-50"
                      disabled={loading}
                      onClick={handleGoogleAuth}
                    >
                      <GoogleIcon />
                      <span className="ml-2">Continue with Google</span>
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>

      {isOAuthCallbackLoading && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
          <div className="rounded-lg border border-border bg-card/95 px-4 py-3 shadow-elevated">
            <div className="flex items-center gap-2 text-sm font-ui text-foreground">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Completing Google sign-in...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
