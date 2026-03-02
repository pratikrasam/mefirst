import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Clock } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import type { CoachAvailability } from "@shared/schema";

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

  const timeSet = new Set<string>();
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
      timeSet.add(`${displayH}:${String(mins).padStart(2, "0")} ${period}`);
    }
  }
  return Array.from(timeSet);
}

function getNextTwoWeekDays() {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      days.push(d);
    }
  }
  return days;
}

interface ReschedulePickerProps {
  coachId: string;
  message: string;
  onMessageChange: (msg: string) => void;
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  selectedTime: string;
  onTimeChange: (time: string) => void;
}

export function ReschedulePicker({
  coachId,
  message,
  onMessageChange,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
}: ReschedulePickerProps) {
  const { data: coachAvailability } = useQuery<CoachAvailability[]>({
    queryKey: [`/api/coaches/${coachId}/availability`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!coachId,
  });

  const weekDays = useMemo(getNextTwoWeekDays, []);
  const hasCoachAvailability = (coachAvailability || []).length > 0;
  const availableTimeSlots = useMemo(
    () => generateTimeSlotsFromAvailability(coachAvailability || [], selectedDate, hasCoachAvailability),
    [coachAvailability, selectedDate, hasCoachAvailability]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Proposed Date</label>
        <div className="flex gap-2 flex-wrap max-h-[120px] overflow-y-auto pr-1">
          {weekDays.map((day) => (
            <Card
              key={day.toISOString()}
              className={`p-2 cursor-pointer text-center min-w-[70px] transition-colors ${selectedDate?.toDateString() === day.toDateString() ? "border-primary bg-primary/5" : "hover:border-primary/30"}`}
              onClick={() => { onDateChange(day); onTimeChange(""); }}
              data-testid={`reschedule-date-${day.getDate()}`}
            >
              <p className="text-[10px] text-muted-foreground">{day.toLocaleDateString("en-US", { weekday: "short" })}</p>
              <p className="text-sm font-semibold">{day.getDate()}</p>
              <p className="text-[10px] text-muted-foreground">{day.toLocaleDateString("en-US", { month: "short" })}</p>
            </Card>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Proposed Time</label>
          {availableTimeSlots.length === 0 ? (
            <p className="text-xs text-muted-foreground">No availability on this day. Try another date.</p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {availableTimeSlots.map((time) => (
                <Card
                  key={time}
                  className={`p-2 cursor-pointer text-center transition-colors ${selectedTime === time ? "border-primary bg-primary/5" : "hover:border-primary/30"}`}
                  onClick={() => onTimeChange(time)}
                  data-testid={`reschedule-time-${time.replace(/\s/g, '-')}`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-medium">{time}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Message (optional)</label>
        <Textarea
          placeholder="e.g., I have a conflict that day — could we move to Thursday?"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          className="resize-none"
          rows={2}
          data-testid="textarea-reschedule-message"
        />
      </div>
    </div>
  );
}

export function parseTimeToDate(date: Date, timeStr: string): Date {
  const [hourStr, period] = timeStr.split(" ");
  const [hours, minutes] = hourStr.split(":").map(Number);
  const result = new Date(date);
  result.setHours(period === "PM" && hours !== 12 ? hours + 12 : hours === 12 && period === "AM" ? 0 : hours, minutes, 0, 0);
  return result;
}
