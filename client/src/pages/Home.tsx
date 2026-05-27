import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { BarChart3, Trophy, Users, Lock, CheckCircle2 } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b border-border">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Yadanabon CS Selections</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && user?.role === "admin" && (
              <Button onClick={() => setLocation("/admin")} variant="outline">
                Admin Dashboard
              </Button>
            )}
            {isAuthenticated ? (
              <Button onClick={() => logout()} variant="ghost">
                Logout
              </Button>
            ) : (
              <Button onClick={() => (window.location.href = getLoginUrl())}>
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-20">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-display text-primary mb-4">
            Your Voice Matters
          </h1>
          <p className="text-body text-muted-foreground mb-8 text-lg">
            Participate in a secure and transparent voting process. Select up to 3 candidates and make your choice count.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => setLocation("/vote")} size="lg" className="gap-2">
              <CheckCircle2 className="w-5 h-5" /> Start Voting
            </Button>
            <Button onClick={() => setLocation("/results")} size="lg" variant="outline" className="gap-2">
              <Trophy className="w-5 h-5" /> View Results
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-16 mb-16">
        <h2 className="text-headline text-foreground text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <Card className="p-8 elevation-2 hover:elevation-3 transition-smooth">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-title text-foreground mb-3">Register</h3>
            <p className="text-body text-muted-foreground">
              Enter your Myanmar phone number (09xxxxxxxx) to register as a voter. One registration per phone number.
            </p>
          </Card>

          {/* Feature 2 */}
          <Card className="p-8 elevation-2 hover:elevation-3 transition-smooth">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-title text-foreground mb-3">Vote</h3>
            <p className="text-body text-muted-foreground">
              Select up to 3 candidates from the available options. Each candidate can only receive one vote per voter.
            </p>
          </Card>

          {/* Feature 3 */}
          <Card className="p-8 elevation-2 hover:elevation-3 transition-smooth">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-title text-foreground mb-3">Results</h3>
            <p className="text-body text-muted-foreground">
              View the final voting results and rankings. The winner is highlighted with celebration effects.
            </p>
          </Card>
        </div>
      </section>

      {/* Security Features Section */}
      <section className="container py-16 mb-16">
        <h2 className="text-headline text-foreground text-center mb-12">Security & Trust</h2>
        <div className="max-w-2xl mx-auto space-y-4">
          <Card className="p-6 elevation-2 flex gap-4">
            <Lock className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-title text-foreground mb-1">One Vote Per Person</h3>
              <p className="text-body text-muted-foreground">
                Each phone number can only vote once. Duplicate voting is prevented through our verification system.
              </p>
            </div>
          </Card>

          <Card className="p-6 elevation-2 flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-title text-foreground mb-1">Fair Selection Limit</h3>
              <p className="text-body text-muted-foreground">
                Voters can select up to 3 candidates per voting session, ensuring fair participation.
              </p>
            </div>
          </Card>

          <Card className="p-6 elevation-2 flex gap-4">
            <BarChart3 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-title text-foreground mb-1">Transparent Results</h3>
              <p className="text-body text-muted-foreground">
                Admin-controlled results visibility ensures results are revealed at the right time with full transparency.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-16 mb-12">
        <Card className="p-12 elevation-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 text-center">
          <h2 className="text-headline text-foreground mb-4">Ready to Vote?</h2>
          <p className="text-body text-muted-foreground mb-8 max-w-xl mx-auto">
            Your voice is important. Participate in the voting process and help shape the future.
          </p>
          <Button onClick={() => setLocation("/vote")} size="lg" className="gap-2">
            <CheckCircle2 className="w-5 h-5" /> Cast Your Vote Now
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-muted-foreground">
        <p className="text-sm">© 2026 Myanmar Voting Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
