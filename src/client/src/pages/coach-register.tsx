import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Dumbbell,
  Target,
  Moon,
  Flame,
  Award,
  Users,
  MessageCircle,
  ClipboardList,
  Compass,
  Heart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const TOTAL_STEPS = 10;

const specialtyOptions = [
  { id: "fitness", label: "Fitness consistency", icon: Dumbbell },
  { id: "productivity", label: "Productivity & focus", icon: Target },
  { id: "sleep", label: "Sleep optimization", icon: Moon },
  { id: "stress", label: "Stress & burnout", icon: Flame },
];

const experienceOptions = [
  { id: "0-1", label: "0\u20131" },
  { id: "2-4", label: "2\u20134" },
  { id: "5-8", label: "5\u20138" },
  { id: "8+", label: "8+" },
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

const slideVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function CoachRegisterPage() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [sessionStyle, setSessionStyle] = useState("");
  const [clientTypes, setClientTypes] = useState<string[]>([]);
  const [maxClients, setMaxClients] = useState("");
  const [superpower, setSuperpower] = useState("");
  const [bio, setBio] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const toggleMultiSelect = (
    value: string,
    current: string[],
    setter: (v: string[]) => void,
  ) => {
    setter(
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    );
  };

  const deriveStyle = () => {
    if (sessionStyle === "structured") return "structured";
    if (sessionStyle === "conversational") return "gentle";
    return "direct";
  };

  const register = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/coach/register", {
        title: title || "Wellness Coach",
        bio,
        style: deriveStyle(),
        specialties: specialties.map(
          (id) => specialtyOptions.find((s) => s.id === id)?.label || id,
        ),
        onboardingData: {
          experience,
          certifications,
          sessionStyle,
          clientTypes,
          superpower,
        },
        maxClients: maxClients ? parseInt(maxClients, 10) : undefined,
        superpower,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/me"] });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to register. Please try again.",
        variant: "destructive",
      });
    },
  });

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const isLastStep = step === TOTAL_STEPS - 1;

  const canContinue = () => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return title.trim().length > 0;
      case 2:
        return specialties.length > 0;
      case 3:
        return experience !== "";
      case 4:
        return certifications.length > 0;
      case 5:
        return sessionStyle !== "";
      case 6:
        return true;
      case 7:
        return maxClients.trim().length > 0;
      case 8:
        return true;
      case 9:
        return true;
      default:
        return true;
    }
  };

  const renderCardSelect = (
    options: { id: string; label: string; icon?: typeof Dumbbell }[],
    selected: string[],
    onToggle: (id: string) => void,
    multi: boolean,
  ) => (
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = selected.includes(option.id);
        return (
          <Card
            key={option.id}
            className={`p-5 cursor-pointer transition-all duration-200 toggle-elevate ${isSelected ? "toggle-elevated border-primary bg-primary/5" : "hover:border-muted-foreground/20"}`}
            onClick={() => onToggle(option.id)}
            data-testid={`card-option-${option.id}`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}
              >
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                )}
              </div>
              {option.icon && (
                <option.icon
                  className={`w-5 h-5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                />
              )}
              <p className="text-sm font-semibold">{option.label}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );

  const renderSingleSelect = (
    options: { id: string; label: string; icon?: typeof Dumbbell }[],
    selected: string,
    onSelect: (id: string) => void,
  ) =>
    renderCardSelect(
      options,
      selected ? [selected] : [],
      (id) => onSelect(id),
      false,
    );

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
            <span className="text-xs text-muted-foreground">
              {step + 1} of {TOTAL_STEPS}
            </span>
            <div className="w-32">
              <Progress value={progress} className="h-2" data-testid="progress-bar" />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-welcome"
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
                <h1
                  className="font-serif text-3xl font-bold"
                  data-testid="text-coach-register-title"
                >
                  Let's set up your coaching profile
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  We'll walk you through a few quick questions to help us
                  understand your coaching style and expertise.
                </p>
              </div>
              <Button
                size="lg"
                onClick={goNext}
                className="gap-2"
                data-testid="button-welcome-continue"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-title"
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
                  <Award className="w-5 h-5 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-step-title">
                    What's your professional title?
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    This will appear on your profile for potential clients.
                  </p>
                </div>
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Wellness & Mindfulness Coach"
                className="text-sm border-2 focus:border-primary/50 transition-colors"
                data-testid="input-coach-title"
              />
              <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="gap-2"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  disabled={!canContinue()}
                  onClick={goNext}
                  className="gap-2"
                  data-testid="button-next"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-specialties"
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
                  <Target className="w-5 h-5 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-step-specialties">
                    What are your primary specialties?
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Select all that apply. These help us match you with the
                    right clients.
                  </p>
                </div>
              </div>
              {renderCardSelect(
                specialtyOptions,
                specialties,
                (id) => toggleMultiSelect(id, specialties, setSpecialties),
                true,
              )}
              <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="gap-2"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  disabled={!canContinue()}
                  onClick={goNext}
                  className="gap-2"
                  data-testid="button-next"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-experience"
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
                  <Compass className="w-5 h-5 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-step-experience">
                    Years of coaching experience
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    How long have you been coaching professionally?
                  </p>
                </div>
              </div>
              {renderSingleSelect(experienceOptions, experience, setExperience)}
              <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="gap-2"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  disabled={!canContinue()}
                  onClick={goNext}
                  className="gap-2"
                  data-testid="button-next"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step-certifications"
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
                  <ClipboardList className="w-5 h-5 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-step-certifications">
                    Are you certified?
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Select all certifications that apply.
                  </p>
                </div>
              </div>
              {renderCardSelect(
                certificationOptions,
                certifications,
                (id) =>
                  toggleMultiSelect(id, certifications, setCertifications),
                true,
              )}
              <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="gap-2"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  disabled={!canContinue()}
                  onClick={goNext}
                  className="gap-2"
                  data-testid="button-next"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step-session-style"
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
                  <MessageCircle className="w-5 h-5 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-step-session-style">
                    Your sessions tend to be...
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    How would you describe your typical coaching session?
                  </p>
                </div>
              </div>
              {renderSingleSelect(
                sessionStyleOptions,
                sessionStyle,
                setSessionStyle,
              )}
              <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="gap-2"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  disabled={!canContinue()}
                  onClick={goNext}
                  className="gap-2"
                  data-testid="button-next"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="step-client-types"
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
                  <Users className="w-5 h-5 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-step-client-types">
                    Who do you most enjoy working with?
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    This is optional — select all that apply or skip ahead.
                  </p>
                </div>
              </div>
              {renderCardSelect(
                clientTypeOptions,
                clientTypes,
                (id) => toggleMultiSelect(id, clientTypes, setClientTypes),
                true,
              )}
              <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="gap-2"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  onClick={goNext}
                  className="gap-2"
                  data-testid="button-next"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 7 && (
            <motion.div
              key="step-max-clients"
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
                  <Users className="w-5 h-5 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-step-max-clients">
                    Max number of clients you can take on
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    This helps us manage your availability and workload.
                  </p>
                </div>
              </div>
              <Input
                type="number"
                value={maxClients}
                onChange={(e) => setMaxClients(e.target.value)}
                placeholder="e.g., 15"
                className="text-sm text-center border-2 focus:border-primary/50 transition-colors max-w-xs mx-auto"
                min="1"
                data-testid="input-max-clients"
              />
              <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="gap-2"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  disabled={!canContinue()}
                  onClick={goNext}
                  className="gap-2"
                  data-testid="button-next"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 8 && (
            <motion.div
              key="step-superpower"
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
                  <Heart className="w-5 h-5 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-step-superpower">
                    My coaching superpower is...
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    What makes you uniquely effective as a coach? Share what
                    sets you apart.
                  </p>
                </div>
              </div>
              <Textarea
                value={superpower}
                onChange={(e) => setSuperpower(e.target.value)}
                placeholder="e.g., I have a knack for helping people see their blind spots with compassion, turning overwhelm into clear next steps..."
                className="resize-none min-h-[140px] text-sm border-2 focus:border-primary/50 transition-colors"
                data-testid="input-superpower"
              />
              <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="gap-2"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  onClick={goNext}
                  className="gap-2"
                  data-testid="button-next"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 9 && (
            <motion.div
              key="step-bio"
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
                  <Sparkles className="w-5 h-5 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-step-bio">
                    About You
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Write a short bio that clients will see on your profile.
                  </p>
                </div>
              </div>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your background, coaching philosophy, and what drives your approach. What should potential clients know about working with you?"
                className="resize-none min-h-[160px] text-sm border-2 focus:border-primary/50 transition-colors"
                data-testid="input-bio"
              />
              <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="gap-2"
                  data-testid="button-back-final"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  size="lg"
                  onClick={() => register.mutate()}
                  disabled={register.isPending}
                  className="gap-2"
                  data-testid="button-register-coach"
                >
                  {register.isPending
                    ? "Setting up..."
                    : "Create Coach Profile"}
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
