import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReschedulePicker, parseTimeToDate } from "@/components/reschedule-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, LogOut, Users, Calendar, User, Plus, Trash2, Clock, ChevronRight, ChevronLeft, FileText, Link, Unlink, CalendarCheck, Check, X, RefreshCw, MessageCircle, Bot, Lightbulb, AlertCircle, Trophy, ListChecks, Loader2, StickyNote, Wand2, ChevronDown, ChevronUp, Save } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Coach, CoachAvailability, Booking, UserProfile, Questionnaire, SessionNote } from "@shared/schema";

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Tab = "bookings" | "profile" | "availability" | "patients";

interface PatientData {
  userId: string;
  profile: UserProfile | null;
  questionnaire: Questionnaire | null;
  bookings: Booking[];
  assistantInteractions?: {
    messageCount: number;
    summary: string | null;
    assistantName: string | null;
  };
}

export default function CoachDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("bookings");
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);

  const { data: coach, isLoading: coachLoading } = useQuery<Coach>({
    queryKey: ["/api/coach/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: availability } = useQuery<CoachAvailability[]>({
    queryKey: ["/api/coach/availability"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: patients } = useQuery<PatientData[]>({
    queryKey: ["/api/coach/patients"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  if (coachLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary/20 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "bookings", label: "Booking Requests", icon: CalendarCheck },
    { id: "patients", label: "My Patients", icon: Users },
    { id: "availability", label: "Availability", icon: Calendar },
    { id: "profile", label: "My Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-bold">MeFirst</span>
            <Badge variant="secondary" className="ml-2">Coach</Badge>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline" data-testid="text-coach-name">
                {coach?.name || user?.firstName}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <motion.div initial="hidden" animate="visible" className="space-y-6">
          <motion.div variants={fadeUp} custom={0} className="flex items-center gap-2 border-b pb-4 overflow-x-auto">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => { setActiveTab(tab.id); setSelectedPatient(null); }}
                className="gap-2 flex-shrink-0"
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Button>
            ))}
          </motion.div>

          {activeTab === "bookings" && coach && <BookingsTab coachId={coach.id} />}
          {activeTab === "profile" && coach && <CoachProfileTab coach={coach} />}
          {activeTab === "availability" && coach && <AvailabilityTab coachId={coach.id} availability={availability || []} />}
          {activeTab === "patients" && (
            selectedPatient ? (
              <PatientDetailView patient={selectedPatient} onBack={() => setSelectedPatient(null)} />
            ) : (
              <PatientsTab patients={patients || []} onSelectPatient={setSelectedPatient} />
            )
          )}
        </motion.div>
      </div>
    </div>
  );
}

function GoogleCalendarCard() {
  const { toast } = useToast();

  const { data: googleStatus, isLoading: statusLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/coach/google-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const connectGoogle = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/auth/google");
      const data = await res.json();
      window.open(data.url, "_blank", "width=500,height=600");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start Google sign-in", variant: "destructive" });
    },
  });

  const disconnectGoogle = useMutation({
    mutationFn: () => apiRequest("POST", "/api/coach/google-disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/google-status"] });
      toast({ title: "Google Calendar disconnected" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to disconnect", variant: "destructive" });
    },
  });

  const connected = googleStatus?.connected;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-md flex items-center justify-center ${connected ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
            <Calendar className={`w-5 h-5 ${connected ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold">Google Calendar</p>
            <p className="text-xs text-muted-foreground">
              {statusLoading ? "Checking..." : connected ? "Connected — events are created automatically" : "Connect to auto-create meetings with Google Meet"}
            </p>
          </div>
        </div>
        {connected ? (
          <Badge variant="secondary" className="text-xs gap-1 text-green-600 dark:text-green-400">
            <Link className="w-3 h-3" /> Connected
          </Badge>
        ) : null}
      </div>

      {connected ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => disconnectGoogle.mutate()}
          disabled={disconnectGoogle.isPending}
          className="gap-2 text-destructive hover:text-destructive"
          data-testid="button-disconnect-google"
        >
          <Unlink className="w-3.5 h-3.5" />
          {disconnectGoogle.isPending ? "Disconnecting..." : "Disconnect"}
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => connectGoogle.mutate()}
          disabled={connectGoogle.isPending || statusLoading}
          className="gap-2"
          data-testid="button-connect-google"
        >
          <Link className="w-3.5 h-3.5" />
          {connectGoogle.isPending ? "Opening..." : "Connect Google Calendar"}
        </Button>
      )}
    </Card>
  );
}

const ANALYSIS_FIELDS = [
  { key: "dateAndName", label: "Date & Client", icon: Calendar },
  { key: "clientCommitmentFromPreviousSession", label: "Previous Commitment", icon: ListChecks },
  { key: "clientAgendaForThisSession", label: "Session Agenda", icon: FileText },
  { key: "connectAndReview", label: "Connect & Review", icon: MessageCircle },
  { key: "toolsAndTechniques", label: "Tools & Techniques", icon: Wand2 },
  { key: "opportunities", label: "Opportunities", icon: Lightbulb },
  { key: "challenges", label: "Challenges", icon: AlertCircle },
  { key: "accountability", label: "Accountability", icon: Check },
  { key: "support", label: "Support", icon: Users },
  { key: "clientCommitmentForNextSession", label: "Next Session Commitment", icon: ChevronRight },
  { key: "reviewEvaluation", label: "Review & Evaluation", icon: Trophy },
  { key: "generalProgressNotes", label: "Progress Notes", icon: StickyNote },
] as const;

function SessionNotesSection({ bookingId, autoOpen = false, sessionCompleted = false }: { bookingId: string; autoOpen?: boolean; sessionCompleted?: boolean }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [content, setContent] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);

  const { data: notesData, isLoading } = useQuery<{ note: SessionNote | null; analysisAllowed: boolean }>({
    queryKey: ["/api/coach/bookings", bookingId, "notes"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isOpen,
  });

  const note = notesData?.note || null;
  const analysisAllowed = notesData?.analysisAllowed ?? true;

  useEffect(() => {
    if (note && !hasLoaded) {
      setContent(note.content || "");
      setHasLoaded(true);
    }
  }, [note, hasLoaded]);

  const saveNotes = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/coach/bookings/${bookingId}/notes`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/bookings", bookingId, "notes"] });
      toast({ title: "Notes saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save notes", variant: "destructive" });
    },
  });

  const summarize = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/coach/bookings/${bookingId}/notes/summarize`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/bookings", bookingId, "notes"] });
      toast({ title: "Session analysis complete", description: "AI has analyzed your notes and updated the patient's values wheel." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to analyze session notes", variant: "destructive" });
    },
  });

  const parsedAnalysis = note?.aiSummary ? (() => {
    try { return JSON.parse(note.aiSummary); } catch { return null; }
  })() : null;

  return (
    <div className="border-t pt-3 mt-3">
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen && !hasLoaded) setHasLoaded(false); }}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
        data-testid={`button-toggle-notes-${bookingId}`}
      >
        <StickyNote className="w-3.5 h-3.5" />
        Session Notes
        {note?.content && !parsedAnalysis && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Saved</Badge>}
        {parsedAnalysis && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Analyzed</Badge>}
        {isOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading notes...
            </div>
          ) : (
            <>
              {!parsedAnalysis && (
                <div className={`rounded-md p-3 ${!analysisAllowed ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"}`}>
                  <p className={`text-xs ${!analysisAllowed ? "text-amber-800 dark:text-amber-300" : "text-blue-800 dark:text-blue-300"}`}>
                    {!analysisAllowed
                      ? "This patient has not consented to session recording and AI analysis. You can still save manual notes, but AI-powered analysis is not available."
                      : sessionCompleted
                        ? "Upload your session notes below. The AI will analyze them to generate a structured coaching report and update the patient's values wheel."
                        : "You can save draft notes now. Mark the session as completed to unlock AI analysis."}
                  </p>
                </div>
              )}

              <Textarea
                placeholder="Paste or type your session notes here — include what was discussed, client progress, commitments made, any tools used, and observations..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] text-sm"
                data-testid={`textarea-notes-${bookingId}`}
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveNotes.mutate()}
                  disabled={saveNotes.isPending || !content.trim()}
                  className="gap-1"
                  data-testid={`button-save-notes-${bookingId}`}
                >
                  {saveNotes.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save Draft
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (content.trim() && (!note?.content || note.content !== content)) {
                      await apiRequest("POST", `/api/coach/bookings/${bookingId}/notes`, { content });
                      queryClient.invalidateQueries({ queryKey: ["/api/coach/bookings", bookingId, "notes"] });
                    }
                    summarize.mutate();
                  }}
                  disabled={summarize.isPending || !content.trim() || !sessionCompleted || !analysisAllowed}
                  className="gap-1"
                  title={!analysisAllowed ? "Patient has not consented to AI analysis" : !sessionCompleted ? "Mark session as completed first" : ""}
                  data-testid={`button-analyze-notes-${bookingId}`}
                >
                  {summarize.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {summarize.isPending ? "Analyzing..." : "Analyze & Update Values Wheel"}
                </Button>
              </div>

              {parsedAnalysis && (
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 space-y-4">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" /> Coaching Session Report
                  </p>

                  <div className="grid gap-3">
                    {ANALYSIS_FIELDS.map(({ key, label, icon: Icon }) => {
                      const value = parsedAnalysis[key];
                      if (!value || value === "Not specified") return null;
                      return (
                        <div key={key} className="space-y-0.5" data-testid={`analysis-${key}-${bookingId}`}>
                          <p className="text-xs font-medium flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            {label}
                          </p>
                          <p className="text-xs text-muted-foreground pl-5">{value}</p>
                        </div>
                      );
                    })}
                  </div>

                  {parsedAnalysis.valuesWheelSuggestions && (
                    <div className="border-t pt-3 mt-3">
                      <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
                        <Trophy className="w-3.5 h-3.5 text-primary" />
                        Values Wheel Updated
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(parsedAnalysis.valuesWheelSuggestions as Record<string, number>).map(([key, val]) => (
                          <Badge key={key} variant="outline" className="text-[10px] gap-1">
                            {key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}: {val}/10
                          </Badge>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Patient's values wheel has been updated based on this session's discussion.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BookingsTab({ coachId }: { coachId: string }) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"pending" | "approved" | "completed" | "declined" | "reschedule_requested" | "all">("pending");
  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null);
  const [rescheduleMessage, setRescheduleMessage] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState("");

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/coach/bookings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const updateBooking = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/coach/bookings/${id}`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/patients"] });
      const titles: Record<string, string> = { approved: "Booking approved", declined: "Booking declined", completed: "Session completed" };
      const descriptions: Record<string, string> = { approved: "A calendar invite has been sent.", declined: "The booking request was declined.", completed: "You can now add session notes." };
      toast({
        title: titles[variables.status] || "Booking updated",
        description: descriptions[variables.status] || "",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update booking", variant: "destructive" });
    },
  });

  const requestReschedule = useMutation({
    mutationFn: async ({ bookingId, message, scheduledAt }: { bookingId: string; message: string; scheduledAt?: string }) => {
      await apiRequest("POST", `/api/bookings/${bookingId}/reschedule`, { message, scheduledAt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/bookings"] });
      setRescheduleBookingId(null);
      setRescheduleMessage("");
      setRescheduleDate(null);
      setRescheduleTime("");
      toast({ title: "Reschedule requested", description: "The patient will be notified." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to request reschedule", variant: "destructive" });
    },
  });

  const filtered = (bookings || []).filter(b => filter === "all" || b.status === filter);
  const pendingCount = (bookings || []).filter(b => b.status === "pending").length;
  const rescheduleCount = (bookings || []).filter(b => b.status === "reschedule_requested").length;
  const actionCount = pendingCount + rescheduleCount;

  const completedCount = (bookings || []).filter(b => b.status === "completed").length;

  const filterLabels: Record<string, string> = {
    pending: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}`,
    reschedule_requested: `Reschedule${rescheduleCount > 0 ? ` (${rescheduleCount})` : ""}`,
    approved: "Upcoming",
    completed: `Completed${completedCount > 0 ? ` (${completedCount})` : ""}`,
    declined: "Declined",
    all: "All",
  };

  return (
    <motion.div variants={fadeUp} custom={1} className="max-w-3xl space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold">Sessions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage sessions and add notes after completion. {actionCount > 0 && `${actionCount} need attention.`}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["pending", "reschedule_requested", "approved", "completed", "declined", "all"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter(f)}
            data-testid={`filter-${f}`}
          >
            {filterLabels[f]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded-md w-32" />
                  <div className="h-3 bg-muted rounded-md w-48" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarCheck className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-1">No {filter === "all" ? "" : filter === "reschedule_requested" ? "reschedule" : filter} bookings</p>
          <p className="text-xs text-muted-foreground">
            {filter === "pending" ? "New booking requests will appear here." : "Try a different filter."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => (
            <Card key={booking.id} className="p-5 space-y-3" data-testid={`card-booking-${booking.id}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-sm font-medium">Patient</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span>
                        {new Date(booking.scheduledAt).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {booking.notes && (
                      <p className="text-xs text-muted-foreground italic">"{booking.notes}"</p>
                    )}
                    {booking.meetLink && booking.status === "approved" && (
                      <a
                        href={booking.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        data-testid={`link-meet-${booking.id}`}
                      >
                        <Link className="w-3 h-3" /> Google Meet
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {booking.status === "pending" || (booking.status === "reschedule_requested" && booking.rescheduleRequestedBy === "patient") ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateBooking.mutate({ id: booking.id, status: "approved" })}
                        disabled={updateBooking.isPending}
                        className="gap-1"
                        data-testid={`button-approve-${booking.id}`}
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateBooking.mutate({ id: booking.id, status: "declined" })}
                        disabled={updateBooking.isPending}
                        className="gap-1 text-destructive hover:text-destructive"
                        data-testid={`button-decline-${booking.id}`}
                      >
                        <X className="w-3.5 h-3.5" /> Decline
                      </Button>
                    </>
                  ) : booking.status === "reschedule_requested" && booking.rescheduleRequestedBy === "coach" ? (
                    <Badge variant="outline" data-testid={`badge-status-${booking.id}`}>
                      Awaiting Patient
                    </Badge>
                  ) : booking.status === "approved" ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setRescheduleBookingId(booking.id); setRescheduleMessage(""); setRescheduleDate(null); setRescheduleTime(""); }}
                        className="gap-1 text-xs"
                        data-testid={`button-reschedule-${booking.id}`}
                      >
                        <RefreshCw className="w-3 h-3" /> Reschedule
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateBooking.mutate({ id: booking.id, status: "completed" })}
                        disabled={updateBooking.isPending}
                        className="gap-1"
                        data-testid={`button-complete-${booking.id}`}
                      >
                        <Check className="w-3.5 h-3.5" /> Complete
                      </Button>
                    </div>
                  ) : booking.status === "completed" ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" data-testid={`badge-status-${booking.id}`}>
                      <Check className="w-3 h-3 mr-1" /> Completed
                    </Badge>
                  ) : (
                    <Badge variant="destructive" data-testid={`badge-status-${booking.id}`}>
                      Declined
                    </Badge>
                  )}
                </div>
              </div>

              {booking.status === "reschedule_requested" && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                    <RefreshCw className="w-3 h-3" />
                    {booking.rescheduleRequestedBy === "patient" ? "Patient" : "You"} requested a reschedule
                  </p>
                  {booking.rescheduleMessage && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 italic">"{booking.rescheduleMessage}"</p>
                  )}
                </div>
              )}

              {(booking.status === "completed" || booking.status === "approved") && (
                <SessionNotesSection bookingId={booking.id} autoOpen={booking.status === "completed"} sessionCompleted={booking.status === "completed"} />
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!rescheduleBookingId} onOpenChange={(open) => { if (!open) { setRescheduleBookingId(null); setRescheduleMessage(""); setRescheduleDate(null); setRescheduleTime(""); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Reschedule</DialogTitle>
            <DialogDescription>
              Choose a new date and time, and optionally leave a message for the patient.
            </DialogDescription>
          </DialogHeader>
          <ReschedulePicker
            coachId={coachId}
            message={rescheduleMessage}
            onMessageChange={setRescheduleMessage}
            selectedDate={rescheduleDate}
            onDateChange={setRescheduleDate}
            selectedTime={rescheduleTime}
            onTimeChange={setRescheduleTime}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRescheduleBookingId(null); setRescheduleMessage(""); setRescheduleDate(null); setRescheduleTime(""); }} data-testid="button-cancel-coach-reschedule">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!rescheduleBookingId || !rescheduleDate || !rescheduleTime) return;
                const scheduledAt = parseTimeToDate(rescheduleDate, rescheduleTime).toISOString();
                requestReschedule.mutate({ bookingId: rescheduleBookingId, message: rescheduleMessage, scheduledAt });
              }}
              disabled={requestReschedule.isPending || !rescheduleDate || !rescheduleTime}
              data-testid="button-confirm-coach-reschedule"
            >
              {requestReschedule.isPending ? "Sending..." : "Request Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

const specialtyOptions = [
  { id: "fitness", label: "Fitness consistency" },
  { id: "productivity", label: "Productivity & focus" },
  { id: "sleep", label: "Sleep optimization" },
  { id: "stress", label: "Stress & burnout" },
];

const experienceOptions = [
  { id: "0-1", label: "0\u20131 years" },
  { id: "2-4", label: "2\u20134 years" },
  { id: "5-8", label: "5\u20138 years" },
  { id: "8+", label: "8+ years" },
];

const certificationOptions = [
  { id: "icf", label: "ICF (ACC / PCC / MCC)" },
  { id: "nbhwc", label: "NBHWC" },
  { id: "nasm", label: "NASM / Fitness-related" },
  { id: "licensed", label: "Licensed healthcare professional" },
  { id: "other", label: "Other certification" },
  { id: "none", label: "Not certified" },
];

const sessionStyleOptions = [
  { id: "structured", label: "Highly structured with clear action steps" },
  { id: "conversational", label: "Conversational and reflective" },
  { id: "balanced", label: "Balanced between structure and exploration" },
];

const clientTypeOptions = [
  { id: "early-career", label: "Early-career professionals" },
  { id: "healthcare", label: "Healthcare workers" },
  { id: "founders", label: "Founders / high performers" },
  { id: "rebuilding", label: "People rebuilding consistency" },
  { id: "open", label: "Open to all" },
];

const sessionStyleToDbStyle: Record<string, string> = {
  structured: "structured",
  conversational: "gentle",
  balanced: "direct",
};

const dbStyleToSessionStyle: Record<string, string> = {
  structured: "structured",
  gentle: "conversational",
  direct: "balanced",
};

function MultiSelectChips({
  options,
  selected,
  onToggle,
  testIdPrefix,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-border text-muted-foreground"
            }`}
            data-testid={`${testIdPrefix}-${opt.id}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function CoachProfileTab({ coach }: { coach: Coach }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showResetDialog, setShowResetDialog] = useState(false);

  const onboardingData = (coach.onboardingData || {}) as Record<string, any>;

  const [name, setName] = useState(coach.name);
  const [title, setTitle] = useState(coach.title);
  const [bio, setBio] = useState(coach.bio || "");
  const [superpower, setSuperpower] = useState(coach.superpower || "");
  const [maxClients, setMaxClients] = useState(String(coach.maxClients || 10));
  const [specialties, setSpecialties] = useState<string[]>(coach.specialties || []);
  const [sessionStyle, setSessionStyle] = useState(onboardingData.sessionStyle || dbStyleToSessionStyle[coach.style] || "balanced");
  const [experience, setExperience] = useState<string>(onboardingData.experience || "");
  const [certifications, setCertifications] = useState<string[]>(onboardingData.certifications || []);
  const [clientTypes, setClientTypes] = useState<string[]>(onboardingData.clientTypes || []);

  const toggleItem = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      const style = sessionStyleToDbStyle[sessionStyle] || "direct";
      await apiRequest("PATCH", "/api/coach/me", {
        name,
        title,
        bio,
        style,
        specialties,
        superpower,
        maxClients: parseInt(maxClients) || 10,
        onboardingData: {
          ...onboardingData,
          experience,
          certifications,
          sessionStyle,
          clientTypes,
          superpower,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/me"] });
      toast({ title: "Profile updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    },
  });

  const resetCoach = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/coach/reset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/bookings"] });
      toast({ title: "Coach profile reset", description: "Your account has been reset to patient mode." });
      setLocation("/");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reset coach profile", variant: "destructive" });
    },
  });

  return (
    <motion.div variants={fadeUp} custom={1} className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold">Your Coach Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">This is what patients see when browsing coaches.</p>
      </div>

      <GoogleCalendarCard />

      <Card className="p-6 space-y-6">
        <h3 className="text-base font-semibold">Basic Information</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-coach-name" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Professional Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Wellness & Mindfulness Coach" data-testid="input-coach-title" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Bio</label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell patients about your approach and experience..." className="resize-none min-h-[100px]" data-testid="input-coach-bio" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Your Superpower</label>
          <Textarea value={superpower} onChange={(e) => setSuperpower(e.target.value)} placeholder="What makes you unique as a coach?" className="resize-none min-h-[80px]" data-testid="input-coach-superpower" />
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <h3 className="text-base font-semibold">Expertise & Credentials</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">Primary Specialties</label>
          <MultiSelectChips
            options={specialtyOptions}
            selected={specialties}
            onToggle={(id) => toggleItem(specialties, setSpecialties, id)}
            testIdPrefix="chip-specialty"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Years of Experience</label>
          <Select value={experience} onValueChange={setExperience}>
            <SelectTrigger data-testid="select-experience">
              <SelectValue placeholder="Select experience level" />
            </SelectTrigger>
            <SelectContent>
              {experienceOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Certifications</label>
          <MultiSelectChips
            options={certificationOptions}
            selected={certifications}
            onToggle={(id) => toggleItem(certifications, setCertifications, id)}
            testIdPrefix="chip-cert"
          />
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <h3 className="text-base font-semibold">Coaching Preferences</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">Session Style</label>
          <Select value={sessionStyle} onValueChange={setSessionStyle}>
            <SelectTrigger data-testid="select-session-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sessionStyleOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Preferred Client Types</label>
          <MultiSelectChips
            options={clientTypeOptions}
            selected={clientTypes}
            onToggle={(id) => toggleItem(clientTypes, setClientTypes, id)}
            testIdPrefix="chip-client"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Maximum Clients</label>
          <Input
            type="number"
            min={1}
            max={100}
            value={maxClients}
            onChange={(e) => setMaxClients(e.target.value)}
            data-testid="input-max-clients"
          />
          <p className="text-xs text-muted-foreground">How many clients you can take on at a time</p>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="px-8" data-testid="button-save-profile">
          {updateProfile.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>

      <Card className="p-6 space-y-4 border-destructive/50">
        <div>
          <h3 className="text-lg font-semibold text-destructive">Reset Coach Profile</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This will cancel all your existing appointments, remove your availability, disconnect Google Calendar, and reset your account to patient mode.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setShowResetDialog(true)} data-testid="button-reset-profile">
          Reset Profile
        </Button>
      </Card>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your bookings will be cancelled and patients will be notified. Your coach profile will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => resetCoach.mutate()}
              disabled={resetCoach.isPending}
              data-testid="button-confirm-reset"
            >
              {resetCoach.isPending ? "Resetting..." : "Reset Everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function AvailabilityTab({ coachId, availability }: { coachId: string; availability: CoachAvailability[] }) {
  const { toast } = useToast();
  const [newDay, setNewDay] = useState("1");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");

  const addSlot = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/coach/availability", {
        dayOfWeek: parseInt(newDay),
        startTime: newStart,
        endTime: newEnd,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/availability"] });
      toast({ title: "Availability added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add slot", variant: "destructive" });
    },
  });

  const removeSlot = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/coach/availability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/availability"] });
      toast({ title: "Slot removed" });
    },
  });

  const sortedAvailability = [...availability].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));

  return (
    <motion.div variants={fadeUp} custom={1} className="max-w-2xl space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold">Your Availability</h2>
        <p className="text-sm text-muted-foreground mt-1">Set your weekly recurring availability for patient bookings.</p>
      </div>

      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold">Add Time Slot</h3>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Day</label>
            <Select value={newDay} onValueChange={setNewDay}>
              <SelectTrigger className="w-[150px]" data-testid="select-avail-day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dayNames.map((d, i) => (
                  <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Start</label>
            <Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="w-[130px]" data-testid="input-avail-start" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">End</label>
            <Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="w-[130px]" data-testid="input-avail-end" />
          </div>
          <Button onClick={() => addSlot.mutate()} disabled={addSlot.isPending} size="sm" className="gap-1" data-testid="button-add-slot">
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Current Schedule</h3>
        {sortedAvailability.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No availability set yet. Add time slots above.</p>
          </Card>
        ) : (
          sortedAvailability.map((slot) => (
            <Card key={slot.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{dayNames[slot.dayOfWeek]}</p>
                    <p className="text-xs text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSlot.mutate(slot.id)}
                  disabled={removeSlot.isPending}
                  data-testid={`button-remove-slot-${slot.id}`}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </motion.div>
  );
}

function PatientsTab({ patients, onSelectPatient }: { patients: PatientData[]; onSelectPatient: (p: PatientData) => void }) {
  return (
    <motion.div variants={fadeUp} custom={1} className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold">Your Patients</h2>
        <p className="text-sm text-muted-foreground mt-1">Patients who have booked sessions with you.</p>
      </div>

      {patients.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-1">No patients yet</p>
          <p className="text-xs text-muted-foreground">When patients book sessions with you, they'll appear here.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((patient) => {
            const latestBooking = patient.bookings[0];
            return (
              <Card
                key={patient.userId}
                className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => onSelectPatient(patient)}
                data-testid={`card-patient-${patient.userId}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">Patient</p>
                        <p className="text-xs text-muted-foreground truncate">{patient.userId.slice(0, 12)}...</p>
                      </div>
                    </div>
                    {patient.profile?.highLevelGoal && (
                      <Badge variant="secondary" className="text-xs capitalize">{patient.profile.highLevelGoal}</Badge>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {patient.bookings.length} session{patient.bookings.length !== 1 ? "s" : ""}
                      </span>
                      {patient.assistantInteractions && patient.assistantInteractions.messageCount > 0 && (
                        <span className="flex items-center gap-1" data-testid={`text-ai-count-${patient.userId}`}>
                          <MessageCircle className="w-3 h-3" />
                          {patient.assistantInteractions.messageCount} AI msgs
                        </span>
                      )}
                    </div>
                    {patient.assistantInteractions?.assistantName && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Bot className="w-3 h-3" />
                        <span>{patient.assistantInteractions.assistantName}</span>
                      </div>
                    )}
                    {latestBooking && (
                      <p className="text-xs text-muted-foreground">
                        Next: {new Date(latestBooking.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-2" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

interface CoachInsights {
  keyTopics: string[];
  emotionalTone: string;
  concerns: string[];
  wins: string[];
  actionItems: string[];
  suggestedTalkingPoints: string[];
  overallProgress: string;
}

function SessionPrepInsights({ patientUserId, hasConversation }: { patientUserId: string; hasConversation: boolean }) {
  const { toast } = useToast();
  const [insights, setInsights] = useState<CoachInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest("GET", `/api/coach/patients/${patientUserId}/insights`);
      const data = await res.json();
      setInsights(data);
    } catch {
      toast({ title: "Error", description: "Failed to generate session insights", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasConversation) {
    return null;
  }

  const hasContent = insights && (
    insights.keyTopics.length > 0 ||
    insights.concerns.length > 0 ||
    insights.wins.length > 0 ||
    insights.actionItems.length > 0 ||
    insights.suggestedTalkingPoints.length > 0
  );

  return (
    <Card className="p-5 space-y-4 border-primary/20 bg-primary/[0.02]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" /> Session Prep Insights
        </h3>
        <Button
          variant={insights ? "ghost" : "default"}
          size="sm"
          onClick={generateInsights}
          disabled={isLoading}
          className="gap-1.5"
          data-testid="button-generate-insights"
        >
          {isLoading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
          ) : insights ? (
            <><RefreshCw className="w-3.5 h-3.5" /> Refresh</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Generate Insights</>
          )}
        </Button>
      </div>

      {!insights && !isLoading && (
        <p className="text-xs text-muted-foreground">
          Generate AI-powered insights from this patient's assistant conversations to help you prepare for your next 1:1 session.
        </p>
      )}

      {hasContent && (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1.5">Overall Progress</p>
            <p className="text-sm leading-relaxed" data-testid="text-overall-progress">{insights.overallProgress}</p>
          </div>

          {insights.emotionalTone && insights.emotionalTone !== "No data yet" && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1.5">Emotional Tone</p>
              <p className="text-sm leading-relaxed" data-testid="text-emotional-tone">{insights.emotionalTone}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {insights.concerns.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Concerns
                </p>
                <ul className="space-y-1" data-testid="list-concerns">
                  {insights.concerns.map((c, i) => (
                    <li key={i} className="text-xs leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-400">{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {insights.wins.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Wins & Progress
                </p>
                <ul className="space-y-1" data-testid="list-wins">
                  {insights.wins.map((w, i) => (
                    <li key={i} className="text-xs leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-green-400">{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {insights.actionItems.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <ListChecks className="w-3 h-3" /> Action Items
              </p>
              <ul className="space-y-1" data-testid="list-action-items">
                {insights.actionItems.map((a, i) => (
                  <li key={i} className="text-xs leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-primary">{a}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.suggestedTalkingPoints.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t">
              <p className="text-xs font-semibold flex items-center gap-1 text-primary">
                <MessageCircle className="w-3 h-3" /> Suggested Talking Points for Next Session
              </p>
              <ul className="space-y-1.5" data-testid="list-talking-points">
                {insights.suggestedTalkingPoints.map((t, i) => (
                  <li key={i} className="text-sm leading-relaxed pl-4 relative before:content-['\u2192'] before:absolute before:left-0 before:text-primary">{t}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.keyTopics.length > 0 && (
            <div className="flex gap-1.5 flex-wrap pt-1">
              {insights.keyTopics.map((topic, i) => (
                <Badge key={i} variant="secondary" className="text-xs" data-testid={`badge-topic-${i}`}>{topic}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function PatientDetailView({ patient, onBack }: { patient: PatientData; onBack: () => void }) {
  const answers = (patient.questionnaire?.answers || {}) as Record<string, string>;

  const questionLabels: Record<string, string> = {
    lifeAccomplishments: "What accomplishments or events must occur for a satisfying life?",
    secretPassion: "Secret passion in life?",
    whatsMissing: "What's missing for more fulfillment?",
    stressResponse: "What do you do when stressed?",
    healthChallenges: "Health challenges?",
    typicalWeek: "Typical week (fitness/diet/work)?",
    therapyHistory: "Therapy / mental health services?",
    bringsJoy: "What brings joy?",
    twoSmallSteps: "Two small steps for greatest difference?",
    age: "Age",
    profession: "Profession",
  };

  return (
    <motion.div variants={fadeUp} custom={1} className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2" data-testid="button-back-patients">
        <ChevronLeft className="w-4 h-4" /> Back to Patients
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-bold">Patient Overview</h2>

          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Patient</p>
                <p className="text-xs text-muted-foreground font-mono">{patient.userId.slice(0, 16)}...</p>
              </div>
            </div>

            {patient.profile && (
              <div className="space-y-3 pt-2 border-t">
                {patient.profile.highLevelGoal && (
                  <div>
                    <p className="text-xs text-muted-foreground">Primary Goal</p>
                    <p className="text-sm font-medium capitalize">{patient.profile.highLevelGoal}</p>
                  </div>
                )}
                {patient.profile.motivation && (
                  <div>
                    <p className="text-xs text-muted-foreground">Motivation</p>
                    <p className="text-sm italic text-muted-foreground">"{patient.profile.motivation}"</p>
                  </div>
                )}
                {patient.profile.coachStyle && (
                  <div>
                    <p className="text-xs text-muted-foreground">Preferred Style</p>
                    <p className="text-sm capitalize">{patient.profile.coachStyle}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {patient.assistantInteractions && patient.assistantInteractions.messageCount > 0 && (
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" /> AI Assistant Activity
              </h3>
              <div className="flex items-center gap-4 text-sm">
                {patient.assistantInteractions.assistantName && (
                  <span className="text-muted-foreground">{patient.assistantInteractions.assistantName}</span>
                )}
                <span className="text-muted-foreground" data-testid="text-detail-ai-count">{patient.assistantInteractions.messageCount} messages</span>
              </div>
              {patient.assistantInteractions.summary && (
                <div>
                  <p className="text-xs text-muted-foreground">Latest Summary</p>
                  <p className="text-sm leading-relaxed text-muted-foreground" data-testid="text-ai-summary">{patient.assistantInteractions.summary}</p>
                </div>
              )}
            </Card>
          )}

          <SessionPrepInsights patientUserId={patient.userId} hasConversation={(patient.assistantInteractions?.messageCount || 0) > 0} />

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Session History ({patient.bookings.length})
            </h3>
            {patient.bookings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No sessions booked</p>
            ) : (
              <div className="space-y-3">
                {[...patient.bookings]
                  .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                  .map((b) => (
                  <div key={b.id} className="border rounded-lg p-3 space-y-2" data-testid={`patient-session-${b.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(b.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                      <Badge
                        variant={b.status === "completed" ? "secondary" : b.status === "approved" ? "default" : "outline"}
                        className={`text-xs ${b.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}`}
                      >
                        {b.status === "completed" ? "✓ Completed" : b.status === "approved" ? "Upcoming" : b.status}
                      </Badge>
                    </div>
                    {(b.status === "completed" || b.status === "approved") && (
                      <SessionNotesSection
                        bookingId={b.id}
                        autoOpen={false}
                        sessionCompleted={b.status === "completed"}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-serif text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Questionnaire Responses
          </h2>

          {!patient.questionnaire ? (
            <Card className="p-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">This patient hasn't completed their questionnaire yet.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {patient.questionnaire.goalMotivation && patient.questionnaire.goalMotivation.length > 0 && (
                <Card className="p-5 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">This goal is...</p>
                  <div className="flex gap-2 flex-wrap">
                    {patient.questionnaire.goalMotivation.map((m) => (
                      <Badge key={m} variant="secondary" className="capitalize">{m === "self" ? "Something they want" : m === "should" ? "Something they feel they should do" : "Something others expect"}</Badge>
                    ))}
                  </div>
                </Card>
              )}

              {patient.questionnaire.successVision && (
                <Card className="p-5 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Success in 6-10 weeks</p>
                  <p className="text-sm leading-relaxed">{patient.questionnaire.successVision}</p>
                </Card>
              )}

              {Object.keys(answers).length > 0 && (
                <Card className="p-5 space-y-4">
                  <p className="text-xs text-muted-foreground font-medium">About this patient</p>
                  {Object.entries(answers).map(([key, value]) => {
                    if (!value) return null;
                    return (
                      <div key={key} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{questionLabels[key] || key}</p>
                        <p className="text-sm leading-relaxed">{value}</p>
                      </div>
                    );
                  })}
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
