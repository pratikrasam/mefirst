import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Heart, Brain, Users, ArrowRight, Sparkles, Target, CalendarCheck, TrendingUp, ChevronDown, Shield, Clock } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const steps = [
  {
    number: "01",
    title: "Sign Up & Set Goals",
    description: "Create your account and tell us what matters most - sleep, stress, fitness, or overall wellness.",
    icon: Target,
    color: "bg-primary/10 dark:bg-primary/20",
    iconColor: "text-primary",
  },
  {
    number: "02",
    title: "Complete Your Profile",
    description: "A brief wellness questionnaire and values assessment to understand your unique needs.",
    icon: Brain,
    color: "bg-chart-3/10 dark:bg-chart-3/20",
    iconColor: "text-chart-3",
  },
  {
    number: "03",
    title: "Get Matched",
    description: "Choose your preferred coaching style and we'll recommend the perfect coach for you.",
    icon: Users,
    color: "bg-chart-4/10 dark:bg-chart-4/20",
    iconColor: "text-chart-4",
  },
  {
    number: "04",
    title: "Book & Begin",
    description: "Schedule your first session, clarify goals, and start your transformation journey.",
    icon: CalendarCheck,
    color: "bg-chart-2/10 dark:bg-chart-2/20",
    iconColor: "text-chart-2",
  },
  {
    number: "05",
    title: "Grow & Thrive",
    description: "Track progress, get personalized recommendations, and continuous support from your coach.",
    icon: TrendingUp,
    color: "bg-chart-5/10 dark:bg-chart-5/20",
    iconColor: "text-chart-5",
  },
];

const features = [
  {
    icon: Heart,
    title: "Holistic Wellness",
    description: "Address mental, physical, and emotional health with a comprehensive approach tailored to your life.",
  },
  {
    icon: Shield,
    title: "Expert Coaches",
    description: "Work with certified professionals who specialize in the areas that matter most to you.",
  },
  {
    icon: Clock,
    title: "Flexible Scheduling",
    description: "Book sessions that fit your calendar. Your wellness journey adapts to your lifestyle.",
  },
];



export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-bold" data-testid="text-logo">MeFirst</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-how-it-works">How It Works</a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">Features</a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" asChild data-testid="button-login">
              <a href="/api/login">Log In</a>
            </Button>
            <Button asChild data-testid="button-get-started">
              <a href="/api/login">Get Started</a>
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="button-coach-login" onClick={() => { localStorage.setItem("mefirst-coach-intent", "true"); window.location.href = "/api/login"; }}>
              I'm a Coach
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent dark:from-primary/10" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl dark:bg-primary/10" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-chart-3/5 rounded-full blur-3xl dark:bg-chart-3/10" />

        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 dark:bg-primary/20">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Personal Wellness Coaching</span>
              </motion.div>

              <motion.h1 variants={fadeUp} custom={1} className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                Put Yourself{" "}
                <span className="text-primary">First</span>
                <br />
                for a Change
              </motion.h1>

              <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                Discover personalized wellness coaching that adapts to your goals, lifestyle, and preferred way of growing. Your journey to a healthier, happier you starts here.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="flex items-center gap-3 flex-wrap">
                <Button size="lg" asChild data-testid="button-hero-cta">
                  <a href="/api/login" className="gap-2">
                    Start Your Journey <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild data-testid="button-hero-learn">
                  <a href="#how-it-works">Learn More</a>
                </Button>
              </motion.div>

            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              <div className="relative rounded-md overflow-hidden ring-1 ring-border">
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent z-10" />
                <img
                  src="/images/hero-wellness.png"
                  alt="Wellness coaching"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-card border rounded-md p-4 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" data-testid="text-stat-progress">87% report progress</p>
                    <p className="text-xs text-muted-foreground">within 30 days</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="flex justify-center mt-16">
          <a href="#how-it-works" className="animate-bounce text-muted-foreground">
            <ChevronDown className="w-5 h-5" />
          </a>
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-card/50 dark:bg-card/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary mb-2">How It Works</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-serif text-3xl sm:text-4xl font-bold mb-4">
              Your Path to Wellness
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-2xl mx-auto">
              Five simple steps to connect with the right coach and start making meaningful changes in your life.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                custom={i}
                variants={fadeUp}
                className={i >= 3 ? "lg:col-span-1 md:col-span-1" : ""}
              >
                <Card className="p-6 h-full hover-elevate">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-md ${step.color} flex items-center justify-center flex-shrink-0`}>
                      <step.icon className={`w-5 h-5 ${step.iconColor}`} />
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-mono text-muted-foreground">Step {step.number}</span>
                      <h3 className="font-semibold text-base" data-testid={`text-step-title-${step.number}`}>{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary mb-2">Features</motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="font-serif text-3xl sm:text-4xl font-bold mb-4">
              Built for Your Wellbeing
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to take charge of your health and happiness, in one place.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                custom={i}
                variants={fadeUp}
              >
                <Card className="p-6 h-full text-center hover-elevate">
                  <div className="w-12 h-12 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2" data-testid={`text-feature-${i}`}>{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="space-y-6"
          >
            <motion.h2 variants={fadeUp} custom={0} className="font-serif text-3xl sm:text-4xl font-bold">
              Ready to Put Yourself First?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-lg mx-auto">
              Take the first step toward a healthier, more balanced life with personalized coaching tailored to you.
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <Button size="lg" asChild data-testid="button-cta-bottom">
                <a href="/api/login" className="gap-2">
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
            </motion.div>
            <motion.p variants={fadeUp} custom={3} className="text-xs text-muted-foreground">
              No credit card required
            </motion.p>
          </motion.div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-serif text-sm font-semibold">MeFirst</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-coach-login" onClick={(e) => { e.preventDefault(); localStorage.setItem("mefirst-coach-intent", "true"); window.location.href = "/api/login"; }}>
              Coach Login
            </a>
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} MeFirst. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
