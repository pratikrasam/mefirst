import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ArrowRight, ArrowLeft, Dumbbell, Battery, Brain, Moon, User, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { UserProfile } from "@shared/schema";

const goals = [
  {
    id: "fitness",
    label: "Fitness Consistency",
    icon: Dumbbell,
    quote: "I have been wanting to workout consistently but I cannot do it for more than 2 weeks",
  },
  {
    id: "energy",
    label: "Energy & Burnout",
    icon: Battery,
    quote: "Ugh I feel so tired all the time especially after work\u2026I do not have the energy to do anything else",
  },
  {
    id: "focus",
    label: "Productivity & Focus",
    icon: Brain,
    quote: "I wish I can focus better and manage my tasks better",
  },
  {
    id: "sleep",
    label: "Sleep Routine",
    icon: Moon,
    quote: "I am just an adult wanting to get 7-8 hours of quality sleep but the instagram at night does not help",
  },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const { data: profile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  const hasName = !!(profile?.displayName?.trim() || (user?.firstName && user.firstName.trim()));
  const needsNameStep = !hasName;

  const [step, setStep] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    } else if (user?.firstName) {
      setDisplayName(`${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`);
    }
  }, [user, profile]);

  const totalSteps = needsNameStep ? 3 : 2;
  const goalStep = needsNameStep ? 1 : 0;
  const confirmStep = needsNameStep ? 2 : 1;

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId) ? prev.filter(g => g !== goalId) : [...prev, goalId]
    );
  };

  const createProfile = useMutation({
    mutationFn: async () => {
      const goalString = selectedGoals.join(",");
      await apiRequest("POST", "/api/profile", {
        highLevelGoal: goalString,
        motivation: null,
        onboardingCompleted: false,
        displayName: displayName.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      localStorage.setItem("mefirst-selected-goal", selectedGoals.join(","));
      setLocation("/questionnaire");
    },
    onError: () => {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    },
  });

  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-bold">MeFirst</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Step {step + 1} of {totalSteps}</span>
            <Progress value={progress} className="w-24 h-2" />
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {needsNameStep && step === 0 && (
            <motion.div
              key="step-name"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h1 className="font-serif text-3xl font-bold" data-testid="text-name-title">Welcome! What should we call you?</h1>
                <p className="text-muted-foreground">Your name helps your coach and AI assistant personalize your experience.</p>
              </div>

              <div className="max-w-sm mx-auto space-y-2">
                <Input
                  placeholder="Your full name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-center text-lg h-12"
                  data-testid="input-display-name"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">This is how your coach will address you</p>
              </div>

              <div className="flex justify-end">
                <Button
                  size="lg"
                  disabled={!displayName.trim()}
                  onClick={() => setStep(1)}
                  className="gap-2"
                  data-testid="button-name-continue"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === goalStep && (needsNameStep ? step > 0 : true) && (
            <motion.div
              key="step-goal"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <h1 className="font-serif text-3xl font-bold" data-testid="text-onboarding-title">What are your wellness goals?</h1>
                <p className="text-muted-foreground">Select all that apply — you can focus on more than one.</p>
              </div>

              <div className="grid gap-3">
                {goals.map((goal) => {
                  const isSelected = selectedGoals.includes(goal.id);
                  return (
                    <Card
                      key={goal.id}
                      className={`p-4 cursor-pointer transition-colors toggle-elevate ${isSelected ? "toggle-elevated border-primary" : ""}`}
                      onClick={() => toggleGoal(goal.id)}
                      data-testid={`card-goal-${goal.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${isSelected ? "bg-primary/15" : "bg-muted"}`}>
                          <goal.icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-sm font-semibold">{goal.label}</p>
                          <p className="text-sm text-muted-foreground italic leading-relaxed">"{goal.quote}"</p>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                {needsNameStep && (
                  <Button variant="outline" onClick={() => setStep(0)} className="gap-2" data-testid="button-back-name">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                )}
                <div className={needsNameStep ? "" : "ml-auto"}>
                  <Button
                    size="lg"
                    disabled={selectedGoals.length === 0}
                    onClick={() => setStep(confirmStep)}
                    className="gap-2"
                    data-testid="button-next-step"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === confirmStep && (
            <motion.div
              key="step-confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <h1 className="font-serif text-3xl font-bold">Great choice{displayName.trim() ? `, ${displayName.trim().split(" ")[0]}` : ""}!</h1>
                <p className="text-muted-foreground">
                  You've selected{" "}
                  <span className="font-medium text-foreground">
                    {selectedGoals.map(id => goals.find(g => g.id === id)?.label).filter(Boolean).join(", ")}
                  </span>{" "}
                  as your {selectedGoals.length > 1 ? "goals" : "goal"}.
                  Next, we'll ask a few questions to understand your current wellness state.
                </p>
              </div>

              <Card className="p-6 space-y-4 text-center">
                <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center mx-auto">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold">Quick Wellness Assessment</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  A brief questionnaire covering mental and physical health, plus a values wheel to map what matters most to you.
                  Takes about 3 minutes.
                </p>
              </Card>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <Button variant="outline" onClick={() => setStep(goalStep)} className="gap-2" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  onClick={() => createProfile.mutate()}
                  disabled={createProfile.isPending}
                  className="gap-2"
                  data-testid="button-continue-questionnaire"
                >
                  {createProfile.isPending ? "Saving..." : "Continue to Questionnaire"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
