import { eq, and, count, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, candidates, voters, votes, settings, Candidate, Voter, Vote } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== Candidate Functions ==========

export async function getAllCandidates(): Promise<Candidate[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(candidates).orderBy(candidates.createdAt);
}

export async function getCandidateById(id: number): Promise<Candidate | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCandidate(name: string, description?: string, photoKey?: string): Promise<Candidate> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(candidates).values({
    name,
    description: description || null,
    photoKey: photoKey || null,
  });
  
  // Get the newly created candidate
  const result = await db.select().from(candidates).where(eq(candidates.name, name)).orderBy(desc(candidates.createdAt)).limit(1);
  if (result.length === 0) throw new Error("Failed to create candidate");
  return result[0];
}

export async function updateCandidate(id: number, updates: { name?: string; description?: string; photoKey?: string }): Promise<Candidate> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(candidates).set(updates).where(eq(candidates.id, id));
  const candidate = await getCandidateById(id);
  if (!candidate) throw new Error("Candidate not found");
  return candidate;
}

export async function deleteCandidate(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(candidates).where(eq(candidates.id, id));
}

// ========== Voter Functions ==========

export async function getVoterByPhoneNumber(phoneNumber: string): Promise<Voter | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(voters).where(eq(voters.phoneNumber, phoneNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function registerVoter(phoneNumber: string): Promise<Voter> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getVoterByPhoneNumber(phoneNumber);
  if (existing) return existing;
  
  await db.insert(voters).values({
    phoneNumber,
    isVerified: false,
    hasVoted: false,
  });
  
  const result = await db.select().from(voters).where(eq(voters.phoneNumber, phoneNumber)).limit(1);
  if (result.length === 0) throw new Error("Failed to register voter");
  return result[0];
}

export async function saveOtpCode(phoneNumber: string, otpCode: string, expiryMinutes: number = 10): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const existing = await getVoterByPhoneNumber(phoneNumber);
  
  if (existing) {
    await db.update(voters)
      .set({
        otpCode,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
      })
      .where(eq(voters.phoneNumber, phoneNumber));
  } else {
    await db.insert(voters).values({
      phoneNumber,
      otpCode,
      otpExpiresAt: expiresAt,
      isVerified: false,
      hasVoted: false,
    });
  }
}

export async function verifyOtpCode(phoneNumber: string, otpCode: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const voter = await getVoterByPhoneNumber(phoneNumber);
  if (!voter) return false;
  
  if (!voter.otpExpiresAt || new Date() > voter.otpExpiresAt) {
    return false;
  }
  
  if (voter.otpCode !== otpCode) {
    await db.update(voters)
      .set({ otpAttempts: (voter.otpAttempts || 0) + 1 })
      .where(eq(voters.phoneNumber, phoneNumber));
    return false;
  }
  
  await db.update(voters)
    .set({
      isVerified: true,
      otpCode: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    })
    .where(eq(voters.phoneNumber, phoneNumber));
  
  return true;
}

// ========== Vote Functions ==========

export async function getVoterVotes(voterId: number): Promise<Vote[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(votes).where(eq(votes.voterId, voterId));
}

export async function submitVote(voterId: number, candidateId: number): Promise<Vote> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if voter has already voted for this candidate
  const existing = await db.select().from(votes)
    .where(and(eq(votes.voterId, voterId), eq(votes.candidateId, candidateId)))
    .limit(1);
  
  if (existing.length > 0) {
    throw new Error("Voter has already voted for this candidate");
  }
  
  // Check vote count
  const voteCount = await db.select({ count: count() }).from(votes).where(eq(votes.voterId, voterId));
  const currentVotes = voteCount[0]?.count || 0;
  
  if (currentVotes >= 3) {
    throw new Error("Voter has reached maximum vote limit (3)");
  }
  
  await db.insert(votes).values({
    voterId,
    candidateId,
  });
  
  // Get the newly created vote
  const vote = await db.select().from(votes)
    .where(and(eq(votes.voterId, voterId), eq(votes.candidateId, candidateId)))
    .orderBy(desc(votes.createdAt))
    .limit(1);
  if (vote.length === 0) throw new Error("Failed to submit vote");
  
  // Update candidate vote count
  const candidate = await getCandidateById(candidateId);
  if (candidate) {
    await db.update(candidates)
      .set({ voteCount: candidate.voteCount + 1 })
      .where(eq(candidates.id, candidateId));
  }
  
  return vote[0];
}

// ========== Results Functions ==========

export async function getResults(): Promise<(Candidate & { rank: number })[]> {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db.select().from(candidates).orderBy(desc(candidates.voteCount));
  return results.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }));
}

export async function getWinner(): Promise<(Candidate & { rank: number }) | undefined> {
  const results = await getResults();
  return results.length > 0 ? results[0] : undefined;
}

// ========== Settings Functions ==========

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result.length > 0 ? result[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSetting(key);
  if (existing !== null) {
    await db.update(settings).set({ value }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }
}

export async function isResultsVisible(): Promise<boolean> {
  const value = await getSetting("resultsVisible");
  return value === "true";
}

export async function setResultsVisible(visible: boolean): Promise<void> {
  await setSetting("resultsVisible", visible ? "true" : "false");
}
