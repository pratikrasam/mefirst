import {
  userProfiles, questionnaires, coaches, coachAvailability, bookings, progressEntries, googleTokens,
  assistants, assistantConversations, sessionNotes,
  type UserProfile, type InsertUserProfile,
  type Questionnaire, type InsertQuestionnaire,
  type Coach, type InsertCoach,
  type CoachAvailability, type InsertCoachAvailability,
  type Booking, type InsertBooking,
  type ProgressEntry, type InsertProgressEntry,
  type GoogleToken, type InsertGoogleToken,
  type Assistant, type InsertAssistant,
  type AssistantConversation, type InsertAssistantConversation,
  type SessionNote, type InsertSessionNote,
  users, type User,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ne } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getProfile(userId: string): Promise<UserProfile | undefined>;
  createProfile(data: InsertUserProfile): Promise<UserProfile>;
  updateProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;

  createQuestionnaire(data: InsertQuestionnaire): Promise<Questionnaire>;
  getQuestionnaire(userId: string): Promise<Questionnaire | undefined>;

  getCoaches(): Promise<Coach[]>;
  getCoach(id: string): Promise<Coach | undefined>;
  getCoachByUserId(userId: string): Promise<Coach | undefined>;
  createCoach(data: InsertCoach): Promise<Coach>;
  updateCoach(id: string, data: Partial<InsertCoach>): Promise<Coach | undefined>;

  getCoachAvailability(coachId: string): Promise<CoachAvailability[]>;
  createCoachAvailability(data: InsertCoachAvailability): Promise<CoachAvailability>;
  updateCoachAvailability(id: string, data: Partial<InsertCoachAvailability>): Promise<CoachAvailability | undefined>;
  deleteCoachAvailability(id: string): Promise<void>;

  getBookings(userId: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByCoachId(coachId: string): Promise<Booking[]>;
  createBooking(data: InsertBooking): Promise<Booking>;

  getProgressEntries(userId: string): Promise<ProgressEntry[]>;
  createProgressEntry(data: InsertProgressEntry): Promise<ProgressEntry>;

  getPatientProfile(userId: string): Promise<UserProfile | undefined>;
  getPatientQuestionnaire(userId: string): Promise<Questionnaire | undefined>;

  resetUserData(userId: string): Promise<void>;

  getGoogleToken(userId: string): Promise<GoogleToken | undefined>;
  saveGoogleToken(data: InsertGoogleToken): Promise<GoogleToken>;
  updateGoogleToken(userId: string, data: Partial<InsertGoogleToken>): Promise<GoogleToken | undefined>;
  deleteGoogleToken(userId: string): Promise<void>;
  updateBooking(id: string, data: Partial<{ googleEventId: string; meetLink: string; status: string; scheduledAt: Date; rescheduleMessage: string | null; rescheduleRequestedBy: string | null }>): Promise<Booking | undefined>;

  cancelBookingsByCoachId(coachId: string): Promise<void>;
  deleteCoachAvailabilityByCoachId(coachId: string): Promise<void>;
  deleteCoach(id: string): Promise<void>;

  getAssistants(): Promise<Assistant[]>;
  getAssistant(id: string): Promise<Assistant | undefined>;
  getConversation(userId: string): Promise<AssistantConversation | undefined>;
  createConversation(data: InsertAssistantConversation): Promise<AssistantConversation>;
  updateConversation(id: string, data: Partial<InsertAssistantConversation>): Promise<AssistantConversation | undefined>;

  createSessionNote(data: InsertSessionNote): Promise<SessionNote>;
  getSessionNote(bookingId: string): Promise<SessionNote | undefined>;
  updateSessionNote(id: string, data: Partial<InsertSessionNote>): Promise<SessionNote | undefined>;
  getSessionNotesByCoach(coachId: string): Promise<SessionNote[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createProfile(data: InsertUserProfile): Promise<UserProfile> {
    const [profile] = await db.insert(userProfiles).values(data).returning();
    return profile;
  }

  async updateProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [profile] = await db.update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return profile;
  }

  async createQuestionnaire(data: InsertQuestionnaire): Promise<Questionnaire> {
    const [q] = await db.insert(questionnaires).values(data).returning();
    return q;
  }

  async getQuestionnaire(userId: string): Promise<Questionnaire | undefined> {
    const [q] = await db.select().from(questionnaires).where(eq(questionnaires.userId, userId)).orderBy(desc(questionnaires.completedAt));
    return q;
  }

  async getCoaches(): Promise<Coach[]> {
    return db.select().from(coaches);
  }

  async getCoach(id: string): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(eq(coaches.id, id));
    return coach;
  }

  async getCoachByUserId(userId: string): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(eq(coaches.userId, userId));
    return coach;
  }

  async createCoach(data: InsertCoach): Promise<Coach> {
    const [coach] = await db.insert(coaches).values(data).returning();
    return coach;
  }

  async updateCoach(id: string, data: Partial<InsertCoach>): Promise<Coach | undefined> {
    const [coach] = await db.update(coaches).set(data).where(eq(coaches.id, id)).returning();
    return coach;
  }

  async getCoachAvailability(coachId: string): Promise<CoachAvailability[]> {
    return db.select().from(coachAvailability).where(eq(coachAvailability.coachId, coachId));
  }

  async createCoachAvailability(data: InsertCoachAvailability): Promise<CoachAvailability> {
    const [slot] = await db.insert(coachAvailability).values(data).returning();
    return slot;
  }

  async updateCoachAvailability(id: string, data: Partial<InsertCoachAvailability>): Promise<CoachAvailability | undefined> {
    const [slot] = await db.update(coachAvailability).set(data).where(eq(coachAvailability.id, id)).returning();
    return slot;
  }

  async deleteCoachAvailability(id: string): Promise<void> {
    await db.delete(coachAvailability).where(eq(coachAvailability.id, id));
  }

  async getBookings(userId: string): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.scheduledAt));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getBookingsByCoachId(coachId: string): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.coachId, coachId)).orderBy(desc(bookings.scheduledAt));
  }

  async createBooking(data: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(data).returning();
    return booking;
  }

  async getProgressEntries(userId: string): Promise<ProgressEntry[]> {
    return db.select().from(progressEntries).where(eq(progressEntries.userId, userId)).orderBy(desc(progressEntries.date));
  }

  async createProgressEntry(data: InsertProgressEntry): Promise<ProgressEntry> {
    const [entry] = await db.insert(progressEntries).values(data).returning();
    return entry;
  }

  async getPatientProfile(userId: string): Promise<UserProfile | undefined> {
    return this.getProfile(userId);
  }

  async getPatientQuestionnaire(userId: string): Promise<Questionnaire | undefined> {
    return this.getQuestionnaire(userId);
  }

  async getGoogleToken(userId: string): Promise<GoogleToken | undefined> {
    const [token] = await db.select().from(googleTokens).where(eq(googleTokens.userId, userId));
    return token;
  }

  async saveGoogleToken(data: InsertGoogleToken): Promise<GoogleToken> {
    const existing = await this.getGoogleToken(data.userId);
    if (existing) {
      const [token] = await db.update(googleTokens)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(googleTokens.userId, data.userId))
        .returning();
      return token;
    }
    const [token] = await db.insert(googleTokens).values(data).returning();
    return token;
  }

  async updateGoogleToken(userId: string, data: Partial<InsertGoogleToken>): Promise<GoogleToken | undefined> {
    const [token] = await db.update(googleTokens)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(googleTokens.userId, userId))
      .returning();
    return token;
  }

  async deleteGoogleToken(userId: string): Promise<void> {
    await db.delete(googleTokens).where(eq(googleTokens.userId, userId));
  }

  async updateBooking(id: string, data: Partial<{ googleEventId: string; meetLink: string; status: string; scheduledAt: Date; rescheduleMessage: string | null; rescheduleRequestedBy: string | null }>): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set(data).where(eq(bookings.id, id)).returning();
    return booking;
  }

  async cancelBookingsByCoachId(coachId: string): Promise<void> {
    await db.update(bookings)
      .set({ status: "cancelled" })
      .where(and(eq(bookings.coachId, coachId), ne(bookings.status, "declined"), ne(bookings.status, "cancelled")));
  }

  async deleteCoachAvailabilityByCoachId(coachId: string): Promise<void> {
    await db.delete(coachAvailability).where(eq(coachAvailability.coachId, coachId));
  }

  async deleteCoach(id: string): Promise<void> {
    await db.delete(coaches).where(eq(coaches.id, id));
  }

  async resetUserData(userId: string): Promise<void> {
    await db.delete(questionnaires).where(eq(questionnaires.userId, userId));
    await db.delete(bookings).where(eq(bookings.userId, userId));
    await db.delete(progressEntries).where(eq(progressEntries.userId, userId));
    await db.delete(assistantConversations).where(eq(assistantConversations.userId, userId));
    await db.update(userProfiles)
      .set({
        highLevelGoal: null,
        motivation: null,
        coachStyle: null,
        assignedAssistantId: null,
        onboardingCompleted: false,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId));
  }

  async getAssistants(): Promise<Assistant[]> {
    return db.select().from(assistants);
  }

  async getAssistant(id: string): Promise<Assistant | undefined> {
    const [assistant] = await db.select().from(assistants).where(eq(assistants.id, id));
    return assistant;
  }

  async getConversation(userId: string): Promise<AssistantConversation | undefined> {
    const [convo] = await db.select().from(assistantConversations).where(eq(assistantConversations.userId, userId));
    return convo;
  }

  async createConversation(data: InsertAssistantConversation): Promise<AssistantConversation> {
    const [convo] = await db.insert(assistantConversations).values(data).returning();
    return convo;
  }

  async updateConversation(id: string, data: Partial<InsertAssistantConversation>): Promise<AssistantConversation | undefined> {
    const [convo] = await db.update(assistantConversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assistantConversations.id, id))
      .returning();
    return convo;
  }

  async createSessionNote(data: InsertSessionNote): Promise<SessionNote> {
    const [note] = await db.insert(sessionNotes).values(data).returning();
    return note;
  }

  async getSessionNote(bookingId: string): Promise<SessionNote | undefined> {
    const [note] = await db.select().from(sessionNotes).where(eq(sessionNotes.bookingId, bookingId));
    return note;
  }

  async updateSessionNote(id: string, data: Partial<InsertSessionNote>): Promise<SessionNote | undefined> {
    const [note] = await db.update(sessionNotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sessionNotes.id, id))
      .returning();
    return note;
  }

  async getSessionNotesByCoach(coachId: string): Promise<SessionNote[]> {
    return db.select().from(sessionNotes).where(eq(sessionNotes.coachId, coachId)).orderBy(desc(sessionNotes.createdAt));
  }
}

export const storage = new DatabaseStorage();
