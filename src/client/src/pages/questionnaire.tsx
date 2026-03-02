import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight, ArrowLeft, Check, Heart, Lightbulb, Compass, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ValuesWheelInput, VALUES_CATEGORIES, type ValuesRatings } from "@/components/values-wheel";

const goalMotivationOptions = [
  { id: "self", label: "Something YOU want", description: "This comes from within — a personal desire to grow" },
  { id: "should", label: "Something you feel you should do", description: "There's a sense of obligation or expectation driving this" },
  { id: "others", label: "Something others expect", description: "People around you have voiced this as important" },
];

const successExamples: Record<string, string> = {
  fitness: "e.g., I want to be able to work out 3-4 times a week consistently, even if it's just 20 minutes. I want exercise to feel like a normal part of my day, not a chore.",
  energy: "e.g., I want to come home from work and still have energy to cook dinner, go for a walk, or hang out with friends instead of crashing on the couch.",
  focus: "e.g., I want to get through my top 3 tasks each day without getting sidetracked. I want to feel in control of my time instead of reactive.",
  sleep: "e.g., I want to fall asleep within 20 minutes, sleep 7-8 hours, and wake up feeling actually rested instead of hitting snooze 5 times.",
};

const aboutYouSteps = [
  {
    key: "lifeAccomplishments",
    title: "Let's paint the big picture",
    subtitle: "Your coach needs to understand what truly matters to you.",
    question: "What accomplishments or events must occur during your lifetime to consider your life satisfying and well lived?",
    placeholder: "e.g., Building meaningful relationships, traveling to 20 countries, starting my own business, raising kind children...",
    icon: Compass,
  },
  {
    key: "secretPassion",
    title: "Everyone has a dream",
    subtitle: "Even if it feels out of reach right now — that's exactly what coaching is for.",
    question: "What is a secret passion in your life? Something you would really love to do, whether or not you've allowed yourself to pursue it.",
    placeholder: "e.g., I've always wanted to write a novel, learn to play the piano, or live abroad for a year...",
    icon: Heart,
  },
  {
    key: "stressResponse",
    title: "When things get tough",
    subtitle: "No judgment here — understanding your patterns helps us build better strategies.",
    question: "What do you do when you are up against the wall or stressed?",
    placeholder: "e.g., I tend to shut down and binge-watch TV, or I go for a run, or I talk to a close friend...",
    icon: Shield,
  },
  {
    key: "healthChallenges",
    title: "Your whole self matters",
    subtitle: "Physical and mental health are deeply connected to your wellness goals.",
    question: "Are you experiencing any health challenges?",
    placeholder: "e.g., Chronic back pain, anxiety, high blood pressure, recovering from an injury...",
    icon: Heart,
  },
  {
    key: "typicalWeek",
    title: "A week in your life",
    subtitle: "This helps your coach understand where coaching fits into your reality.",
    question: "Describe your typical week in terms of fitness, diet, and work.",
    placeholder: "e.g., I work 9-6 at a desk job, eat mostly takeout, try to walk on weekends but rarely exercise otherwise...",
    icon: Compass,
  },
  {
    key: "therapyHistory",
    title: "Your support network",
    subtitle: "Coaching and therapy work beautifully together — it helps to know your history.",
    question: "Are you currently seeing a therapist or mental health professional, or have you in the past?",
    placeholder: "e.g., I saw a therapist for 6 months last year for anxiety, or no I haven't but I've been considering it...",
    icon: Shield,
  },
  {
    key: "bringsJoy",
    title: "The good stuff",
    subtitle: "Your plan should include more of what lights you up — not just what needs fixing.",
    question: "What do you do that brings you joy?",
    placeholder: "e.g., Cooking for friends, hiking, painting, spending time with my dog, playing basketball...",
    icon: Lightbulb,
  },
  {
    key: "twoSmallSteps",
    title: "Small steps, big impact",
    subtitle: "Your coach will help refine these, but your instinct matters.",
    question: "What are two small steps you can immediately take to make the greatest difference in your well-being?",
    placeholder: "e.g., Going to bed 30 minutes earlier and taking a 15-minute walk after lunch...",
    icon: Compass,
  },
  {
    key: "age",
    title: "Almost there!",
    subtitle: "Just a couple quick details so your coach can personalize your plan.",
    question: "How old are you?",
    placeholder: "e.g., 28",
    icon: Sparkles,
    short: true,
  },
  {
    key: "profession",
    title: "Last one!",
    subtitle: "Your work life plays a big role in your wellness — this helps us connect the dots.",
    question: "What do you do for work?",
    placeholder: "e.g., Software engineer, nurse, freelance designer, student...",
    icon: Sparkles,
    short: true,
  },
];

