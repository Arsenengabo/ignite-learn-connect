import { useState, useEffect, useRef, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  Rocket,
  Users,
  BarChart3,
  Settings,
  ArrowRight,
  Video,
  MessageCircle,
  Shield,
  Brain,
  Scan,
  CreditCard,
  UserCheck,
  Bot,
  Trophy,
  Building,
  GraduationCap,
  Star,
  Play,
  Zap,
  Menu,
  X
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import logo from "@/assets/logo.png";

interface LandingPageProps {
  onGetStarted: () => void;
}

// Lightweight scroll-reveal wrapper -- no new dependency, just an
// IntersectionObserver. Content starts faded/offset and animates in
// once it enters the viewport, and only fires once per element.
const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Tailwind can't generate CSS for classes built at runtime (e.g.
// `bg-${color}/10`) -- it only scans literal strings in source at
// build time. This map keeps every class fully written out so the
// styles actually compile, while still letting the data below stay
// declarative.
const COLOR_CLASSES = {
  primary: {
    bg: "bg-primary/10", bgHover: "group-hover:bg-primary/20", text: "text-primary",
  },
  learning: {
    bg: "bg-learning/10", bgHover: "group-hover:bg-learning/20", text: "text-learning",
  },
  achievement: {
    bg: "bg-achievement/10", bgHover: "group-hover:bg-achievement/20", text: "text-achievement",
  },
} as const;

type ColorKey = keyof typeof COLOR_CLASSES;

const FEATURES = [
  { icon: Video, color: "primary", title: "Live Classes & Real-Time Exams", desc: "Interactive voice, video, and screen-sharing sessions with instant feedback and collaboration." },
  { icon: MessageCircle, color: "learning", title: "Community Servers for Classes", desc: "Each subject or school has its own \"server\" with chat channels and study rooms." },
  { icon: Shield, color: "achievement", title: "Secure Student Records", desc: "Track grades, awards, behavior, and performance in one comprehensive profile." },
  { icon: Brain, color: "primary", title: "AI Question Generator", desc: "Upload books or PDFs, and Codex creates practice questions instantly with AI." },
  { icon: Scan, color: "learning", title: "Smart Exam Scanner", desc: "Scan bubble sheets and grade them automatically with precision." },
  { icon: CreditCard, color: "achievement", title: "Digital Student Card", desc: "Pay fees, access transport, and get school materials with one ID." },
  { icon: UserCheck, color: "primary", title: "Roles & Permissions", desc: "Teachers, students, and employers have custom access levels and capabilities." },
  { icon: Bot, color: "learning", title: "AI Study Bots", desc: "24/7 tutor, reminders for exams, and motivation challenges." },
  { icon: Trophy, color: "achievement", title: "Gamification & Rewards", desc: "Earn points, badges, and climb leaderboards for achievements." },
  { icon: Building, color: "primary", title: "Employer Portal", desc: "Companies can find talent based on verified knowledge and skills." },
];

const COMMUNITY_ITEMS = [
  { icon: MessageCircle, color: "primary", title: "Chat & Voice Channels", desc: "Dedicated study groups with voice and text communication" },
  { icon: Bot, color: "learning", title: "AI Tutors", desc: "24/7 instant answers and personalized assistance" },
  { icon: Trophy, color: "achievement", title: "Leaderboards", desc: "Gamified motivation with competitive elements" },
  { icon: Shield, color: "primary", title: "Secure Environment", desc: "Moderated spaces with safety-first approach" },
];

const TESTIMONIALS = [
  { quote: "I love how Codex makes learning fun with study groups and challenges. The AI tutor helps me 24/7!", icon: GraduationCap, color: "primary", name: "Sarah Chen", role: "Computer Science Student" },
  { quote: "The live class + AI exam tools save me hours every week. My students are more engaged than ever!", icon: Users, color: "learning", name: "Prof. Michael Rodriguez", role: "Mathematics Teacher" },
  { quote: "Codex helps us find students who are truly job-ready. The skill verification is impressive!", icon: Building, color: "achievement", name: "Emily Johnson", role: "HR Director, TechCorp" },
];

export const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleJoinAsTeacher = () => {
    localStorage.setItem('preferredRole', 'teacher');
    onGetStarted();
  };

  const handleMobileNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return <div className="min-h-screen bg-background" style={{
    background: 'var(--gradient-hero)'
  }}>
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border transition-shadow duration-300 ${isScrolled ? 'shadow-md' : 'shadow-none'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img src={logo} alt="Codex Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain dark:invert dark:brightness-200 transition-transform duration-300 hover:scale-110" />
              <span className="text-lg sm:text-xl font-bold text-foreground">Codex</span>
            </div>
            
            {/* Mobile Menu */}
            <div className="flex md:hidden items-center space-x-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors relative group">
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors relative group">
                How It Works
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors relative group">
                Reviews
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </a>
              <ThemeToggle />
              <Button onClick={onGetStarted} variant="outline" className="transition-transform hover:scale-105">
                Sign In
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border z-40 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-4 space-y-4">
              <a 
                href="#features" 
                className="block text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={handleMobileNavClick}
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                className="block text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={handleMobileNavClick}
              >
                How It Works
              </a>
              <a 
                href="#testimonials" 
                className="block text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={handleMobileNavClick}
              >
                Reviews
              </a>
              <div className="pt-2 border-t border-border">
                <Button onClick={onGetStarted} variant="outline" className="w-full">
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 sm:mb-8 animate-fade-in">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-primary mr-2" />
            <span className="text-primary text-xs sm:text-sm font-medium">The Future of Connected Learning</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 sm:mb-6 leading-tight animate-slide-up px-2">
            Codex – Learn, Teach, and
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary to-learning bg-clip-text text-transparent">
              Connect in One Digital Space
            </span>
          </h1>
          
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed px-4 animate-fade-in">
            Live classes, AI exams, and a connected student community – all in one platform. 
            Experience Discord-inspired learning with professional education tools.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 animate-fade-in">
            <Button 
              onClick={onGetStarted} 
              size="lg" 
              className="bg-primary hover:bg-primary-dark text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 w-full sm:w-auto" 
              style={{ boxShadow: 'var(--shadow-primary)' }}
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Start Learning
            </Button>
            <Button 
              onClick={handleJoinAsTeacher} 
              variant="outline" 
              size="lg" 
              className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg rounded-xl border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 active:scale-95 w-full sm:w-auto"
            >
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Join as a Teacher
            </Button>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 px-4">
              Revolutionary Features for
              <br className="hidden sm:block" />
              <span className="text-primary">Modern Education</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              Combining the best of Discord's community features with professional education tools.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {FEATURES.map((f, i) => {
              const c = COLOR_CLASSES[f.color as ColorKey];
              return (
              <Reveal key={f.title} delay={(i % 3) * 100}>
                <Card className="learning-card group h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-lg ${c.bg} flex items-center justify-center mb-4 ${c.bgHover} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                      <f.icon className={`w-6 h-6 ${c.text}`} />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{f.title}</h3>
                    <p className="text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* How Codex Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 px-4">
              How Codex Works
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              Simple steps to transform your learning experience
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {[
              { num: "1", color: "primary", title: "Teachers Create", desc: "Teachers create classes and interactive exams with AI-powered tools and live session capabilities." },
              { num: "2", color: "learning", title: "Students Engage", desc: "Students join with a digital ID and engage in class communities with chat, voice, and study groups." },
              { num: "3", color: "achievement", title: "Employers Connect", desc: "Employers connect with students who match their skill needs based on verified achievements." },
            ].map((step, i) => {
              const c = COLOR_CLASSES[step.color as ColorKey];
              return (
              <Reveal key={step.num} delay={i * 150} className="text-center">
                <div className={`w-16 h-16 ${c.bg} rounded-full flex items-center justify-center mx-auto mb-6 transition-transform duration-300 hover:scale-110`}>
                  <span className={`text-2xl font-bold ${c.text}`}>{step.num}</span>
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-4">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 px-4">
              Benefits for Everyone
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
            {[
              { icon: GraduationCap, color: "primary", title: "For Students", items: ["Learn anywhere with mobile access", "Join study groups and communities", "Track progress with gamification", "Earn rewards and certificates"] },
              { icon: Users, color: "learning", title: "For Teachers", items: ["Manage classes with ease", "AI-powered exam creation", "Real-time student analytics", "Automated grading system"] },
              { icon: Building, color: "achievement", title: "For Employers", items: ["Access verified talent pool", "View skill-based achievements", "Connect with job-ready candidates", "Streamlined recruitment process"] },
            ].map((b, i) => {
              const c = COLOR_CLASSES[b.color as ColorKey];
              return (
              <Reveal key={b.title} delay={i * 120}>
                <Card className="learning-card h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="p-8 text-center">
                    <b.icon className={`w-16 h-16 ${c.text} mx-auto mb-6 transition-transform duration-300 hover:scale-110`} />
                    <h3 className="text-2xl font-semibold text-foreground mb-4">{b.title}</h3>
                    <ul className="space-y-3 text-muted-foreground">
                      {b.items.map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Community & Engagement Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 px-4">
              Discord-Inspired Learning
              <br className="hidden sm:block" />
              <span className="text-primary">Community</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
              Experience the future of connected education with secure, moderated environments
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {COMMUNITY_ITEMS.map((item, i) => {
              const c = COLOR_CLASSES[item.color as ColorKey];
              return (
              <Reveal key={item.title} delay={i * 100}>
                <Card className="learning-card group h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="p-6 text-center">
                    <item.icon className={`w-12 h-12 ${c.text} mx-auto mb-4 transition-transform duration-300 group-hover:scale-110`} />
                    <h3 className="text-lg font-semibold text-foreground mb-3">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </CardContent>
                </Card>
              </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              What Our Community Says
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Real feedback from students, teachers, and employers using Codex
            </p>
          </Reveal>

          <div className="grid lg:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => {
              const c = COLOR_CLASSES[t.color as ColorKey];
              return (
              <Reveal key={t.name} delay={i * 150}>
                <Card className="learning-card h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-4">
                      {[...Array(5)].map((_, s) => (
                        <Star key={s} className="w-5 h-5 text-achievement fill-current" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 italic">"{t.quote}"</p>
                    <div className="flex items-center">
                      <div className={`w-10 h-10 ${c.bg} rounded-full flex items-center justify-center mr-3`}>
                        <t.icon className={`w-5 h-5 ${c.text}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{t.name}</p>
                        <p className="text-sm text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/10 via-learning/10 to-achievement/10">
        <Reveal className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Codex is more than a platform –
            <br />
            <span className="bg-gradient-to-r from-primary to-learning bg-clip-text text-transparent">
              it's the future of connected learning
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join the revolution in education technology. Start building your learning community today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onGetStarted} 
              size="lg" 
              className="bg-primary hover:bg-primary-dark text-primary-foreground px-10 py-4 text-lg rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 animate-pulse-glow" 
              style={{ boxShadow: 'var(--shadow-primary)' }}
            >
              Sign Up Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              onClick={onGetStarted} 
              variant="outline" 
              size="lg" 
              className="px-10 py-4 text-lg rounded-xl border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 active:scale-95"
            >
              Request a Demo
            </Button>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="bg-background/80 border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <GraduationCap className="w-6 h-6 text-primary" />
                <span className="text-xl font-bold text-foreground">Codex</span>
              </div>
              <p className="text-muted-foreground mb-4">
                The future of connected learning - bringing together students, teachers, and employers in one digital space.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-125 inline-block">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-125 inline-block">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/></svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-125 inline-block">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-125 inline-block">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.222.085.343-.09.383-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.757-1.378l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z"/></svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-foreground font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Press</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-foreground font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a></li>
                <li><a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Reviews</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-foreground font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground">© 2025 Codex. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Privacy</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Terms</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
