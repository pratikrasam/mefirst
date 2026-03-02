import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Star, MessageSquare, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Coach } from "@shared/schema";

const coachStyles = [
  { id: "push", label: "Someone who pushes me", icon: Zap, description: "Direct accountability, challenges your comfort zone, and keeps you moving forward" },
  { id: "reflect", label: "Someone who helps me reflect", icon: MessageSquare, description: "Thoughtful questions, deeper self-awareness, and space to explore what's really going on" },
  { id: "plan", label: "Someone who helps me build a plan", icon: Shield, description: "Structured action steps, clear milestones, and organized strategies to reach your goals" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export default function CoachingMatchPage() {
  const [selectedStyle, setSelectedStyle] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: coaches, isLoading } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const updateProfile = useMutation({
    mutationFn: async (coachStyle: string) => {
      await apiRequest("PATCH", "/api/profile", { coachStyle });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save preference.", variant: "destructive" });
    },
  });

  const filteredCoaches = selectedStyle
    ? (coaches || []).filter((c) => c.style === selectedStyle)
    : coaches || [];

  const handleStyleSelect = (style: string) => {
    setSelectedStyle(style);
    updateProfile.mutate(style);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-serif text-xl font-bold">MeFirst</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <motion.div initial="hidden" animate="visible" className="space-y-10">
          <motion.div variants={fadeUp} custom={0} className="text-center space-y-3">
            <h1 className="font-serif text-3xl font-bold" data-testid="text-coaching-match-title">When you're stuck, what helps most?</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              This helps your coach tailor their sessions, activities, and exercises to what works best for you.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} custom={1} className="grid sm:grid-cols-3 gap-3">
            {coachStyles.map((style) => (
              <Card
                key={style.id}
                className={`p-5 cursor-pointer text-center toggle-elevate ${selectedStyle === style.id ? "toggle-elevated border-primary" : ""}`}
                onClick={() => handleStyleSelect(style.id)}
                data-testid={`card-style-${style.id}`}
              >
                <div className={`w-10 h-10 rounded-md mx-auto mb-3 flex items-center justify-center ${selectedStyle === style.id ? "bg-primary/15" : "bg-muted"}`}>
                  <style.icon className={`w-5 h-5 ${selectedStyle === style.id ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <h3 className="text-sm font-semibold mb-1">{style.label}</h3>
                <p className="text-xs text-muted-foreground">{style.description}</p>
              </Card>
            ))}
          </motion.div>

          {selectedStyle && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="font-semibold text-lg">Recommended Coaches</h2>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Card key={i} className="p-6 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-muted" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted rounded-md w-32" />
                          <div className="h-3 bg-muted rounded-md w-48" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredCoaches.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No coaches available for this style yet. Check back soon!</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredCoaches.map((coach, i) => (
                    <motion.div key={coach.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                      <Card className="p-5 hover-elevate">
                        <div className="flex items-start gap-4 flex-wrap">
                          <Avatar className="w-14 h-14 flex-shrink-0">
                            <AvatarImage src={coach.imageUrl || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{coach.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <h3 className="font-semibold" data-testid={`text-coach-name-${coach.id}`}>{coach.name}</h3>
                              <p className="text-xs text-muted-foreground">{coach.title}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, j) => (
                                <Star key={j} className={`w-3 h-3 ${j < (coach.rating || 0) ? "fill-chart-2 text-chart-2" : "text-muted"}`} />
                              ))}
                              <span className="text-xs text-muted-foreground ml-1">{coach.sessionsCompleted} sessions</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{coach.bio}</p>
                            <div className="flex gap-1 flex-wrap">
                              {coach.specialties?.map((s) => (
                                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setLocation(`/booking?coachId=${coach.id}`)}
                            data-testid={`button-select-coach-${coach.id}`}
                          >
                            Select
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setLocation("/booking")}
              className="gap-2"
              data-testid="button-skip-to-booking"
            >
              Skip to Booking <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
