import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ClipboardCheck,
  GraduationCap,
  HeartHandshake,
  Lock,
  Menu,
  Mic,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { rememberSignupIntent, type SignupRole } from "@/lib/signupIntent";
import { FeatureMarquee, HeroVideo, ProductTour, Reveal, type TourStep } from "@/components/landing/Showcase";
import logo from "@/assets/logo.png";

interface LandingPageProps {
  onGetStarted: () => void;
}

const NAV_LINKS = [
  { href: "#tour", label: "Tour" },
  { href: "#students", label: "Students" },
  { href: "#teachers", label: "Teachers" },
  { href: "#schools", label: "Schools" },
  { href: "#faq", label: "FAQ" },
];

const ROLES: { role: SignupRole; icon: LucideIcon; title: string; text: string }[] = [
  { role: "student", icon: GraduationCap, title: "Student", text: "Secondary school or university. Notes, practice and exams in one place." },
  { role: "teacher", icon: BookOpen, title: "Teacher", text: "Build quizzes and exams in minutes and see who needs help." },
  { role: "school_admin", icon: Building2, title: "School", text: "Bring your teachers and students together with one join code." },
  { role: "mentor", icon: HeartHandshake, title: "Mentor", text: "Guide students in your field. Profiles are checked before going live." },
];

const STUDENT_STEPS: { icon: LucideIcon; label: string; title: string; text: string; points: string[] }[] = [
  {
    icon: CalendarDays,
    label: "Before class",
    title: "Know what is coming",
    text: "Add your courses and timetable once. Codex shows today's classes and what is next.",
    points: ["Weekly timetable", "Course list with lecturers and credits"],
  },
  {
    icon: Mic,
    label: "In class",
    title: "Notes that write themselves",
    text: "Open Live lecture and keep listening. Codex writes down what the lecturer says and builds a summary as the class goes.",
    points: ["Key points and key terms", "What the lecturer stressed", "Likely exam questions"],
  },
  {
    icon: ClipboardCheck,
    label: "After class",
    title: "Practise until it sticks",
    text: "Take quizzes and exams from your teachers, ask the AI study assistant when you are stuck, and join class chats and competitions.",
    points: ["Quizzes with instant results", "AI study assistant", "Class chat and study groups"],
  },
];

const TEACHER_FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Sparkles, title: "AI question generator", text: "Turn your notes into multiple-choice and written questions, then edit before you publish." },
  { icon: ClipboardCheck, title: "Exams with fair marking", text: "Timed exams, marked on the server. Written answers get an AI first mark that you review." },
  { icon: ScanLine, title: "Paper answer sheets", text: "Print answer sheets and scan them with your phone to mark multiple-choice tests." },
  { icon: BookOpen, title: "Courses", text: "Publish lessons, files and videos for your students in modules." },
  { icon: BarChart3, title: "Class analytics", text: "See scores by student and question to know who needs help." },
  { icon: Trophy, title: "Competitions", text: "Run quiz competitions to keep revision lively." },
];

const SAFETY: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: UserCheck, title: "Checked accounts", text: "School admins and mentors are checked by the Codex team. Teachers are approved by their school." },
  { icon: Lock, title: "Marks you can trust", text: "Only the marking system or the teacher can set a grade. Students cannot change results." },
  { icon: ShieldCheck, title: "Private by default", text: "Your notes, study plan and messages are visible only to you and the people you share them with." },
];

const TOUR: TourStep[] = [
  {
    id: "plan",
    tab: "Plan your week",
    title: "Your semester at a glance",
    text: "Courses, timetable and today's classes in one place, with the next class highlighted.",
    desktop: { src: "/showcase/desk-study.webp", alt: "Codex Study tab on a computer: today's classes, live lecture button and past lectures" },
    phone: { src: "/showcase/phone-study.webp", alt: "Codex Study tab on a phone" },
  },
  {
    id: "lecture",
    tab: "Capture the lecture",
    title: "Every lecture, summarised",
    text: "The overview, what the lecturer stressed, key points, key terms with links to read more, and likely exam questions.",
    desktop: { src: "/showcase/desk-summary.webp", alt: "A lecture summary in Codex on a computer" },
    phone: { src: "/showcase/phone-summary.webp", alt: "A lecture summary in Codex on a phone" },
  },
  {
    id: "practise",
    tab: "Practise",
    title: "Quizzes from your teachers",
    text: "Short timed quizzes by subject and level. Results are marked on the server and saved to your progress.",
    desktop: { src: "/showcase/desk-quizzes.webp", alt: "Browse quizzes in Codex on a computer" },
    phone: { src: "/showcase/phone-quiz.webp", alt: "Answering a quiz question in Codex on a phone" },
  },
  {
    id: "teach",
    tab: "For teachers",
    title: "Your teaching toolkit",
    text: "Generate questions with AI, create quizzes and courses, print answer sheets and scan them to mark.",
    desktop: { src: "/showcase/desk-teacher-home.webp", alt: "Codex teacher dashboard with quick actions" },
    phone: { src: "/showcase/phone-home.webp", alt: "Codex student home on a phone" },
  },
  {
    id: "analytics",
    tab: "See who needs help",
    title: "Class analytics",
    text: "Score spread, pass rate and weak topics across your exams, with one tap to build a revision quiz.",
    desktop: { src: "/showcase/desk-analytics.webp", alt: "Codex class analytics: score distribution and weak topics" },
  },
];

