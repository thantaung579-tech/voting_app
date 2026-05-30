import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

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
        name: z.string().min(1, "Candidate name is required"),
        description: z.string().optional(),
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
        name: z.string().optional(),
        description: z.string().optional(),
        photoKey: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { id, ...updates } = input;
          return await db.updateCandidate(id, updates);
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
    // Register or get voter by phone number
    register: publicProcedure
      .input(z.object({ phoneNumber: myanmarPhoneSchema }))
      .mutation(async ({ input }) => {
        try {
          const voter = await db.registerVoter(input.phoneNumber);
          return voter;
        } catch (error) {
          console.error("Error registering voter:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to register voter" });
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
      }),
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
          const vote = await db.submitVote(input.voterId, input.candidateId);
          return vote;
        } catch (error) {
          if (error instanceof Error) {
            if (error.message.includes("already voted")) {
              throw new TRPCError({ code: "CONFLICT", message: error.message });
            }
            if (error.message.includes("maximum vote limit")) {
              throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
            }
          }
          console.error("Error submitting vote:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to submit vote" });
        }
      }),
  }),

  // ========== Results Router ==========
  results: router({
    // Get all results ranked by vote count
    getResults: publicProcedure.query(async () => {
      try {
        const isVisible = await db.isResultsVisible();
        if (!isVisible) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Results are not yet visible" });
        }
        return await db.getResults();
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Error fetching results:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch results" });
      }
    }),

    // Get winner
    getWinner: publicProcedure.query(async () => {
      try {
        const isVisible = await db.isResultsVisible();
        if (!isVisible) {
          return null;
        }
        return await db.getWinner();
      } catch (error) {
        console.error("Error fetching winner:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch winner" });
      }
    }),

    // Check if results are visible (public)
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
        const isCurrentlyVisible = await db.isResultsVisible();
        await db.setResultsVisible(!isCurrentlyVisible);
        return { visible: !isCurrentlyVisible };
      } catch (error) {
        console.error("Error toggling results visibility:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to toggle results visibility" });
      }
    }),

    // Set results visibility (admin only)
    setVisibility: adminProcedure
      .input(z.object({ visible: z.boolean() }))
      .mutation(async ({ input }) => {
        try {
          await db.setResultsVisible(input.visible);
          return { visible: input.visible };
        } catch (error) {
          console.error("Error setting results visibility:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to set results visibility" });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
