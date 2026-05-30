import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { voters } from "../drizzle/schema";
import { sendOtpSms } from "./sms";

// Myanmar phone number validation: 09xxxxxxxxx (11 digits starting with 09)
const myanmarPhoneSchema = z.string().regex(/^09\d{9}$/, "Invalid Myanmar phone number format. Must be 09xxxxxxxxx");

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ========== Candidates Router ==========
  candidates: router({
    // Get all candidates
    list: publicProcedure.query(async () => {
      try {
        return await db.getAllCandidates();
      } catch (error) {
        console.error("Error fetching candidates:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch candidates" });
      }
    }),

    // Get single candidate
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      try {
        const candidate = await db.getCandidateById(input.id);
        if (!candidate) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
        }
        return candidate;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error fetching candidate:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch candidate" });
      }
    }),

    // Create candidate (admin only)
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        photoKey: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await db.createCandidate(input.name, input.description, input.photoKey);
        } catch (error) {
          console.error("Error creating candidate:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create candidate" });
        }
      }),

    // Update candidate (admin only)
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        photoKey: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const updates: { name?: string; description?: string; photoKey?: string } = {};
          if (input.name) updates.name = input.name;
          if (input.description) updates.description = input.description;
          if (input.photoKey) updates.photoKey = input.photoKey;
          return await db.updateCandidate(input.id, updates);
        } catch (error) {
          console.error("Error updating candidate:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update candidate" });
        }
      }),

    // Delete candidate (admin only)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        try {
          await db.deleteCandidate(input.id);
          return { success: true };
        } catch (error) {
          console.error("Error deleting candidate:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete candidate" });
        }
      }),
  }),

  // ========== Voters Router ==========
  voters: router({
    // Request OTP for phone number
    requestOtp: publicProcedure
      .input(z.object({ phoneNumber: myanmarPhoneSchema }))
      .mutation(async ({ input }) => {
        try {
          const voter = await db.getVoterByPhoneNumber(input.phoneNumber);
          if (voter?.hasVoted) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "This phone number has already voted" });
          }

          await db.registerVoter(input.phoneNumber);
          const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
          await db.saveOtpCode(input.phoneNumber, otpCode, 10);

          // Send OTP via SMS
          const smsResult = await sendOtpSms(input.phoneNumber, otpCode);
          
          if (!smsResult.success) {
            console.warn(`[OTP] SMS delivery failed for ${input.phoneNumber}: ${smsResult.error}`);
            // Still allow the flow to continue - OTP is saved in DB
          }

          return { success: true, message: "OTP sent to your phone" };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Error requesting OTP:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send OTP" });
        }
      }),

    // Verify OTP code
    verifyOtp: publicProcedure
      .input(z.object({
        phoneNumber: myanmarPhoneSchema,
        otpCode: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
      }))
      .mutation(async ({ input }) => {
        try {
          const voter = await db.getVoterByPhoneNumber(input.phoneNumber);
          if (!voter) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Phone number not registered" });
          }

          // Check attempt limit (max 5 attempts)
          if ((voter.otpAttempts || 0) >= 5) {
            throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many failed attempts. Request a new OTP." });
          }

          const isValid = await db.verifyOtpCode(input.phoneNumber, input.otpCode);
          if (!isValid) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired OTP" });
          }

          return { success: true, voter };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Error verifying OTP:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to verify OTP" });
        }
      }),

    // Get voter by phone number
    getByPhone: publicProcedure
      .input(z.object({ phoneNumber: myanmarPhoneSchema }))
      .query(async ({ input }) => {
        try {
          const voter = await db.getVoterByPhoneNumber(input.phoneNumber);
          return voter || null;
        } catch (error) {
          console.error("Error fetching voter:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch voter" });
        }
      })
  }),

  // ========== Votes Router ==========
  votes: router({
    // Get voter's votes
    getVoterVotes: publicProcedure
      .input(z.object({ voterId: z.number() }))
      .query(async ({ input }) => {
        try {
          return await db.getVoterVotes(input.voterId);
        } catch (error) {
          console.error("Error fetching voter votes:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch votes" });
        }
      }),

    // Submit a vote
    submit: publicProcedure
      .input(z.object({
        voterId: z.number(),
        candidateId: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await db.submitVote(input.voterId, input.candidateId);
        } catch (error) {
          console.error("Error submitting vote:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to submit vote" });
        }
      }),

    // Mark votes as submitted
    markSubmitted: publicProcedure
      .input(z.object({ voterId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const db_instance = await db.getDb();
          if (!db_instance) throw new Error("Database not available");
          
          await db_instance.update(voters)
            .set({ hasVoted: true, votedAt: new Date() })
            .where(eq(voters.id, input.voterId));
          
          return { success: true };
        } catch (error) {
          console.error("Error marking votes as submitted:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to mark votes as submitted" });
        }
      }),
  }),

  // ========== Results Router ==========
  results: router({
    // Get all results
    getResults: publicProcedure.query(async () => {
      try {
        return await db.getResults();
      } catch (error) {
        console.error("Error fetching results:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch results" });
      }
    }),

    // Get winner
    getWinner: publicProcedure.query(async () => {
      try {
        return await db.getWinner();
      } catch (error) {
        console.error("Error fetching winner:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch winner" });
      }
    }),

    // Check if results are visible
    isVisible: publicProcedure.query(async () => {
      try {
        return await db.isResultsVisible();
      } catch (error) {
        console.error("Error checking results visibility:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to check results visibility" });
      }
    }),

    // Toggle results visibility (admin only)
    toggleVisibility: adminProcedure.mutation(async () => {
      try {
        const currentVisibility = await db.isResultsVisible();
        await db.setResultsVisible(!currentVisibility);
        return { success: true, isVisible: !currentVisibility };
      } catch (error) {
        console.error("Error toggling results visibility:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to toggle results visibility" });
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
