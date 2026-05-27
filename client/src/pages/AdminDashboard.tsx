import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Queries and mutations
  const { data: candidates, isLoading: candidatesLoading, refetch: refetchCandidates } = trpc.candidates.list.useQuery();
  const { data: resultsVisible, refetch: refetchResultsVisible } = trpc.results.isVisible.useQuery();

  const createCandidateMutation = trpc.candidates.create.useMutation({
    onSuccess: () => {
      toast.success("Candidate created successfully");
      setFormData({ name: "", description: "" });
      setPhotoFile(null);
      setPhotoPreview("");
      setIsCreateOpen(false);
      refetchCandidates();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create candidate");
    },
  });

  const updateCandidateMutation = trpc.candidates.update.useMutation({
    onSuccess: () => {
      toast.success("Candidate updated successfully");
      setFormData({ name: "", description: "" });
      setPhotoFile(null);
      setPhotoPreview("");
      setIsEditOpen(false);
      setEditingCandidate(null);
      refetchCandidates();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update candidate");
    },
  });

  const deleteCandidateMutation = trpc.candidates.delete.useMutation({
    onSuccess: () => {
      toast.success("Candidate deleted successfully");
      refetchCandidates();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete candidate");
    },
  });

  const toggleResultsVisibilityMutation = trpc.results.toggleVisibility.useMutation({
    onSuccess: () => {
      toast.success("Results visibility updated");
      refetchResultsVisible();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update results visibility");
    },
  });

  // Redirect if not admin
  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to access the admin dashboard.</p>
        </Card>
      </div>
    );
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateCandidate = async () => {
    if (!formData.name.trim()) {
      toast.error("Candidate name is required");
      return;
    }

    let photoUrl = undefined;
    let photoKey = undefined;

    if (photoFile) {
      try {
        // Upload photo to storage
        const formDataWithFile = new FormData();
        formDataWithFile.append("file", photoFile);
        
        // For now, we'll use a placeholder - in production, upload to S3
        photoUrl = photoPreview;
        photoKey = `candidate-${Date.now()}`;
      } catch (error) {
        toast.error("Failed to upload photo");
        return;
      }
    }

    createCandidateMutation.mutate({
      name: formData.name,
      description: formData.description,
      photoKey,
    });
  };

  const handleEditCandidate = (candidate: any) => {
    setEditingCandidate(candidate);
    setFormData({
      name: candidate.name,
      description: candidate.description || "",
    });
    setPhotoPreview(candidate.photoKey ? `/manus-storage/${candidate.photoKey}` : "");
    setIsEditOpen(true);
  };

  const handleUpdateCandidate = async () => {
    if (!formData.name.trim()) {
      toast.error("Candidate name is required");
      return;
    }

    let photoKey = editingCandidate.photoKey;

    if (photoFile) {
      try {
        photoKey = `candidate-${Date.now()}`;
      } catch (error) {
        toast.error("Failed to upload photo");
        return;
      }
    }

    updateCandidateMutation.mutate({
      id: editingCandidate.id,
      name: formData.name,
      description: formData.description,
      photoKey,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display text-primary mb-2">Admin Dashboard</h1>
          <p className="text-body text-muted-foreground">Manage candidates and voting settings</p>
        </div>

        {/* Results Visibility Control */}
        <Card className="p-6 mb-8 elevation-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-title text-foreground mb-1">Results Visibility</h2>
              <p className="text-sm text-muted-foreground">
                {resultsVisible ? "Results are currently visible to voters" : "Results are hidden from voters"}
              </p>
            </div>
            <Button
              onClick={() => toggleResultsVisibilityMutation.mutate()}
              disabled={toggleResultsVisibilityMutation.isPending}
              className="gap-2"
              variant={resultsVisible ? "default" : "outline"}
            >
              {resultsVisible ? (
                <>
                  <Eye className="w-4 h-4" /> Hide Results
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" /> Show Results
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Candidates Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-headline text-foreground">Candidates</h2>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Add Candidate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Candidate</DialogTitle>
                  <DialogDescription>Add a new candidate to the voting pool</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Candidate Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter candidate name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Enter candidate description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="photo">Candidate Photo</Label>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="mt-1"
                    />
                    {photoPreview && (
                      <div className="mt-3">
                        <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => setIsCreateOpen(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateCandidate}
                      disabled={createCandidateMutation.isPending}
                      className="flex-1"
                    >
                      {createCandidateMutation.isPending ? (
                        <>
                          <Spinner className="w-4 h-4 mr-2" /> Creating...
                        </>
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {candidatesLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="w-8 h-8 text-primary" />
            </div>
          ) : candidates && candidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidates.map((candidate) => (
                <Card key={candidate.id} className="overflow-hidden elevation-2 hover:elevation-3 transition-smooth">
                  {candidate.photoKey && (
                    <img
                      src={`/manus-storage/${candidate.photoKey}`}
                      alt={candidate.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="text-title text-foreground mb-1">{candidate.name}</h3>
                    {candidate.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{candidate.description}</p>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-primary">{candidate.voteCount} votes</span>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={isEditOpen && editingCandidate?.id === candidate.id} onOpenChange={(open) => {
                        if (!open) {
                          setIsEditOpen(false);
                          setEditingCandidate(null);
                          setFormData({ name: "", description: "" });
                          setPhotoPreview("");
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            onClick={() => handleEditCandidate(candidate)}
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                          >
                            <Edit2 className="w-4 h-4" /> Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit Candidate</DialogTitle>
                            <DialogDescription>Update candidate information</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="edit-name">Candidate Name *</Label>
                              <Input
                                id="edit-name"
                                placeholder="Enter candidate name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-description">Description</Label>
                              <Textarea
                                id="edit-description"
                                placeholder="Enter candidate description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="mt-1"
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-photo">Candidate Photo</Label>
                              <Input
                                id="edit-photo"
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="mt-1"
                              />
                              {photoPreview && (
                                <div className="mt-3">
                                  <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                                </div>
                              )}
                            </div>
                            <div className="flex gap-3 pt-4">
                              <Button
                                onClick={() => {
                                  setIsEditOpen(false);
                                  setEditingCandidate(null);
                                  setFormData({ name: "", description: "" });
                                  setPhotoPreview("");
                                }}
                                variant="outline"
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleUpdateCandidate}
                                disabled={updateCandidateMutation.isPending}
                                className="flex-1"
                              >
                                {updateCandidateMutation.isPending ? (
                                  <>
                                    <Spinner className="w-4 h-4 mr-2" /> Updating...
                                  </>
                                ) : (
                                  "Update"
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        onClick={() => {
                          if (confirm(`Delete ${candidate.name}?`)) {
                            deleteCandidateMutation.mutate({ id: candidate.id });
                          }
                        }}
                        variant="destructive"
                        size="sm"
                        className="flex-1 gap-2"
                        disabled={deleteCandidateMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No candidates yet. Create one to get started.</p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add First Candidate
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
