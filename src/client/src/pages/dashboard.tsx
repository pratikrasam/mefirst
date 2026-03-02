import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, LogOut, CalendarCheck, TrendingUp, Heart, Brain, Target, ArrowRight, Clock, Star, RotateCcw, RefreshCw, Check, X, MessageCircle, Bell, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import type { UserProfile, Booking, Coach, ProgressEntry } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ReschedulePicker, parseTimeToDate } from "@/components/reschedule-picker";
import { ValuesWheelProgress, type ValuesRatings } from "@/components/values-wheel";

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null);
  const [rescheduleCoachId, setRescheduleCoachId] = useState<string>("");
  const [rescheduleMessage, setRescheduleMessage] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const { toast } = useToast();

  const rescheduleMutation = useMutation({
    mutationFn: async ({ bookingId, message, scheduledAt }: { bookingId: string; message: string; scheduledAt?: string }) => {
      await apiRequest("POST", `/api/bookings/${bookingId}/reschedule`, { message, scheduledAt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setRescheduleBookingId(null);
      setRescheduleCoachId("");
      setRescheduleMessage("");
      setRescheduleDate(null);
      setRescheduleTime("");
      toast({ title: "Reschedule requested", description: "Your coach will be notified." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to request reschedule.", variant: "destructive" });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      await apiRequest("PATCH", `/api/bookings/${bookingId}/respond`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: variables.status === "approved" ? "Reschedule approved" : "Reschedule declined",
        description: variables.status === "approved" ? "The session has been rescheduled." : "The reschedule request was declined.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to respond to reschedule.", variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/profile/reset"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaire"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      setShowResetDialog(false);
      toast({ title: "Data reset", description: "Your profile has been reset. You can now start the questionnaire again." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reset your data. Please try again.", variant: "destructive" });
    },
  });

  const { data: profile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: coaches } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: progressEntries } = useQuery<ProgressEntry[]>({
    queryKey: ["/api/progress"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const valuesWheelMutation = useMutation({
    mutationFn: async (ratings: ValuesRatings) => {
      await apiRequest("POST", "/api/profile/values-wheel", { ratings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Values wheel updated", description: "Your progress has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update values wheel.", variant: "destructive" });
    },
  });

  const valuesWheelData = profile?.valuesWheel as { current: ValuesRatings; history: Array<{ ratings: ValuesRatings; date: string }>; updatedAt: string } | null;

  const activeBookings = (bookings || []).filter(b => b.status === "pending" || b.status === "approved" || b.status === "reschedule_requested" || b.status === "completed");
  const upcomingBookings = activeBookings;
  const matchedCoach = coaches?.find(c => activeBookings.some(b => b.coachId === c.id));
  const recentProgress = (progressEntries || []).slice(0, 5);
  const avgMood = recentProgress.length > 0
    ? Math.round(recentProgress.reduce((s, e) => s + (e.mood || 0), 0) / recentProgress.length)
    : 0;

  const sessionWithin48h = useMemo(() => {
    if (!bookings) return null;
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const upcoming = bookings
      .filter((b) => (b.status === "approved" || b.status === "pending") && new Date(b.scheduledAt) >= now && new Date(b.scheduledAt) <= in48h)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    return upcoming[0] || null;
  }, [bookings]);

  const sessionReminderCoach = sessionWithin48h ? coaches?.find(c => c.id === sessionWithin48h.coachId) : null;

  const formatTimeUntilSession = (scheduledAt: string | Date) => {
    const now = new Date();
    const session = new Date(scheduledAt);
    const diffMs = session.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours >= 24) {
      const days = Math.floor(diffHours / 24);
      return `in ${days} day${days > 1 ? "s" : ""}`;
    }
    if (diffHours > 0) return `in ${diffHours}h ${diffMins}m`;
    return `in ${diffMins} minutes`;
  };

  const isCoachSignup = typeof window !== "undefined" && localStorage.getItem("mefirst-coach-intent") === "true";
  if (isCoachSignup && profile?.role !== "coach") {
    localStorage.removeItem("mefirst-coach-intent");
    setLocation("/coach-register");
    return null;
  }
  if (isCoachSignup && profile?.role === "coach") {
    localStorage.removeItem("mefirst-coach-intent");
  }

  if (profile?.onboardingCompleted && !profile?.consentHipaa) {
    setLocation("/consent");
    return null;
  }

  if (!profile?.onboardingCompleted) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-serif text-xl font-bold">MeFirst</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-6 py-20 text-center space-y-8">
          <motion.div initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={fadeUp} custom={0}>
              <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
            </motion.div>
            <motion.h1 variants={fadeUp} custom={1} className="font-serif text-3xl font-bold">
              Welcome{user?.firstName ? `, ${user.firstName}` : ""}!
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-md mx-auto">
              Let's set up your wellness profile so we can match you with the perfect coach. It only takes a few minutes.
            </motion.p>
            <motion.div variants={fadeUp} custom={3}>
              <Button size="lg" onClick={() => setLocation("/onboarding")} data-testid="button-start-onboarding" className="gap-2">
                Begin Setup <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-bold">MeFirst</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => setLocation("/profile")} className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="button-profile-link">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {(profile?.displayName?.[0] || user?.firstName?.[0] || "")}{user?.lastName?.[0] || ""}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline" data-testid="text-user-name">
                {profile?.displayName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Patient"}
              </span>
            </button>
            <Button variant="ghost" size="icon" onClick={() => setLocation("/profile")} title="Profile & Settings" data-testid="button-settings">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLocation("/assistant")} className="gap-1.5" data-testid="button-my-assistant">
              <MessageCircle className="w-3.5 h-3.5" /> My Assistant
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowResetDialog(true)} title="Start over" data-testid="button-reset-data">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <motion.div initial="hidden" animate="visible" className="space-y-8">
          <motion.div variants={fadeUp} custom={0} className="space-y-1">
            <h1 className="font-serif text-2xl font-bold" data-testid="text-dashboard-title">
              Welcome back, {profile?.displayName?.split(" ")[0] || user?.firstName || "there"}
            </h1>
            <p className="text-muted-foreground text-sm">Here's your wellness overview</p>
          </motion.div>

          {sessionWithin48h && (
            <motion.div variants={fadeUp} custom={0.5}>
              <Card className="p-4 border-primary/30 bg-primary/5" data-testid="banner-session-reminder">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" data-testid="text-session-reminder-title">
                        Session coming up {formatTimeUntilSession(sessionWithin48h.scheduledAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sessionReminderCoach ? `with ${sessionReminderCoach.name}` : ""}{" "}
                        {new Date(sessionWithin48h.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                      {(profile?.motivation || profile?.highLevelGoal) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {profile?.motivation
                            ? `Remember your motivation: "${profile.motivation.length > 80 ? profile.motivation.slice(0, 80) + "..." : profile.motivation}"`
                            : profile?.highLevelGoal
                            ? `Stay focused on your goal: ${profile.highLevelGoal}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setLocation("/assistant")}
                    className="gap-1.5"
                    data-testid="button-session-prep"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Prepare with AI
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Heart, label: "Mood Score", value: avgMood > 0 ? `${avgMood}/10` : "N/A", color: "text-chart-5" },
              { icon: CalendarCheck, label: "Upcoming Sessions", value: `${upcomingBookings.length}`, color: "text-primary" },
              { icon: TrendingUp, label: "Progress Logs", value: `${recentProgress.length}`, color: "text-chart-3" },
              { icon: Brain, label: "When Stuck", value: { push: "Push me", reflect: "Help reflect", plan: "Build a plan" }[profile?.coachStyle || ""] || profile?.coachStyle || "N/A", color: "text-chart-4" },
            ].map((stat, i) => (
              <motion.div key={stat.label} variants={fadeUp} custom={i + 1}>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-card flex items-center justify-center border">
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-lg font-semibold capitalize" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>{stat.value}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <motion.div variants={fadeUp} custom={5} className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="font-semibold">Upcoming Sessions</h2>
                <Button variant="outline" size="sm" onClick={() => setLocation("/booking")} data-testid="button-book-session">
                  Book Session
                </Button>
              </div>

              {upcomingBookings.length === 0 ? (
                <Card className="p-8 text-center">
                  <CalendarCheck className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No upcoming sessions</p>
                  <Button size="sm" onClick={() => setLocation("/booking")} data-testid="button-book-first">Book Your First Session</Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => {
                    const coach = coaches?.find(c => c.id === booking.coachId);
                    return (
                      <Card key={booking.id} className="p-4 space-y-3">
                        <div className="flex items-center gap-4 flex-wrap">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={coach?.imageUrl || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{coach?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" data-testid={`text-booking-coach-${booking.id}`}>{coach?.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(booking.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {booking.status === "approved" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setRescheduleBookingId(booking.id); setRescheduleCoachId(booking.coachId); setRescheduleMessage(""); setRescheduleDate(null); setRescheduleTime(""); }}
                                className="gap-1 text-xs"
                                data-testid={`button-reschedule-${booking.id}`}
                              >
                                <RefreshCw className="w-3 h-3" /> Reschedule
                              </Button>
                            )}
                            {booking.status === "reschedule_requested" && booking.rescheduleRequestedBy === "coach" ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => respondMutation.mutate({ bookingId: booking.id, status: "approved" })}
                                  disabled={respondMutation.isPending}
                                  className="gap-1"
                                  data-testid={`button-approve-reschedule-${booking.id}`}
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => respondMutation.mutate({ bookingId: booking.id, status: "declined" })}
                                  disabled={respondMutation.isPending}
                                  className="gap-1 text-destructive hover:text-destructive"
                                  data-testid={`button-decline-reschedule-${booking.id}`}
                                >
                                  <X className="w-3.5 h-3.5" /> Decline
                                </Button>
                              </div>
                            ) : (
                              <Badge
                                variant={booking.status === "approved" ? "default" : booking.status === "declined" ? "destructive" : booking.status === "reschedule_requested" ? "outline" : booking.status === "completed" ? "secondary" : "secondary"}
                                className={booking.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}
                                data-testid={`badge-booking-status-${booking.id}`}
                              >
                                {booking.status === "pending" ? "Pending Approval" : booking.status === "approved" ? "Upcoming" : booking.status === "reschedule_requested" ? "Reschedule Requested" : booking.status === "completed" ? "✓ Completed" : booking.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {booking.status === "reschedule_requested" && (
                          <div className={`rounded-md p-3 text-xs ${booking.rescheduleRequestedBy === "coach" ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" : "bg-muted/50"}`}>
                            <p className={`font-medium mb-1 flex items-center gap-1.5 ${booking.rescheduleRequestedBy === "coach" ? "text-amber-800 dark:text-amber-300" : ""}`}>
                              <RefreshCw className="w-3 h-3" />
                              {booking.rescheduleRequestedBy === "coach" ? "Your coach" : "You"} requested a reschedule
                              {booking.rescheduleRequestedBy === "coach" && " — please review the new time above"}
                            </p>
                            {booking.rescheduleMessage && (
                              <p className={`italic ${booking.rescheduleRequestedBy === "coach" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>"{booking.rescheduleMessage}"</p>
                            )}
                          </div>
                        )}
                        {booking.meetLink && booking.status === "approved" && (
                          <a
                            href={booking.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            data-testid={`link-meet-${booking.id}`}
                          >
                            <CalendarCheck className="w-3 h-3" /> Join Google Meet
                          </a>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>

            <motion.div variants={fadeUp} custom={6} className="space-y-4">
              <h2 className="font-semibold">Your Coach</h2>
              {matchedCoach ? (
                <Card className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={matchedCoach.imageUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">{matchedCoach.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm" data-testid="text-coach-name">{matchedCoach.name}</p>
                      <p className="text-xs text-muted-foreground">{matchedCoach.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < (matchedCoach.rating || 0) ? "fill-chart-2 text-chart-2" : "text-muted"}`} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">{matchedCoach.sessionsCompleted} sessions</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{matchedCoach.bio}</p>
                  <div className="flex gap-1 flex-wrap">
                    {matchedCoach.specialties?.map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card className="p-6 text-center">
                  <Target className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No coach matched yet</p>
                  <Button size="sm" onClick={() => setLocation("/coaching-match")} data-testid="button-find-coach">Find a Coach</Button>
                </Card>
              )}

              <h2 className="font-semibold pt-2">Wellness Goal</h2>
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium capitalize" data-testid="text-goal">
                      {profile?.highLevelGoal
                        ? profile.highLevelGoal.split(",").map(g => ({ fitness: "Fitness", energy: "Energy & Burnout", focus: "Productivity & Focus", sleep: "Sleep Routine" }[g.trim()] || g.trim())).join(", ")
                        : "Not set"}
                    </span>
                  </div>
                  <Progress value={recentProgress.length * 20} className="h-2" />
                  <p className="text-xs text-muted-foreground">{recentProgress.length} of 5 check-ins completed</p>
                </div>
              </Card>
            </motion.div>

          </div>

          {valuesWheelData?.current && (
            <motion.div variants={fadeUp} custom={7}>
              <ValuesWheelProgress
                current={valuesWheelData.current}
                history={valuesWheelData.history || []}
                onUpdate={(ratings) => valuesWheelMutation.mutate(ratings)}
                isUpdating={valuesWheelMutation.isPending}
              />
            </motion.div>
          )}
        </motion.div>
      </div>

      <Dialog open={!!rescheduleBookingId} onOpenChange={(open) => { if (!open) { setRescheduleBookingId(null); setRescheduleCoachId(""); setRescheduleMessage(""); setRescheduleDate(null); setRescheduleTime(""); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Reschedule</DialogTitle>
            <DialogDescription>
              Choose a new date and time, and optionally leave a message for your coach.
            </DialogDescription>
          </DialogHeader>
          <ReschedulePicker
            coachId={rescheduleCoachId}
            message={rescheduleMessage}
            onMessageChange={setRescheduleMessage}
            selectedDate={rescheduleDate}
            onDateChange={setRescheduleDate}
            selectedTime={rescheduleTime}
            onTimeChange={setRescheduleTime}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRescheduleBookingId(null); setRescheduleCoachId(""); setRescheduleMessage(""); setRescheduleDate(null); setRescheduleTime(""); }} data-testid="button-cancel-reschedule">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!rescheduleBookingId || !rescheduleDate || !rescheduleTime) return;
                const scheduledAt = parseTimeToDate(rescheduleDate, rescheduleTime).toISOString();
                rescheduleMutation.mutate({ bookingId: rescheduleBookingId, message: rescheduleMessage, scheduledAt });
              }}
              disabled={rescheduleMutation.isPending || !rescheduleDate || !rescheduleTime}
              data-testid="button-confirm-reschedule"
            >
              {rescheduleMutation.isPending ? "Sending..." : "Request Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Over?</DialogTitle>
            <DialogDescription>
              This will clear your questionnaire responses, bookings, progress entries, and reset your wellness profile. You'll be able to go through the onboarding and questionnaire again from scratch.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowResetDialog(false)} data-testid="button-cancel-reset">
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending} data-testid="button-confirm-reset">
              {resetMutation.isPending ? "Resetting..." : "Yes, Start Over"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
