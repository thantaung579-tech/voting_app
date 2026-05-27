import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, AlertCircle } from "lucide-react";

type VotingStep = "register" | "voting" | "submitted";

interface SelectedCandidate {
  id: number;
  name: string;
}

export default function VotingPage() {
  const [step, setStep] = useState<VotingStep>("register");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [voterId, setVoterId] = useState<number | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<SelectedCandidate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const { data: candidates, isLoading: candidatesLoading } = trpc.candidates.list.useQuery();
  const isValidPhoneFormat = /^09\d{8}$/.test(phoneNumber);
  const { data: existingVoter } = trpc.voters.getByPhone.useQuery(
    { phoneNumber },
    { enabled: isValidPhoneFormat }
  );

  // Mutations
  const registerVoterMutation = trpc.voters.register.useMutation({
    onSuccess: (voter) => {
      setVoterId(voter.id);
      setStep("voting");
      toast.success("Registration successful! Now select your candidates.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to register");
    },
  });

  const submitVoteMutation = trpc.votes.submit.useMutation({
    onSuccess: () => {
      // Vote submitted successfully
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit vote");
    },
  });

  // Validation
  const canRegister = isValidPhoneFormat && !existingVoter?.hasVoted;
  const canSubmitVotes = selectedCandidates.length > 0 && selectedCandidates.length <= 3;

  const handleRegister = async () => {
    if (!isValidPhoneFormat) {
      toast.error("Please enter a valid Myanmar phone number (09xxxxxxxx)");
      return;
    }

    if (existingVoter?.hasVoted) {
      toast.error("This phone number has already voted");
      return;
    }

    registerVoterMutation.mutate({ phoneNumber });
  };

  const toggleCandidate = (candidate: any) => {
    const isSelected = selectedCandidates.some((c) => c.id === candidate.id);

    if (isSelected) {
      setSelectedCandidates(selectedCandidates.filter((c) => c.id !== candidate.id));
    } else {
      if (selectedCandidates.length < 3) {
        setSelectedCandidates([...selectedCandidates, { id: candidate.id, name: candidate.name }]);
      } else {
        toast.error("You can select a maximum of 3 candidates");
      }
    }
  };

  const handleSubmitVotes = async () => {
    if (!voterId || selectedCandidates.length === 0) {
      toast.error("Please select at least one candidate");
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit all votes
      for (const candidate of selectedCandidates) {
        await submitVoteMutation.mutateAsync({
          voterId,
          candidateId: candidate.id,
        });
      }

      setStep("submitted");
      setSelectedCandidates([]);
      toast.success("Your votes have been submitted successfully!");
    } catch (error) {
      console.error("Error submitting votes:", error);
      toast.error("Failed to submit votes. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-display text-primary mb-3">Myanmar Voting Platform</h1>
          <p className="text-body text-muted-foreground max-w-2xl mx-auto">
            Cast your vote for your preferred candidates. You can select up to 3 candidates.
          </p>
        </div>

        {/* Registration Step */}
        {step === "register" && (
          <div className="max-w-md mx-auto">
            <Card className="p-8 elevation-3">
              <h2 className="text-headline text-foreground mb-6">Voter Registration</h2>

              {existingVoter && existingVoter.hasVoted && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-destructive">Already Voted</p>
                    <p className="text-sm text-destructive/80">This phone number has already submitted votes.</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone" className="text-foreground">
                    Myanmar Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="09xxxxxxxx"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    maxLength={10}
                    className="mt-2"
                    disabled={registerVoterMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Format: 09xxxxxxxx (10 digits starting with 09)
                  </p>
                </div>

              {isValidPhoneFormat && !existingVoter?.hasVoted && (
                <div className="p-3 bg-primary/10 border border-primary rounded-lg flex gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-primary">Valid phone number format</p>
                </div>
              )}

                <Button
                  onClick={handleRegister}
                  disabled={!canRegister || registerVoterMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {registerVoterMutation.isPending ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" /> Registering...
                    </>
                  ) : (
                    "Continue to Voting"
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Voting Step */}
        {step === "voting" && (
          <div>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-headline text-foreground">Select Your Candidates</h2>
                <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  {selectedCandidates.length}/3 Selected
                </span>
              </div>
              <p className="text-body text-muted-foreground">
                Click on candidates to select them. You can choose up to 3 candidates.
              </p>
            </div>

            {candidatesLoading ? (
              <div className="flex justify-center py-12">
                <Spinner className="w-8 h-8 text-primary" />
              </div>
            ) : candidates && candidates.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {candidates.map((candidate) => {
                    const isSelected = selectedCandidates.some((c) => c.id === candidate.id);
                    return (
                      <Card
                        key={candidate.id}
                        onClick={() => toggleCandidate(candidate)}
                        className={`overflow-hidden cursor-pointer elevation-2 transition-smooth ${
                          isSelected
                            ? "ring-2 ring-primary bg-primary/5"
                            : "hover:elevation-3"
                        }`}
                      >
                        {candidate.photoUrl && (
                          <img
                            src={candidate.photoUrl}
                            alt={candidate.name}
                            className="w-full h-48 object-cover"
                          />
                        )}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-title text-foreground flex-1">{candidate.name}</h3>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 ml-2" />
                            )}
                          </div>
                          {candidate.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {candidate.description}
                            </p>
                          )}
                          <div className="text-sm font-semibold text-primary">
                            {candidate.voteCount} votes
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => {
                      setStep("register");
                      setSelectedCandidates([]);
                      setPhoneNumber("");
                      setVoterId(null);
                    }}
                    variant="outline"
                    size="lg"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmitVotes}
                    disabled={!canSubmitVotes || isSubmitting}
                    size="lg"
                    className="min-w-48"
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" /> Submitting...
                      </>
                    ) : (
                      `Submit ${selectedCandidates.length} Vote${selectedCandidates.length !== 1 ? "s" : ""}`
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No candidates available at this time.</p>
              </Card>
            )}
          </div>
        )}

        {/* Submitted Step */}
        {step === "submitted" && (
          <div className="max-w-md mx-auto">
            <Card className="p-8 elevation-3 text-center">
              <div className="mb-6 flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-primary" />
              </div>
              <h2 className="text-headline text-foreground mb-3">Votes Submitted Successfully!</h2>
              <p className="text-body text-muted-foreground mb-6">
                Thank you for voting. Your votes have been recorded and cannot be changed.
              </p>
              <Button
                onClick={() => {
                  setStep("register");
                  setPhoneNumber("");
                  setVoterId(null);
                  setSelectedCandidates([]);
                }}
                className="w-full"
                size="lg"
              >
                Vote Again with Different Number
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
