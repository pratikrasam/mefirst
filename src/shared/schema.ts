import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: varchar("role").default("patient"),
  displayName: varchar("display_name"),
  phone: varchar("phone"),
  profileImage: varchar("profile_image"),
  highLevelGoal: text("high_level_goal"),
  motivation: text("motivation"),
  coachStyle: varchar("coach_style"),
  assignedAssistantId: varchar("assigned_assistant_id"),
  valuesWheel: jsonb("values_wheel"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  consentHipaa: boolean("consent_hipaa").default(false),
  consentRecording: boolean("consent_recording").default(false),
  consentDate: timestamp("consent_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const questionnaires = pgTable("questionnaires", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  goalMotivation: text("goal_motivation").array(),
  successVision: text("success_vision"),
  answers: jsonb("answers"),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const coaches = pgTable("coaches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: varchar("name").notNull(),
  title: varchar("title").notNull(),
  bio: text("bio"),
  style: varchar("style").notNull(),
  specialties: text("specialties").array(),
  imageUrl: varchar("image_url"),
  rating: integer("rating").default(5),
  sessionsCompleted: integer("sessions_completed").default(0),
  onboardingData: jsonb("onboarding_data"),
  maxClients: integer("max_clients"),
  superpower: text("superpower"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
});

export const coachAvailability = pgTable("coach_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: varchar("start_time").notNull(),
  endTime: varchar("end_time").notNull(),
  isActive: boolean("is_active").default(true),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  coachId: varchar("coach_id").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: varchar("status").default("pending"),
  notes: text("notes"),
  googleEventId: varchar("google_event_id"),
  meetLink: varchar("meet_link"),
  rescheduleMessage: text("reschedule_message"),
  rescheduleRequestedBy: varchar("reschedule_requested_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const progressEntries = pgTable("progress_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  date: timestamp("date").defaultNow(),
  mood: integer("mood"),
  energyLevel: integer("energy_level"),
  notes: text("notes"),
});

export const googleTokens = pgTable("google_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  calendarId: varchar("calendar_id").default("primary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const assistants = pgTable("assistants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  title: varchar("title").notNull(),
  bio: text("bio").notNull(),
  specialty: varchar("specialty").notNull(),
  avatarEmoji: varchar("avatar_emoji").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  goalMapping: text("goal_mapping").array(),
});

export const assistantConversations = pgTable("assistant_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  assistantId: varchar("assistant_id").notNull(),
  messages: jsonb("messages").default([]),
  summary: text("summary"),
  messageCount: integer("message_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessionNotes = pgTable("session_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull(),
  coachId: varchar("coach_id").notNull(),
  content: text("content"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuestionnaireSchema = createInsertSchema(questionnaires).omit({ id: true, completedAt: true });
export const insertCoachSchema = createInsertSchema(coaches).omit({ id: true });
export const insertCoachAvailabilitySchema = createInsertSchema(coachAvailability).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export const insertProgressEntrySchema = createInsertSchema(progressEntries).omit({ id: true, date: true });
export const insertGoogleTokenSchema = createInsertSchema(googleTokens).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAssistantSchema = createInsertSchema(assistants).omit({ id: true });
export const insertAssistantConversationSchema = createInsertSchema(assistantConversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionNoteSchema = createInsertSchema(sessionNotes).omit({ id: true, createdAt: true, updatedAt: true });

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type Questionnaire = typeof questionnaires.$inferSelect;
export type InsertQuestionnaire = z.infer<typeof insertQuestionnaireSchema>;
export type Coach = typeof coaches.$inferSelect;
export type InsertCoach = z.infer<typeof insertCoachSchema>;
export type CoachAvailability = typeof coachAvailability.$inferSelect;
export type InsertCoachAvailability = z.infer<typeof insertCoachAvailabilitySchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type ProgressEntry = typeof progressEntries.$inferSelect;
export type InsertProgressEntry = z.infer<typeof insertProgressEntrySchema>;
export type GoogleToken = typeof googleTokens.$inferSelect;
export type InsertGoogleToken = z.infer<typeof insertGoogleTokenSchema>;
export type Assistant = typeof assistants.$inferSelect;
export type InsertAssistant = z.infer<typeof insertAssistantSchema>;
export type AssistantConversation = typeof assistantConversations.$inferSelect;
export type InsertAssistantConversation = z.infer<typeof insertAssistantConversationSchema>;
export type SessionNote = typeof sessionNotes.$inferSelect;
export type InsertSessionNote = z.infer<typeof insertSessionNoteSchema>;