const MARQUEE = [
  "Live lecture notes",
  "Lecture summaries",
  "Weekly timetable",
  "Quizzes",
  "Timed exams",
  "AI study assistant",
  "AI question generator",
  "Answer sheet scanning",
  "Class analytics",
  "Competitions",
  "Class chat",
  "Mentors",
  "School join codes",
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Who is Codex for?",
    a: "Secondary school and university students, their teachers, school administrators, and mentors who want to guide students. Each gets their own dashboard.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. Codex runs in your phone's browser, and you can install it like an app from the Install page. Live lecture listening works best in Chrome on Android or a computer.",
  },
  {
    q: "Do I need internet?",
    a: "Yes. Codex saves your work online so it is there on any device, and live lecture listening uses your browser's speech service, which needs a connection.",
  },
  {
    q: "How does my school join?",
    a: "A school administrator registers the school and gets a join code. Teachers and students sign up with that code and the administrator approves them. New school administrators are checked by the Codex team first.",
  },
  {
    q: "Is it allowed to capture my lecturer's lessons?",
    a: "Ask your lecturer first. Codex keeps only the text of the lecture, never the audio, and your notes are private to you.",
  },
  {
    q: "Can students change their marks?",
    a: "No. Quiz and exam results are calculated on Codex's servers. Only the marking system or the teacher who owns the exam can set a grade.",
  },
];

