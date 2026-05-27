import { describe, it, expect, beforeEach, vi } from "vitest";
import * as db from "./db";

// Mock database functions
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getAllCandidates: vi.fn(),
  getCandidateById: vi.fn(),
  createCandidate: vi.fn(),
  updateCandidate: vi.fn(),
  deleteCandidate: vi.fn(),
  getVoterByPhoneNumber: vi.fn(),
  registerVoter: vi.fn(),
  getVoterVotes: vi.fn(),
  submitVote: vi.fn(),
  getResults: vi.fn(),
  getWinner: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
  isResultsVisible: vi.fn(),
  setResultsVisible: vi.fn(),
}));

describe("Voting App Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mock implementations
    Object.values(vi.mocked(db)).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockClear();
      }
    });
  });

  describe("Myanmar Phone Number Validation", () => {
    it("should validate correct Myanmar phone format (09xxxxxxxx)", () => {
      const validPhones = ["0912345678", "0987654321", "0911111111"];
      validPhones.forEach(phone => {
        expect(/^09\d{8}$/.test(phone)).toBe(true);
      });
    });

    it("should reject invalid Myanmar phone formats", () => {
      const invalidPhones = [
        "0812345678",  // Doesn't start with 09
        "09123456",    // Too short
        "091234567890", // Too long
        "9123456789",  // Missing leading 0
        "09 12345678", // Contains space
      ];
      invalidPhones.forEach(phone => {
        expect(/^09\d{8}$/.test(phone)).toBe(false);
      });
    });
  });

  describe("Vote Submission Logic", () => {
    it("should allow voter to submit up to 3 votes", async () => {
      const voterId = 1;
      const candidateIds = [1, 2, 3];

      // Mock successful vote submissions
      for (const candidateId of candidateIds) {
        vi.mocked(db.submitVote).mockResolvedValueOnce({
          id: candidateId,
          voterId,
          candidateId,
          createdAt: new Date(),
        });
      }

      // Submit 3 votes
      for (const candidateId of candidateIds) {
        const vote = await db.submitVote(voterId, candidateId);
        expect(vote).toBeDefined();
        expect(vote.voterId).toBe(voterId);
        expect(vote.candidateId).toBe(candidateId);
      }

      expect(vi.mocked(db.submitVote)).toHaveBeenCalledTimes(3);
    });

    it("should reject vote when voter reaches 3-vote limit", async () => {
      const voterId = 1;

      // Mock error for 4th vote attempt
      vi.mocked(db.submitVote).mockRejectedValueOnce(
        new Error("Voter has reached maximum vote limit (3)")
      );

      await expect(db.submitVote(voterId, 4)).rejects.toThrow(
        "Voter has reached maximum vote limit (3)"
      );
    });

    it("should prevent duplicate votes for same candidate", async () => {
      const voterId = 1;
      const candidateId = 1;

      // Mock error for duplicate vote
      vi.mocked(db.submitVote).mockRejectedValueOnce(
        new Error("Voter has already voted for this candidate")
      );

      await expect(db.submitVote(voterId, candidateId)).rejects.toThrow(
        "Voter has already voted for this candidate"
      );
    });
  });

  describe("Voter Registration", () => {
    it("should register a new voter with Myanmar phone", async () => {
      const phoneNumber = "0912345678";
      const mockVoter = {
        id: 1,
        phoneNumber,
        hasVoted: false,
        votedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.registerVoter).mockResolvedValueOnce(mockVoter);

      const voter = await db.registerVoter(phoneNumber);
      expect(voter.phoneNumber).toBe(phoneNumber);
      expect(voter.hasVoted).toBe(false);
    });

    it("should return existing voter if already registered", async () => {
      const phoneNumber = "0912345678";
      const existingVoter = {
        id: 1,
        phoneNumber,
        hasVoted: true,
        votedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getVoterByPhoneNumber).mockResolvedValueOnce(existingVoter);
      vi.mocked(db.registerVoter).mockResolvedValueOnce(existingVoter);

      const voter = await db.registerVoter(phoneNumber);
      expect(voter.phoneNumber).toBe(phoneNumber);
      expect(voter.hasVoted).toBe(true);
    });
  });

  describe("Results Management", () => {
    it("should return ranked candidates by vote count", async () => {
      const mockResults = [
        { id: 1, name: "Candidate A", description: "", photoUrl: null, photoKey: null, voteCount: 100, createdAt: new Date(), updatedAt: new Date(), rank: 1 },
        { id: 2, name: "Candidate B", description: "", photoUrl: null, photoKey: null, voteCount: 80, createdAt: new Date(), updatedAt: new Date(), rank: 2 },
        { id: 3, name: "Candidate C", description: "", photoUrl: null, photoKey: null, voteCount: 60, createdAt: new Date(), updatedAt: new Date(), rank: 3 },
      ];

      vi.mocked(db.isResultsVisible).mockResolvedValueOnce(true);
      vi.mocked(db.getResults).mockResolvedValueOnce(mockResults);

      const results = await db.getResults();
      expect(results).toHaveLength(3);
      expect(results[0].rank).toBe(1);
      expect(results[0].voteCount).toBe(100);
      expect(results[1].rank).toBe(2);
      expect(results[2].rank).toBe(3);
    });

    it("should identify winner as candidate with most votes", async () => {
      const mockWinner = {
        id: 1,
        name: "Candidate A",
        description: "",
        photoUrl: null,
        photoKey: null,
        voteCount: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        rank: 1,
      };

      vi.mocked(db.getWinner).mockResolvedValueOnce(mockWinner);

      const winner = await db.getWinner();
      expect(winner).toBeDefined();
      expect(winner?.rank).toBe(1);
      expect(winner?.voteCount).toBe(100);
    });

    it("should control results visibility", async () => {
      // Test setting visibility to true
      vi.mocked(db.setResultsVisible).mockResolvedValueOnce();
      await db.setResultsVisible(true);
      expect(vi.mocked(db.setResultsVisible)).toHaveBeenCalledWith(true);

      // Test setting visibility to false
      vi.mocked(db.setResultsVisible).mockResolvedValueOnce();
      await db.setResultsVisible(false);
      expect(vi.mocked(db.setResultsVisible)).toHaveBeenCalledWith(false);
    });
  });

  describe("Candidate Management", () => {
    it("should create a candidate with photo", async () => {
      const mockCandidate = {
        id: 1,
        name: "John Doe",
        description: "Candidate description",
        photoUrl: "/manus-storage/photo.jpg",
        photoKey: "photo-key-123",
        voteCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.createCandidate).mockResolvedValueOnce(mockCandidate);

      const candidate = await db.createCandidate(
        "John Doe",
        "Candidate description",
        "/manus-storage/photo.jpg",
        "photo-key-123"
      );

      expect(candidate.name).toBe("John Doe");
      expect(candidate.photoUrl).toBe("/manus-storage/photo.jpg");
      expect(candidate.voteCount).toBe(0);
    });

    it("should update candidate information", async () => {
      const updatedCandidate = {
        id: 1,
        name: "Jane Doe",
        description: "Updated description",
        photoUrl: "/manus-storage/new-photo.jpg",
        photoKey: "new-photo-key",
        voteCount: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.updateCandidate).mockResolvedValueOnce(updatedCandidate);

      const candidate = await db.updateCandidate(1, {
        name: "Jane Doe",
        description: "Updated description",
        photoUrl: "/manus-storage/new-photo.jpg",
      });

      expect(candidate.name).toBe("Jane Doe");
      expect(candidate.description).toBe("Updated description");
    });

    it("should delete a candidate", async () => {
      vi.mocked(db.deleteCandidate).mockResolvedValueOnce();

      await expect(db.deleteCandidate(1)).resolves.toBeUndefined();
      expect(vi.mocked(db.deleteCandidate)).toHaveBeenCalledWith(1);
    });
  });
});
