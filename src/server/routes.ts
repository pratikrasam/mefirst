import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { seedDatabase } from "./seed";
import { getOAuth2Client, getAuthUrl, exchangeCode, getAuthedClient, createCalendarEvent } from "./google-calendar";
import { getAssistantResponse, generateConversationSummary, generateCoachInsights, summarizeSessionNotes, type ChatMessage } from "./openai";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  await seedDatabase();

  const express = await import("express");
  app.use("/uploads", express.default.static(uploadDir));

  const isCoachRole = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (!profile || profile.role !== "coach") {
        return res.status(403).json({ message: "Coach access required" });
      }
      next();
    } catch {
      res.status(500).json({ message: "Authorization check failed" });
    }
  };

  app.post("/api/upload/profile-image", isAuthenticated, upload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      const userId = req.user.claims.sub;

      const profile = await storage.getProfile(userId);
      if (profile) {
        if (profile.profileImage && profile.profileImage.startsWith("/uploads/")) {
          const oldPath = path.join(uploadDir, path.basename(profile.profileImage));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        await storage.updateProfile(userId, { profileImage: imageUrl });
      }

      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.post("/api/upload/coach-image", isAuthenticated, isCoachRole, upload.single("image"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      const userId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(userId);
      if (coach) {
        if (coach.imageUrl && coach.imageUrl.startsWith("/uploads/")) {
          const oldPath = path.join(uploadDir, path.basename(coach.imageUrl));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        await storage.updateCoach(coach.id, { imageUrl });
      }
      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading coach image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getProfile(userId);
      if (!profile) {
        profile = await storage.createProfile({ userId, highLevelGoal: null, coachStyle: null, onboardingCompleted: false });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { highLevelGoal, motivation, coachStyle, onboardingCompleted, displayName, phone } = req.body;
      const existing = await storage.getProfile(userId);
      if (existing) {
        const updated = await storage.updateProfile(userId, { highLevelGoal, motivation, coachStyle, onboardingCompleted, displayName, phone });
        return res.json(updated);
      }
      const profile = await storage.createProfile({ userId, highLevelGoal, motivation, coachStyle, onboardingCompleted, displayName, phone });
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { highLevelGoal, motivation, coachStyle, onboardingCompleted, valuesWheel, consentHipaa, consentRecording, consentDate, displayName, phone } = req.body;
      let profile = await storage.getProfile(userId);
      if (!profile) {
        profile = await storage.createProfile({ userId, highLevelGoal, motivation, coachStyle, onboardingCompleted, valuesWheel });
        return res.json(profile);
      }
      const updateData: any = { highLevelGoal, motivation, coachStyle, onboardingCompleted };
      if (valuesWheel !== undefined) updateData.valuesWheel = valuesWheel;
      if (consentHipaa !== undefined) updateData.consentHipaa = consentHipaa;
      if (consentRecording !== undefined) updateData.consentRecording = consentRecording;
      if (consentDate !== undefined) updateData.consentDate = new Date(consentDate);
      if (displayName !== undefined) updateData.displayName = displayName;
      if (phone !== undefined) updateData.phone = phone;
      const updated = await storage.updateProfile(userId, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/profile/values-wheel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ratings } = req.body;
      if (!ratings || typeof ratings !== "object") {
        return res.status(400).json({ message: "Ratings object required" });
      }
      const validKeys = ["health", "career", "money", "personalGrowth", "funRecreation", "physicalEnvironment", "romance", "family", "friends"];
      for (const key of validKeys) {
        const val = ratings[key];
        if (val !== undefined && (typeof val !== "number" || val < 1 || val > 10)) {
          return res.status(400).json({ message: `Rating for ${key} must be a number between 1 and 10` });
        }
      }
      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      const existingWheel = (profile.valuesWheel || {}) as any;
      const history = existingWheel.history || [];
      if (existingWheel.current) {
        history.push({ ratings: existingWheel.current, date: existingWheel.updatedAt || new Date().toISOString() });
      }
      const valuesWheel = {
        current: ratings,
        history: history.slice(-20),
        updatedAt: new Date().toISOString(),
      };
      const updated = await storage.updateProfile(userId, { valuesWheel });
      res.json(updated);
    } catch (error) {
      console.error("Error updating values wheel:", error);
      res.status(500).json({ message: "Failed to update values wheel" });
    }
  });

  app.post("/api/profile/reset", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.resetUserData(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting user data:", error);
      res.status(500).json({ message: "Failed to reset data" });
    }
  });

  app.post("/api/questionnaire", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { goalMotivation, successVision, answers } = req.body;
      const q = await storage.createQuestionnaire({ userId, goalMotivation, successVision, answers });
      res.json(q);
    } catch (error) {
      console.error("Error creating questionnaire:", error);
      res.status(500).json({ message: "Failed to save questionnaire" });
    }
  });

  app.get("/api/questionnaire", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const q = await storage.getQuestionnaire(userId);
      res.json(q || null);
    } catch (error) {
      console.error("Error fetching questionnaire:", error);
      res.status(500).json({ message: "Failed to fetch questionnaire" });
    }
  });

  app.get("/api/coaches", isAuthenticated, async (_req, res) => {
    try {
      const allCoaches = await storage.getCoaches();
      res.json(allCoaches);
    } catch (error) {
      console.error("Error fetching coaches:", error);
      res.status(500).json({ message: "Failed to fetch coaches" });
    }
  });

  app.get("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userBookings = await storage.getBookings(userId);
      res.json(userBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { coachId, scheduledAt, notes } = req.body;
      if (!coachId || !scheduledAt) {
        return res.status(400).json({ message: "coachId and scheduledAt are required" });
      }
      const booking = await storage.createBooking({ userId, coachId, scheduledAt: new Date(scheduledAt), notes, status: "pending" });
      res.json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.post("/api/bookings/:id/reschedule", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const isPatient = booking.userId === userId;
      const profile = await storage.getProfile(userId);
      const isCoach = profile?.role === "coach";
      let isCoachOfBooking = false;
      if (isCoach) {
        const coach = await storage.getCoachByUserId(userId);
        isCoachOfBooking = coach?.id === booking.coachId;
      }

      if (!isPatient && !isCoachOfBooking) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (booking.status !== "approved") {
        return res.status(400).json({ message: "Only approved bookings can be rescheduled" });
      }

      const { message, scheduledAt: proposedTime } = req.body;
      const updateData: any = {
        status: "reschedule_requested",
        rescheduleMessage: message || null,
        rescheduleRequestedBy: isPatient ? "patient" : "coach",
      };
      if (proposedTime) {
        const parsedDate = new Date(proposedTime);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ message: "Invalid proposed date" });
        }
        if (parsedDate.getTime() < Date.now()) {
          return res.status(400).json({ message: "Proposed date must be in the future" });
        }
        updateData.scheduledAt = parsedDate;
      }
      const updated = await storage.updateBooking(booking.id, updateData);

      res.json(updated);
    } catch (error) {
      console.error("Error requesting reschedule:", error);
      res.status(500).json({ message: "Failed to request reschedule" });
    }
  });

  app.patch("/api/bookings/:id/respond", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (booking.status !== "reschedule_requested") {
        return res.status(400).json({ message: "Booking is not in reschedule_requested status" });
      }

      if (booking.rescheduleRequestedBy !== "coach") {
        return res.status(400).json({ message: "Only reschedules requested by your coach can be responded to" });
      }

      const { status } = req.body;
      if (!status || !["approved", "declined"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'declined'" });
      }

      const updated = await storage.updateBooking(booking.id, {
        status,
        rescheduleMessage: null,
        rescheduleRequestedBy: null,
      });

      if (status === "approved") {
        const coach = await storage.getCoach(booking.coachId);
        if (coach?.userId) {
          const patientUser = await storage.getUser(booking.userId);
          const patientName = patientUser ? `${patientUser.firstName || ""} ${patientUser.lastName || ""}`.trim() || "Patient" : "Patient";

          const calEvent = await createCalendarEvent(coach.userId, {
            summary: `MeFirst: Coaching Session with ${patientName}`,
            description: `Wellness coaching session (rescheduled) booked through MeFirst.\n\nPatient: ${patientName}\nNotes: ${booking.notes || "None"}`,
            startTime: new Date(booking.scheduledAt),
            durationMinutes: 60,
            attendeeEmail: patientUser?.email || undefined,
          });

          if (calEvent && updated) {
            await storage.updateBooking(booking.id, {
              googleEventId: calEvent.eventId || undefined,
              meetLink: calEvent.meetLink || undefined,
            });
            updated.googleEventId = calEvent.eventId || null;
            updated.meetLink = calEvent.meetLink || null;
          }
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Error responding to reschedule:", error);
      res.status(500).json({ message: "Failed to respond to reschedule request" });
    }
  });

  app.get("/api/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getProgressEntries(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post("/api/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entry = await storage.createProgressEntry({ ...req.body, userId });
      res.json(entry);
    } catch (error) {
      console.error("Error creating progress entry:", error);
      res.status(500).json({ message: "Failed to create progress entry" });
    }
  });

  // ---- Coach Registration ----
  app.post("/api/coach/register", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userName = `${req.user.claims.first_name || ""} ${req.user.claims.last_name || ""}`.trim() || "Coach";

      const existingCoach = await storage.getCoachByUserId(userId);
      if (existingCoach) {
        return res.json(existingCoach);
      }

      const { title, bio, style, specialties, onboardingData, maxClients, superpower } = req.body;
      const coach = await storage.createCoach({
        userId,
        name: userName,
        title: title || "Wellness Coach",
        bio: bio || null,
        style: style || "gentle",
        specialties: specialties || [],
        onboardingData: onboardingData || null,
        maxClients: maxClients ? parseInt(maxClients) : null,
        superpower: superpower || null,
        onboardingCompleted: true,
      });

      let profile = await storage.getProfile(userId);
      if (profile) {
        await storage.updateProfile(userId, { role: "coach", onboardingCompleted: true });
      } else {
        await storage.createProfile({ userId, role: "coach", onboardingCompleted: true });
      }

      res.json(coach);
    } catch (error) {
      console.error("Error registering coach:", error);
      res.status(500).json({ message: "Failed to register as coach" });
    }
  });

  app.post("/api/coach/reset", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) {
        return res.status(404).json({ message: "Coach profile not found" });
      }

      await storage.cancelBookingsByCoachId(coach.id);
      await storage.deleteCoachAvailabilityByCoachId(coach.id);
      await storage.deleteGoogleToken(userId);
      await storage.deleteCoach(coach.id);
      await storage.updateProfile(userId, { role: "patient", onboardingCompleted: false });

      res.json({ message: "Coach profile reset successfully" });
    } catch (error) {
      console.error("Error resetting coach:", error);
      res.status(500).json({ message: "Failed to reset coach profile" });
    }
  });

  // ---- Coach Profile ----
  app.get("/api/coach/me", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) {
        return res.status(404).json({ message: "Coach profile not found" });
      }
      res.json(coach);
    } catch (error) {
      console.error("Error fetching coach profile:", error);
      res.status(500).json({ message: "Failed to fetch coach profile" });
    }
  });

  app.patch("/api/coach/me", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) {
        return res.status(404).json({ message: "Coach profile not found" });
      }
      const { name, title, bio, style, specialties, maxClients, superpower, onboardingData } = req.body;
      const updateData: any = { name, title, bio, style, specialties };
      if (maxClients !== undefined) updateData.maxClients = maxClients;
      if (superpower !== undefined) updateData.superpower = superpower;
      if (onboardingData !== undefined) updateData.onboardingData = onboardingData;
      const updated = await storage.updateCoach(coach.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating coach profile:", error);
      res.status(500).json({ message: "Failed to update coach profile" });
    }
  });

  // ---- Coach Availability ----
  app.get("/api/coach/availability", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) {
        return res.status(404).json({ message: "Coach profile not found" });
      }
      const slots = await storage.getCoachAvailability(coach.id);
      res.json(slots);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.post("/api/coach/availability", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) {
        return res.status(404).json({ message: "Coach profile not found" });
      }
      const { dayOfWeek, startTime, endTime } = req.body;
      if (dayOfWeek === undefined || !startTime || !endTime) {
        return res.status(400).json({ message: "dayOfWeek, startTime, and endTime are required" });
      }
      const slot = await storage.createCoachAvailability({ coachId: coach.id, dayOfWeek, startTime, endTime });
      res.json(slot);
    } catch (error) {
      console.error("Error creating availability:", error);
      res.status(500).json({ message: "Failed to create availability" });
    }
  });

  app.delete("/api/coach/availability/:id", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) {
        return res.status(404).json({ message: "Coach profile not found" });
      }
      const slots = await storage.getCoachAvailability(coach.id);
      const slot = slots.find(s => s.id === req.params.id);
      if (!slot) {
        return res.status(404).json({ message: "Availability slot not found" });
      }
      await storage.deleteCoachAvailability(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting availability:", error);
      res.status(500).json({ message: "Failed to delete availability" });
    }
  });

  // ---- Public coach availability (for patients booking) ----
  app.get("/api/coaches/:coachId/availability", isAuthenticated, async (req: any, res) => {
    try {
      const slots = await storage.getCoachAvailability(req.params.coachId);
      const activeSlots = slots.filter(s => s.isActive);
      res.json(activeSlots);
    } catch (error) {
      console.error("Error fetching coach availability:", error);
      res.status(500).json({ message: "Failed to fetch coach availability" });
    }
  });

  // ---- Coach Booking Management ----
  app.get("/api/coach/bookings", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) {
        return res.status(404).json({ message: "Coach profile not found" });
      }
      const coachBookings = await storage.getBookingsByCoachId(coach.id);
      res.json(coachBookings);
    } catch (error) {
      console.error("Error fetching coach bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/coach/bookings/:id", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) {
        return res.status(404).json({ message: "Coach profile not found" });
      }

      const booking = await storage.getBooking(req.params.id);
      if (!booking || booking.coachId !== coach.id) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const { status, scheduledAt: newScheduledAt } = req.body;
      if (!status || !["approved", "declined", "completed"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved', 'declined', or 'completed'" });
      }

      if (status === "completed" && booking.status !== "approved") {
        return res.status(400).json({ message: "Only approved bookings can be marked as completed" });
      }

      if (booking.status === "reschedule_requested" && booking.rescheduleRequestedBy === "coach") {
        return res.status(400).json({ message: "You cannot approve your own reschedule request" });
      }

      const updateData: any = {
        status,
        rescheduleMessage: null,
        rescheduleRequestedBy: null,
      };

      if (newScheduledAt) {
        updateData.scheduledAt = new Date(newScheduledAt);
      }

      const updated = await storage.updateBooking(booking.id, updateData);

      if (status === "approved" && coach.userId) {
        const patientUser = await storage.getUser(booking.userId);
        const patientName = patientUser ? `${patientUser.firstName || ""} ${patientUser.lastName || ""}`.trim() || "Patient" : "Patient";

        const calEvent = await createCalendarEvent(coach.userId, {
          summary: `MeFirst: Coaching Session with ${patientName}`,
          description: `Wellness coaching session booked through MeFirst.\n\nPatient: ${patientName}\nNotes: ${booking.notes || "None"}`,
          startTime: newScheduledAt ? new Date(newScheduledAt) : new Date(booking.scheduledAt),
          durationMinutes: 60,
          attendeeEmail: patientUser?.email || undefined,
        });

        if (calEvent && updated) {
          await storage.updateBooking(booking.id, {
            googleEventId: calEvent.eventId || undefined,
            meetLink: calEvent.meetLink || undefined,
          });
          updated.googleEventId = calEvent.eventId || null;
          updated.meetLink = calEvent.meetLink || null;
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // ---- Session Notes ----
  app.get("/api/coach/bookings/:id/notes", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) return res.status(404).json({ message: "Coach profile not found" });

      const booking = await storage.getBooking(req.params.id);
      if (!booking || booking.coachId !== coach.id) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const note = await storage.getSessionNote(req.params.id);
      const patientProfile = await storage.getProfile(booking.userId);
      const analysisAllowed = patientProfile?.consentRecording === true;

      res.json({
        note: note || null,
        analysisAllowed,
      });
    } catch (error) {
      console.error("Error fetching session notes:", error);
      res.status(500).json({ message: "Failed to fetch session notes" });
    }
  });

  app.post("/api/coach/bookings/:id/notes", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) return res.status(404).json({ message: "Coach profile not found" });

      const booking = await storage.getBooking(req.params.id);
      if (!booking || booking.coachId !== coach.id) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Content is required" });
      }

      const existing = await storage.getSessionNote(req.params.id);
      if (existing) {
        const updated = await storage.updateSessionNote(existing.id, { content });
        return res.json(updated);
      }

      const note = await storage.createSessionNote({
        bookingId: req.params.id,
        coachId: coach.id,
        content,
      });
      res.json(note);
    } catch (error) {
      console.error("Error saving session notes:", error);
      res.status(500).json({ message: "Failed to save session notes" });
    }
  });

  app.post("/api/coach/bookings/:id/notes/summarize", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) return res.status(404).json({ message: "Coach profile not found" });

      const booking = await storage.getBooking(req.params.id);
      if (!booking || booking.coachId !== coach.id) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.status !== "completed") {
        return res.status(400).json({ message: "Session must be marked as completed before analyzing notes" });
      }

      const patientProfile = await storage.getProfile(booking.userId);
      if (patientProfile && !patientProfile.consentRecording) {
        return res.status(403).json({ message: "Patient has not consented to session recording and AI analysis" });
      }

      const note = await storage.getSessionNote(req.params.id);
      if (!note?.content) {
        return res.status(400).json({ message: "No notes to summarize" });
      }

      const patientUser = await storage.getUser(booking.userId);
      const patientName = patientUser ? `${patientUser.firstName || ""} ${patientUser.lastName || ""}`.trim() || "Patient" : "Patient";

      const valuesWheelData = patientProfile?.valuesWheel as { current?: Record<string, number> } | null;

      const allCoachBookings = await storage.getBookingsByCoachId(coach.id);
      const previousBookings = allCoachBookings
        .filter(b => b.userId === booking.userId && b.id !== booking.id && (b.status === "completed" || b.status === "approved"))
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

      let previousNotesSummary: string | undefined;
      if (previousBookings.length > 0) {
        const prevNote = await storage.getSessionNote(previousBookings[0].id);
        if (prevNote?.aiSummary) {
          try {
            const prevAnalysis = JSON.parse(prevNote.aiSummary);
            previousNotesSummary = `Client commitment: ${prevAnalysis.clientCommitmentForNextSession || "Not specified"}. Progress: ${prevAnalysis.generalProgressNotes || "Not specified"}`;
          } catch { /* ignore parse errors */ }
        }
      }

      const summary = await summarizeSessionNotes(note.content, {
        patientName,
        sessionDate: new Date(booking.scheduledAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
        previousNotesSummary,
        currentValuesWheel: valuesWheelData?.current || undefined,
      });

      if (summary.valuesWheelSuggestions && patientProfile) {
        const existingWheel = (patientProfile.valuesWheel || {}) as any;
        const history = existingWheel.history || [];
        if (existingWheel.current) {
          history.push({
            ratings: existingWheel.current,
            date: existingWheel.updatedAt || new Date().toISOString(),
            sessionId: booking.id,
          });
        }
        const mergedRatings = { ...(existingWheel.current || {}), ...summary.valuesWheelSuggestions };
        const valuesWheel = {
          current: mergedRatings,
          history: history.slice(-20),
          updatedAt: new Date().toISOString(),
          lastSessionUpdate: booking.id,
        };
        await storage.updateProfile(booking.userId, { valuesWheel });
      }

      const updated = await storage.updateSessionNote(note.id, {
        aiSummary: JSON.stringify(summary),
      });
      res.json({ note: updated, summary });
    } catch (error) {
      console.error("Error summarizing session notes:", error);
      res.status(500).json({ message: "Failed to summarize session notes" });
    }
  });

  // ---- Google Calendar OAuth ----
  app.get("/api/auth/google", isAuthenticated, isCoachRole, (req: any, res) => {
    const userId = req.user.claims.sub;
    const host = req.get("host");
    const authUrl = getAuthUrl(userId, host);
    res.json({ url: authUrl });
  });

  app.get("/api/auth/google/callback", async (req: any, res) => {
    try {
      const { code, state: userId } = req.query;
      if (!code || !userId) {
        return res.status(400).send("Missing code or state");
      }

      const host = req.get("host");
      const tokens = await exchangeCode(code as string, host);

      await storage.saveGoogleToken({
        userId: userId as string,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: new Date(tokens.expiry_date!),
      });

      res.send(`
        <html>
          <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;background:#f0fdf4;">
            <div style="text-align:center;">
              <h2 style="color:#14b8a6;">Google Calendar Connected!</h2>
              <p>You can close this window and return to MeFirst.</p>
              <script>setTimeout(()=>window.close(),2000)</script>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.status(500).send("Failed to connect Google Calendar. Please try again.");
    }
  });

  app.get("/api/coach/google-status", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const token = await storage.getGoogleToken(userId);
      if (!token) {
        return res.json({ connected: false });
      }
      const client = await getAuthedClient(userId);
      res.json({ connected: !!client });
    } catch {
      res.json({ connected: false });
    }
  });

  app.post("/api/coach/google-disconnect", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.deleteGoogleToken(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting Google:", error);
      res.status(500).json({ message: "Failed to disconnect" });
    }
  });

  // ---- AI Assistant Routes (patient-only) ----
  const isPatientRole = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (profile && profile.role === "coach") {
        return res.status(403).json({ message: "Assistant is only available for patients" });
      }
      next();
    } catch {
      res.status(500).json({ message: "Authorization check failed" });
    }
  };

  app.get("/api/assistant", isAuthenticated, isPatientRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (!profile?.assignedAssistantId) {
        return res.json(null);
      }
      const assistant = await storage.getAssistant(profile.assignedAssistantId);
      res.json(assistant || null);
    } catch (error) {
      console.error("Error fetching assistant:", error);
      res.status(500).json({ message: "Failed to fetch assistant" });
    }
  });

  app.get("/api/assistant/conversation", isAuthenticated, isPatientRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const convo = await storage.getConversation(userId);
      res.json(convo || null);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/assistant/chat", isAuthenticated, isPatientRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message } = req.body;
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ message: "Message is required" });
      }

      const profile = await storage.getProfile(userId);
      if (!profile?.assignedAssistantId) {
        return res.status(400).json({ message: "No assistant assigned. Complete onboarding first." });
      }

      const assistant = await storage.getAssistant(profile.assignedAssistantId);
      if (!assistant) {
        return res.status(404).json({ message: "Assistant not found" });
      }

      let convo = await storage.getConversation(userId);
      if (!convo) {
        convo = await storage.createConversation({
          userId,
          assistantId: assistant.id,
          messages: [],
          messageCount: 0,
        });
      }

      const history = (convo.messages as ChatMessage[]) || [];

      const bookings = await storage.getBookings(userId);
      const upcomingBooking = bookings
        .filter(b => b.status === "approved" && new Date(b.scheduledAt) > new Date())
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

      let upcomingSession = null;
      if (upcomingBooking) {
        const coach = await storage.getCoach(upcomingBooking.coachId);
        upcomingSession = { date: upcomingBooking.scheduledAt.toISOString(), coachName: coach?.name || "your coach" };
      }

      const valuesWheelData = profile.valuesWheel as { current?: Record<string, number> } | null;
      const patientContext: import("./openai").PatientContext = {
        highLevelGoal: profile.highLevelGoal,
        motivation: profile.motivation,
        coachStyle: profile.coachStyle,
        valuesWheel: valuesWheelData?.current || null,
        upcomingSession,
      };

      const aiResponse = await getAssistantResponse(
        assistant.systemPrompt,
        history.slice(-20),
        message.trim(),
        patientContext
      );

      const updatedMessages = [
        ...history,
        { role: "user" as const, content: message.trim() },
        { role: "assistant" as const, content: aiResponse },
      ];
      const newCount = (convo.messageCount || 0) + 2;

      let summary = convo.summary;
      if (newCount > 0 && newCount % 10 === 0) {
        try {
          summary = await generateConversationSummary(updatedMessages);
        } catch (e) {
          console.error("Failed to generate summary:", e);
        }
      }

      const updated = await storage.updateConversation(convo.id, {
        messages: updatedMessages as any,
        messageCount: newCount,
        summary,
      });

      res.json({
        response: aiResponse,
        conversation: updated,
      });
    } catch (error) {
      console.error("Error in assistant chat:", error);
      res.status(500).json({ message: "Failed to get response from assistant" });
    }
  });

  app.post("/api/assistant/assign", isAuthenticated, isPatientRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (profile.assignedAssistantId) {
        const existing = await storage.getAssistant(profile.assignedAssistantId);
        return res.json(existing);
      }

      const allAssistants = await storage.getAssistants();
      if (allAssistants.length === 0) {
        return res.status(500).json({ message: "No assistants available" });
      }

      const goal = (profile.highLevelGoal || "").toLowerCase();
      let matched = allAssistants.find(a =>
        a.goalMapping?.some(g => goal.includes(g))
      );
      if (!matched) {
        matched = allAssistants.find(a => a.specialty === "General wellness") || allAssistants[allAssistants.length - 1];
      }

      await storage.updateProfile(userId, { assignedAssistantId: matched.id });
      res.json(matched);
    } catch (error) {
      console.error("Error assigning assistant:", error);
      res.status(500).json({ message: "Failed to assign assistant" });
    }
  });

  // ---- Coach: Patient session prep insights ----
  app.get("/api/coach/patients/:userId/insights", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const coachUserId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(coachUserId);
      if (!coach) {
        return res.status(404).json({ message: "Coach profile not found" });
      }

      const patientUserId = req.params.userId;
      const coachBookings = await storage.getBookingsByCoachId(coach.id);
      const isMyPatient = coachBookings.some(b => b.userId === patientUserId);
      if (!isMyPatient) {
        return res.status(403).json({ message: "This patient is not assigned to you" });
      }

      const conversation = await storage.getConversation(patientUserId);
      if (!conversation || !conversation.messages || (conversation.messages as any[]).length === 0) {
        return res.json({
          keyTopics: [],
          emotionalTone: "No data yet",
          concerns: [],
          wins: [],
          actionItems: [],
          suggestedTalkingPoints: [],
          overallProgress: "This patient hasn't started chatting with their AI assistant yet.",
        });
      }

      const profile = await storage.getProfile(patientUserId);
      let assistantName: string | null = null;
      if (profile?.assignedAssistantId) {
        const assistant = await storage.getAssistant(profile.assignedAssistantId);
        assistantName = assistant?.name || null;
      }

      const insights = await generateCoachInsights(
        conversation.messages as ChatMessage[],
        profile?.highLevelGoal || null,
        assistantName
      );

      res.json(insights);
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // ---- Coach: Patient assistant data ----
  app.get("/api/coach/patients", isAuthenticated, isCoachRole, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coach = await storage.getCoachByUserId(userId);
      if (!coach) {
        return res.status(404).json({ message: "Coach profile not found" });
      }
      const coachBookings = await storage.getBookingsByCoachId(coach.id);
      const patientUserIds = Array.from(new Set(coachBookings.map(b => b.userId)));

      const patients = await Promise.all(
        patientUserIds.map(async (patientUserId) => {
          const profile = await storage.getPatientProfile(patientUserId);
          const questionnaire = await storage.getPatientQuestionnaire(patientUserId);
          const patientBookings = coachBookings.filter(b => b.userId === patientUserId);
          const conversation = await storage.getConversation(patientUserId);

          let assistantName = null;
          if (profile?.assignedAssistantId) {
            const assistant = await storage.getAssistant(profile.assignedAssistantId);
            assistantName = assistant?.name || null;
          }

          return {
            userId: patientUserId,
            profile,
            questionnaire,
            bookings: patientBookings,
            assistantInteractions: {
              messageCount: conversation?.messageCount || 0,
              summary: conversation?.summary || null,
              assistantName,
            },
          };
        })
      );

      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  return httpServer;
}