export const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const start = (tab: "signin" | "signup", role?: SignupRole) => {
    rememberSignupIntent(tab, role);
    setMenuOpen(false);
    onGetStarted();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="fixed top-0 inset-x-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between" aria-label="Main">
          <a href="#top" className="flex items-center gap-2" aria-label="Codex home">
            <img src={logo} alt="" className="w-7 h-7 object-contain dark:invert dark:brightness-200" />
            <span className="text-lg font-bold">Codex</span>
          </a>

          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => start("signin")}>
              Sign in
            </Button>
            <Button className="hidden sm:inline-flex" onClick={() => start("signup", "student")}>
              Get started
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </nav>

        {menuOpen && (
          <div id="mobile-menu" className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1 shadow-lg">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block py-3 text-base text-muted-foreground hover:text-foreground">
                {l.label}
              </a>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => start("signin")}>Sign in</Button>
              <Button onClick={() => start("signup", "student")}>Get started</Button>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative overflow-hidden pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{ background: "radial-gradient(60% 50% at 70% 20%, hsl(var(--primary) / 0.18), transparent 70%)" }}
          />
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs sm:text-sm font-medium text-primary">
                <Sparkles className="w-3.5 h-3.5" aria-hidden /> Built in Rwanda for students, teachers and schools
              </p>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight">
                Study smarter.{" "}
                <span className="text-primary">Teach faster.</span>{" "}
                All in one place.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Codex turns lectures into notes, notes into practice, and exams into results you can trust, for
                secondary schools and universities.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button size="lg" className="h-12 px-6 text-base" onClick={() => start("signup", "student")}>
                  Start learning <ArrowRight className="w-4 h-4 ml-2" aria-hidden />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-6 text-base" onClick={() => start("signup", "teacher")}>
                  I'm a teacher
                </Button>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start text-sm text-muted-foreground">
                {["Works in any phone browser", "Install it like an app", "Private by default"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-primary" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>

            <HeroVideo />
          </div>
        </section>

        <section aria-label="Features" className="pb-12 sm:pb-16">
          <FeatureMarquee items={MARQUEE} />
        </section>

        {/* Who are you */}
        <section aria-labelledby="roles-title" className="px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="max-w-6xl mx-auto">
            <h2 id="roles-title" className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Get started as
            </h2>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ROLES.map(({ role, icon: Icon, title, text }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => start("signup", role)}
                  className="group flex items-center gap-4 sm:block text-left rounded-xl border border-border bg-card p-4 sm:p-5 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="flex flex-shrink-0 items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" aria-hidden />
                    </span>
                    <ArrowRight className="hidden sm:block w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 sm:block">
                    <span className="block font-semibold sm:mt-4">{title}</span>
                    <span className="mt-0.5 sm:mt-1 block text-sm text-muted-foreground leading-snug sm:leading-relaxed">{text}</span>
                  </span>
                  <ArrowRight className="sm:hidden w-4 h-4 flex-shrink-0 text-muted-foreground" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Product tour */}
        <section id="tour" aria-labelledby="tour-title" className="scroll-mt-20 px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <SectionHeading
                eyebrow="See how it works"
                id="tour-title"
                title="On your phone and your computer"
                text="The same account everywhere. These are real Codex screens, shown with sample data."
              />
            </Reveal>
            <Reveal className="mt-10" delay={100}>
              <ProductTour steps={TOUR} />
            </Reveal>
          </div>
        </section>

        {/* Students */}
        <section id="students" aria-labelledby="students-title" className="scroll-mt-20 px-4 sm:px-6 py-16 sm:py-24 bg-muted/30 border-y border-border">
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              eyebrow="For students"
              id="students-title"
              title="From the first lecture to the final exam"
              text="Codex follows the way you actually study: before, during and after class."
            />
            <ol className="mt-10 grid md:grid-cols-3 gap-4">
              {STUDENT_STEPS.map(({ icon: Icon, label, title, text, points }, i) => (
                <li key={label} className="contents">
                <Reveal delay={i * 120} className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" aria-hidden />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {i + 1}. {label}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{text}</p>
                  <ul className="mt-4 space-y-2">
                    {points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" aria-hidden /> {p}
                      </li>
                    ))}
                  </ul>
                </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Teachers */}
        <section id="teachers" aria-labelledby="teachers-title" className="scroll-mt-20 px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-6xl mx-auto">
            <SectionHeading
              eyebrow="For teachers"
              id="teachers-title"
              title="Less marking. More teaching."
              text="Prepare, test and follow up with your classes in one place. You stay in control of every mark."
            />
            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEACHER_FEATURES.map(({ icon: Icon, title, text }, i) => (
                <Reveal key={title} delay={(i % 3) * 100} className="rounded-xl border border-border bg-card p-5">
                  <Icon className="w-6 h-6 text-primary" aria-hidden />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{text}</p>
                </Reveal>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button variant="outline" size="lg" onClick={() => start("signup", "teacher")}>
                Join as a teacher <ArrowRight className="w-4 h-4 ml-2" aria-hidden />
              </Button>
            </div>
          </div>
        </section>

        {/* Schools and safety */}
        <section id="schools" aria-labelledby="schools-title" className="scroll-mt-20 px-4 sm:px-6 py-16 sm:py-24 bg-muted/30 border-y border-border">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
              <SectionHeading
                align="left"
                eyebrow="For schools"
                id="schools-title"
                title="Your whole school, one join code"
                text="Register your school and share its code. Teachers and students join with it, and you approve each one, so only your people get in."
              />
              <ol className="mt-8 space-y-4">
                {[
                  "Register your school and get its join code.",
                  "Teachers and students sign up with the code.",
                  "You approve each request from your dashboard.",
                ].map((t, i) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{t}</span>
                  </li>
                ))}
              </ol>
              <Button className="mt-8" size="lg" onClick={() => start("signup", "school_admin")}>
                Register your school <ArrowRight className="w-4 h-4 ml-2" aria-hidden />
              </Button>
            </div>

            <Reveal className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="w-5 h-5 text-primary" aria-hidden /> Safe by design
              </h3>
              <ul className="mt-6 space-y-6">
                {SAFETY.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-4">
                    <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" aria-hidden />
                    </span>
                    <span>
                      <span className="block font-medium">{title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground leading-relaxed">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-3xl mx-auto">
            <SectionHeading eyebrow="FAQ" id="faq-title" title="Questions, answered" />
            <Accordion type="single" collapsible className="mt-8">
              {FAQ.map(({ q, a }) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left text-base">{q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final call to action */}
        <section className="px-4 sm:px-6 pb-16 sm:pb-24">
          <div className="max-w-6xl mx-auto rounded-2xl bg-primary px-6 py-12 sm:px-12 text-center text-primary-foreground">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">Ready for your next class?</h2>
            <p className="mt-3 text-base sm:text-lg opacity-90">Set up your account in a few minutes.</p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" variant="secondary" className="h-12 px-6 text-base" onClick={() => start("signup", "student")}>
                Start learning
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-6 text-base bg-transparent border-primary-foreground/60 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={() => start("signup", "teacher")}
              >
                I'm a teacher
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="w-6 h-6 object-contain dark:invert dark:brightness-200" />
            <span className="font-bold">Codex</span>
            <span className="text-sm text-muted-foreground">· Learn, teach, connect</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm leading-5 text-muted-foreground">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="inline-flex items-center hover:text-foreground">
                {l.label}
              </a>
            ))}
            <Link to="/install" className="inline-flex items-center hover:text-foreground">
              Install the app
            </Link>
            <Link to="/privacy" className="inline-flex items-center hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="inline-flex items-center hover:text-foreground">
              Terms
            </Link>
            <button type="button" onClick={() => start("signin")} className="p-0 text-sm leading-5 hover:text-foreground">
              Sign in
            </button>
          </nav>
        </div>
        <p className="max-w-6xl mx-auto mt-6 text-xs text-muted-foreground">© {new Date().getFullYear()} Codex</p>
      </footer>
    </div>
  );
};

const SectionHeading = ({
  eyebrow,
  title,
  text,
  id,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  text?: string;
  id: string;
  align?: "center" | "left";
}) => (
  <div className={align === "center" ? "text-center max-w-2xl mx-auto" : "max-w-xl"}>
    <p className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
    <h2 id={id} className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
      {title}
    </h2>
    {text && <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">{text}</p>}
  </div>
);
