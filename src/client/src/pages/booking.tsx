import { useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, ArrowLeft, CalendarCheck, Clock, Star, Check } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Coach, CoachAvailability } from "@shared/schema";

const defaultTimeSlots = [
  "9:00 AM", "10:00 AM", "11:00 AM",
  "1:00 PM", "2:00 PM", "3:00 PM",
  "4:00 PM", "5:00 PM",
];

function generateTimeSlotsFromAvailability(slots: CoachAvailability[], selectedDate: Date | null, hasAvailability: boolean): string[] {
  if (!selectedDate) return hasAvailability ? [] : defaultTimeSlots;
  if (!hasAvailability) return defaultTimeSlots;

  const dayOfWeek = selectedDate.getDay();
  const daySlots = slots.filter(s => s.dayOfWeek === dayOfWeek);
  if (daySlots.length === 0) return [];

  const times: string[] = [];
  for (const slot of daySlots) {
    const [startH, startM] = slot.startTime.split(":").map(Number);
    const [endH, endM] = slot.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);

    for (let m = startMinutes; m < endMinutes; m += 60) {
      const h = Math.floor(m / 60);
      const mins = m % 60;
      const period = h >= 12 ? "PM" : "AM";
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      times.push(`${displayH}:${String(mins).padStart(2, "0")} ${period}`);
    }
  }
  return times;
}

function getNextWeekDays() {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      days.push(d);
    }
  }
  return days;
}

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export default function BookingPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const preselectedCoachId = params.get("coachId");

  const [selectedCoachId, setSelectedCoachId] = useState(preselectedCoachId || "");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [booked, setBooked] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: coaches } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: coachAvailability } = useQuery<CoachAvailability[]>({
    queryKey: ["/api/coaches", selectedCoachId, "availability"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!selectedCoachId,
  });

  const weekDays = useMemo(getNextWeekDays, []);
  const selectedCoach = coaches?.find((c) => c.id === selectedCoachId);
  const hasCoachAvailability = (coachAvailability || []).length > 0;
  const availableTimeSlots = useMemo(
    () => generateTimeSlotsFromAvailability(coachAvailability || [], selectedDate, hasCoachAvailability),
    [coachAvailability, selectedDate, hasCoachAvailability]
  );

  const createBooking = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTime || !selectedCoachId) return;
      const [hourStr, period] = selectedTime.split(" ");
      const [hours, minutes] = hourStr.split(":").map(Number);
      const date = new Date(selectedDate);
      date.setHours(period === "PM" && hours !== 12 ? hours + 12 : hours === 12 && period === "AM" ? 0 : hours, minutes);

      await apiRequest("POST", "/api/bookings", {
        userId: "",
        coachId: selectedCoachId,
        scheduledAt: date.toISOString(),
        notes: notes || null,
      });

      await apiRequest("PATCH", "/api/profile", { onboardingCompleted: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setBooked(true);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to book. Please try again.", variant: "destructive" });
    },
  });

  if (booked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-bold" data-testid="text-booking-confirmed">Request Sent!</h1>
          <p className="text-muted-foreground">
            Your session request with {selectedCoach?.name} has been submitted.
            You'll be notified once your coach approves the booking.
          </p>
          <Card className="p-4 text-left">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedCoach?.imageUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">{selectedCoach?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{selectedCoach?.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    {selectedDate?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {selectedTime}
                  </span>
                </div>
              </div>
            </div>
          </Card>
          <Button onClick={() => setLocation("/consent")} className="gap-2" data-testid="button-go-dashboard">
            Continue <CalendarCheck className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/coaching-match")} data-testid="button-back-match">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-bold">MeFirst</span>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <motion.div initial="hidden" animate="visible" className="space-y-10">
          <motion.div variants={fadeUp} custom={0} className="text-center space-y-3">
            <h1 className="font-serif text-3xl font-bold" data-testid="text-booking-title">Book Your First Session</h1>
            <p className="text-muted-foreground">Choose a coach, pick a time, and start your wellness journey.</p>
          </motion.div>

          {!preselectedCoachId && (
            <motion.div variants={fadeUp} custom={1} className="space-y-3">
              <h2 className="font-semibold">Select a Coach</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {(coaches || []).map((coach) => (
                  <Card
                    key={coach.id}
                    className={`p-4 cursor-pointer toggle-elevate ${selectedCoachId === coach.id ? "toggle-elevated border-primary" : ""}`}
                    onClick={() => setSelectedCoachId(coach.id)}
                    data-testid={`card-book-coach-${coach.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={coach.imageUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{coach.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{coach.name}</p>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, j) => (
                            <Star key={j} className={`w-2.5 h-2.5 ${j < (coach.rating || 0) ? "fill-chart-2 text-chart-2" : "text-muted"}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {selectedCoachId && (
            <>
              <motion.div variants={fadeUp} custom={2} className="space-y-3">
                <h2 className="font-semibold">Pick a Day</h2>
                <div className="flex gap-2 flex-wrap">
                  {weekDays.map((day) => (
                    <Card
                      key={day.toISOString()}
                      className={`p-3 cursor-pointer text-center min-w-[80px] toggle-elevate ${selectedDate?.toDateString() === day.toDateString() ? "toggle-elevated border-primary" : ""}`}
                      onClick={() => { setSelectedDate(day); setSelectedTime(""); }}
                      data-testid={`card-date-${day.getDate()}`}
                    >
                      <p className="text-xs text-muted-foreground">{day.toLocaleDateString("en-US", { weekday: "short" })}</p>
                      <p className="text-lg font-semibold">{day.getDate()}</p>
                      <p className="text-xs text-muted-foreground">{day.toLocaleDateString("en-US", { month: "short" })}</p>
                    </Card>
                  ))}
                </div>
              </motion.div>

              {selectedDate && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <h2 className="font-semibold">Pick a Time</h2>
                  {availableTimeSlots.length === 0 ? (
                    <Card className="p-6 text-center">
                      <p className="text-sm text-muted-foreground">No availability on this day. Try another date.</p>
                    </Card>
                  ) : null}
                  <div className="grid grid-cols-4 gap-2">
                    {availableTimeSlots.map((time) => (
                      <Card
                        key={time}
                        className={`p-2.5 cursor-pointer text-center toggle-elevate ${selectedTime === time ? "toggle-elevated border-primary" : ""}`}
                        onClick={() => setSelectedTime(time)}
                        data-testid={`card-time-${time.replace(/\s/g, '-')}`}
                      >
                        <p className="text-sm font-medium">{time}</p>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}

              {selectedTime && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <h2 className="font-semibold">Notes for Your Coach (optional)</h2>
                  <Textarea
                    placeholder="Any goals, expectations, or things you'd like to discuss..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="resize-none"
                    rows={3}
                    data-testid="textarea-notes"
                  />
                </motion.div>
              )}

              {selectedTime && selectedDate && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={selectedCoach?.imageUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">{selectedCoach?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{selectedCoach?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {selectedTime}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => createBooking.mutate()}
                        disabled={createBooking.isPending}
                        className="gap-2"
                        data-testid="button-confirm-booking"
                      >
                        {createBooking.isPending ? "Sending..." : "Request Booking"}
                        <CalendarCheck className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
