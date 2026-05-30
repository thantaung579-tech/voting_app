import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, Trophy, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface Confetti {
  id: string;
  left: number;
  delay: number;
}

export default function ResultsPage() {
  const [, setLocation] = useLocation();
  const [confetti, setConfetti] = useState<Confetti[]>([]);

  // Queries
  const { data: isVisible, isLoading: visibilityLoading } = trpc.results.isVisible.useQuery();
  const { data: results, isLoading: resultsLoading, error: resultsError } = trpc.results.getResults.useQuery(
    undefined,
    { enabled: isVisible ?? false }
  );
  const { data: winner, error: winnerError } = trpc.results.getWinner.useQuery(
    undefined,
    { enabled: isVisible ?? false }
  );

  // Generate confetti on winner display
  useEffect(() => {
    if (winner && confetti.length === 0) {
      const newConfetti: Confetti[] = Array.from({ length: 30 }, (_, i) => ({
        id: `confetti-${i}`,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
      }));
      setConfetti(newConfetti);
    }
  }, [winner]);

  if (visibilityLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  if (!isVisible || resultsError || winnerError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-12">
          <div className="max-w-md mx-auto">
            <Card className="p-8 text-center elevation-3">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-headline text-foreground mb-3">Results Not Available</h1>
              <p className="text-body text-muted-foreground mb-6">
                The voting results have not been published yet. Please check back later.
              </p>
              <Button onClick={() => setLocation("/")} className="w-full">
                Back to Home
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Confetti animation */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="animate-burst fixed pointer-events-none"
          style={{
            left: `${piece.left}%`,
            top: "-10px",
            "--tx": `${(Math.random() - 0.5) * 200}px`,
            "--ty": `${Math.random() * 400 + 200}px`,
            animationDelay: `${piece.delay}s`,
          } as React.CSSProperties}
        >
          <div className="w-2 h-2 bg-primary rounded-full" />
        </div>
      ))}

      <div className="container py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-display text-primary mb-3">Voting Results</h1>
          <p className="text-body text-muted-foreground">Final tally of all votes cast</p>
        </div>

        {resultsLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="w-8 h-8 text-primary" />
          </div>
        ) : winner ? (
          <>
            {/* Winner Section */}
            <div className="mb-12">
              <div className="max-w-2xl mx-auto">
                <Card className="p-8 elevation-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 relative overflow-hidden">
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-center mb-6">
                      <Trophy className="w-12 h-12 text-primary animate-celebrate" />
                    </div>
                    <h2 className="text-headline text-primary text-center mb-2">🎉 We Have a Winner! 🎉</h2>

                    <div className="text-center mb-6">
                      {winner.photoKey && (
                        <img
                          src={`/manus-storage/${winner.photoKey}`}
                          alt={winner.name}
                          className="w-32 h-32 rounded-full object-cover mx-auto mb-4 ring-4 ring-primary"
                        />
                      )}
                      <h3 className="text-3xl font-bold text-foreground mb-2">{winner.name}</h3>
                      {winner.description && (
                        <p className="text-body text-muted-foreground mb-4">{winner.description}</p>
                      )}
                    </div>

                    <div className="bg-background/50 rounded-lg p-6 text-center">
                      <p className="text-sm text-muted-foreground mb-2">Total Votes</p>
                      <p className="text-5xl font-bold text-primary">{winner.voteCount}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Results Ranking */}
            <div>
              <h2 className="text-headline text-foreground mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" /> Final Rankings
              </h2>

              <div className="space-y-4">
                {results?.map((candidate, index) => {
                  const maxVotes = results[0]?.voteCount || 1;
                  const percentage = (candidate.voteCount / maxVotes) * 100;

                  return (
                    <Card
                      key={candidate.id}
                      className={`p-4 elevation-2 transition-smooth ${
                        index === 0 ? "ring-2 ring-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className="flex-shrink-0">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                              index === 0
                                ? "bg-primary"
                                : index === 1
                                  ? "bg-gray-400"
                                  : index === 2
                                    ? "bg-amber-600"
                                    : "bg-muted-foreground"
                            }`}
                          >
                            {index + 1}
                          </div>
                        </div>

                        {/* Candidate Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                        {candidate.photoKey && (
                          <img
                            src={`/manus-storage/${candidate.photoKey}`}
                            alt={candidate.name}
                            className="w-20 h-20 rounded-full object-cover mr-4"
                          />
                        )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-title text-foreground truncate">{candidate.name}</h3>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Vote count */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-2xl font-bold text-primary">{candidate.voteCount}</p>
                          <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 elevation-2 text-center">
                <p className="text-sm text-muted-foreground mb-2">Total Candidates</p>
                <p className="text-4xl font-bold text-primary">{results?.length || 0}</p>
              </Card>
              <Card className="p-6 elevation-2 text-center">
                <p className="text-sm text-muted-foreground mb-2">Total Votes Cast</p>
                <p className="text-4xl font-bold text-primary">
                  {results?.reduce((sum, c) => sum + c.voteCount, 0) || 0}
                </p>
              </Card>
              <Card className="p-6 elevation-2 text-center">
                <p className="text-sm text-muted-foreground mb-2">Winner Margin</p>
                <p className="text-4xl font-bold text-primary">
                  {results && results.length > 1
                    ? results[0].voteCount - results[1].voteCount
                    : 0}
                </p>
              </Card>
            </div>

            {/* Back button */}
            <div className="mt-12 text-center">
              <Button onClick={() => setLocation("/")} variant="outline" size="lg">
                Back to Home
              </Button>
            </div>
          </>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No results available yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