const VALUES_STEP = 2 + aboutYouSteps.length;
const TOTAL_STEPS = VALUES_STEP + 1;

const sectionIntros = [
  { atStep: 2, title: "Now let's get to know you", subtitle: "The next few questions help your coach see the full picture — not just the goal, but the person behind it." },
  { atStep: 7, title: "You're doing great", subtitle: "Just a few more questions and we'll have everything we need to build your personalized plan." },
  { atStep: VALUES_STEP, title: "One more reflection", subtitle: "Let's map out how you're feeling across the key areas of your life. This becomes your personal values wheel — a snapshot you'll update over time to track your growth." },
];

const slideVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function QuestionnairePage() {
  const [step, setStep] = useState(0);
  const [selectedMotivations, setSelectedMotivations] = useState<string[]>([]);
  const [successVision, setSuccessVision] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [valuesRatings, setValuesRatings] = useState<ValuesRatings>({});
  const [showIntro, setShowIntro] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const storedGoal = localStorage.getItem("mefirst-selected-goal") || "fitness";

  const toggleMotivation = (id: string) => {
    setSelectedMotivations((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const submitQuestionnaire = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/questionnaire", {
        goalMotivation: selectedMotivations,
        successVision,
        answers,
      });
      if (Object.keys(valuesRatings).length > 0) {
        await apiRequest("PATCH", "/api/profile", {
          valuesWheel: {
            current: valuesRatings,
            history: [],
            updatedAt: new Date().toISOString(),
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaire"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setLocation("/coaching-match");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save. Please try again.", variant: "destructive" });
    },
  });

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const updateAnswer = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const goNext = () => {
    const nextStep = step + 1;
    const intro = sectionIntros.find(s => s.atStep === nextStep);
    if (intro) {
      setShowIntro(nextStep);
    } else {
      setStep(nextStep);
    }
  };

  const dismissIntro = () => {
    if (showIntro !== null) {
      setStep(showIntro);
      setShowIntro(null);
    }
  };

  const goBack = () => {
    setShowIntro(null);
    setStep(Math.max(0, step - 1));
  };

  const isLastStep = step === TOTAL_STEPS - 1;
  const isValuesStep = step === VALUES_STEP;
  const aboutYouIndex = step - 2;
  const currentAboutYou = aboutYouIndex >= 0 && aboutYouIndex < aboutYouSteps.length ? aboutYouSteps[aboutYouIndex] : null;

  const canContinue = () => {
    if (step === 0) return selectedMotivations.length > 0;
    if (step === 1) return true;
    return true;
  };

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
            <span className="text-xs text-muted-foreground">{step + 1} of {TOTAL_STEPS}</span>
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {showIntro !== null && (
            <motion.div
              key={`intro-${showIntro}`}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35 }}
              className="text-center space-y-8 py-12"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
              >
                <Sparkles className="w-7 h-7 text-primary" />
              </motion.div>
              <div className="space-y-3">
                <h1 className="font-serif text-3xl font-bold" data-testid="text-section-intro">
                  {sectionIntros.find(s => s.atStep === showIntro)?.title}
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {sectionIntros.find(s => s.atStep === showIntro)?.subtitle}
                </p>
              </div>
              <Button size="lg" onClick={dismissIntro} className="gap-2" data-testid="button-continue-intro">
                Let's go <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {showIntro === null && step === 0 && (
            <motion.div
              key="q-motivation"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <p className="text-sm font-medium text-primary uppercase tracking-wider" data-testid="text-step-label">Building your plan</p>
                <h1 className="font-serif text-3xl font-bold" data-testid="text-questionnaire-title">This goal feels like...</h1>
                <p className="text-muted-foreground max-w-md mx-auto">Pick the one that resonates most. You can select more than one.</p>
              </div>

              <div className="space-y-3">
                {goalMotivationOptions.map((option) => {
                  const selected = selectedMotivations.includes(option.id);
                  return (
                    <Card
                      key={option.id}
                      className={`p-5 cursor-pointer transition-all duration-200 toggle-elevate ${selected ? "toggle-elevated border-primary bg-primary/5" : "hover:border-muted-foreground/20"}`}
                      onClick={() => toggleMotivation(option.id)}
                      data-testid={`card-motivation-${option.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                          {selected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="lg"
                  disabled={!canContinue()}
                  onClick={goNext}
                  className="gap-2"
                  data-testid="button-q-next-1"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {showIntro === null && step === 1 && (
            <motion.div
              key="q-vision"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <p className="text-sm font-medium text-primary uppercase tracking-wider">Envisioning success</p>
                <h1 className="font-serif text-3xl font-bold">Imagine 6-10 weeks from now</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  What does your life look like when this goal is working? Don't worry about making it perfect — your coach will help you refine it.
                </p>
              </div>

              <Textarea
                value={successVision}
                onChange={(e) => setSuccessVision(e.target.value)}
                placeholder={successExamples[storedGoal] || successExamples.fitness}
                className="resize-none min-h-[160px] text-sm border-2 focus:border-primary/50 transition-colors"
                data-testid="input-success-vision"
              />
              <p className="text-xs text-muted-foreground text-center">
                It's completely okay if your vision doesn't follow a specific structure yet. That's what coaching is for.
              </p>

              <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                <Button variant="outline" onClick={goBack} className="gap-2" data-testid="button-q-back-1">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" onClick={goNext} className="gap-2" data-testid="button-q-next-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {showIntro === null && currentAboutYou && (
            <motion.div
              key={`q-about-${currentAboutYou.key}`}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
                >
                  <currentAboutYou.icon className="w-5 h-5 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-about-title">{currentAboutYou.title}</h1>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">{currentAboutYou.subtitle}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground leading-relaxed block text-center">
                  {currentAboutYou.question}
                </label>
                {currentAboutYou.short ? (
                  <Input
                    value={answers[currentAboutYou.key] || ""}
                    onChange={(e) => updateAnswer(currentAboutYou.key, e.target.value)}
                    placeholder={currentAboutYou.placeholder}
                    className="text-sm text-center border-2 focus:border-primary/50 transition-colors max-w-xs mx-auto"
                    data-testid={`input-${currentAboutYou.key}`}
                  />
                ) : (
                  <Textarea
                    value={answers[currentAboutYou.key] || ""}
                    onChange={(e) => updateAnswer(currentAboutYou.key, e.target.value)}
                    placeholder={currentAboutYou.placeholder}
                    className="resize-none min-h-[120px] text-sm border-2 focus:border-primary/50 transition-colors"
                    data-testid={`input-${currentAboutYou.key}`}
                  />
                )}
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                <Button variant="outline" onClick={goBack} className="gap-2" data-testid="button-q-back-about">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button size="lg" onClick={goNext} className="gap-2" data-testid="button-q-next-about">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {showIntro === null && isValuesStep && (
            <motion.div
              key="q-values-wheel"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              <div className="text-center space-y-3">
                <p className="text-sm font-medium text-primary uppercase tracking-wider">Values Reflection</p>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-values-title">
                  What values deeply matter to you?
                </h1>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Rate each area of life based on where you are today. This creates your personal values wheel — a living snapshot that evolves with your wellness journey.
                </p>
              </div>

              <ValuesWheelInput ratings={valuesRatings} onRatingsChange={setValuesRatings} />

              <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                <Button variant="outline" onClick={goBack} className="gap-2" data-testid="button-q-back-values">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  onClick={() => submitQuestionnaire.mutate()}
                  disabled={submitQuestionnaire.isPending || VALUES_CATEGORIES.some(c => !valuesRatings[c.id] || valuesRatings[c.id] < 1)}
                  className="gap-2"
                  data-testid="button-submit-questionnaire"
                >
                  {submitQuestionnaire.isPending ? "Building your plan..." : "Build My Plan"}
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
