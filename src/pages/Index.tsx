import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { FileText, Users, Zap, Shield, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const features = [
    { icon: FileText, title: "Rich Editorial Writing", desc: "Beautiful typography with serif fonts, markdown shortcuts, and a distraction-free experience." },
    { icon: Users, title: "Real-Time Collaboration", desc: "See cursors, edits, and presence of your team. Conflict resolution built in." },
    { icon: Zap, title: "Lightning Fast", desc: "Optimized with debounced saves, local-first editing, and instant sync." },
    { icon: Shield, title: "Secure Sharing", desc: "Password-protected links, granular permissions, and version history." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            Inkwell
          </h2>
          <Button
            variant="ghost"
            className="font-ui text-sm"
            onClick={() => navigate("/auth")}
          >
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center"
        >
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.08] mb-6">
            Write beautifully,{" "}
            <span className="text-primary italic">together.</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed mb-10">
            A collaborative writing experience designed for clarity, elegance, and flow. 
            Where every word feels intentional.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="font-ui text-base px-8 py-6 rounded-full shadow-elevated hover:shadow-float transition-all duration-300"
            >
              Start Writing
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group p-6 rounded-xl border border-border/60 bg-card hover:shadow-elevated transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2 text-card-foreground">{f.title}</h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <p className="text-center text-sm text-muted-foreground font-ui">
          Crafted with care. Built for writers.
        </p>
      </footer>
    </div>
  );
};

export default Index;
