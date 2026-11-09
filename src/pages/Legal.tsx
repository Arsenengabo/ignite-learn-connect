import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SITE, hasSupportEmail } from "@/config/site";
import logo from "@/assets/logo.png";

const formatDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const operatorName = () => SITE.operator.trim() || `the ${SITE.name} team`;

/** How to reach the people who run Codex. */
export const ContactLine = () =>
  hasSupportEmail() ? (
    <a href={`mailto:${SITE.supportEmail}`} className="text-primary underline underline-offset-2">
      {SITE.supportEmail}
    </a>
  ) : (
    <span>the {SITE.name} team, through your school administrator</span>
  );

const LegalLayout = ({ title, intro, children }: { title: string; intro: string; children: ReactNode }) => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2" aria-label={`${SITE.name} home`}>
          <img src={logo} alt="" className="h-7 w-7 object-contain dark:invert dark:brightness-200" />
          <span className="text-lg font-bold">{SITE.name}</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Home
        </Link>
      </div>
    </header>
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {formatDate(SITE.legalVersion)}</p>
      <p className="mt-6 text-lg leading-relaxed">{intro}</p>
      <div className="legal mt-8 space-y-8 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_section>*+*]:mt-3 [&_ul]:space-y-1.5">
        {children}
      </div>
      <nav className="mt-12 flex gap-6 border-t border-border pt-6 text-sm text-muted-foreground" aria-label="Legal">
        <Link to="/privacy" className="inline-flex items-center hover:text-foreground">Privacy Policy</Link>
        <Link to="/terms" className="inline-flex items-center hover:text-foreground">Terms of Use</Link>
      </nav>
    </main>
  </div>
);

export const PrivacyPage = () => (
  <LegalLayout
    title="Privacy Policy"
    intro={`This page explains what ${SITE.name} collects about you, why, who else handles it, and what you can ask us to do with it. It is written to follow Rwanda's Law No. 058/2021 relating to the protection of personal data and privacy.`}
  >
    <section>
      <h2>Who is responsible</h2>
      <p>
        {SITE.name} is run by {operatorName()}. For any question or request about your data, contact <ContactLine />.
      </p>
    </section>

    <section>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Your account:</strong> name, email address, password (stored scrambled, never readable), role (student, teacher, mentor or school administrator), and what you tell us at sign-up, such as your school, province and district, education level, subjects and organization.</li>
        <li><strong>Your learning:</strong> quiz and exam answers, marks, course progress, competition entries, and your daily activity streak.</li>
        <li><strong>Your study plan:</strong> courses, timetable, lecture transcripts, your own notes, and lecture summaries.</li>
        <li><strong>Messages and files:</strong> class chat messages, direct messages, and files that teachers upload for their courses or scan for marking.</li>
        <li><strong>Technical data:</strong> the information your browser needs to keep you signed in and to remember settings such as light or dark theme.</li>
      </ul>
      <p>Live lecture keeps only the text of a lecture. It never records or stores audio.</p>
    </section>

    <section>
      <h2>Why we use it</h2>
      <ul>
        <li>To run your account and show you your dashboard, classes, results and messages.</li>
        <li>To let your teachers and school see the work and results they need to teach you.</li>
        <li>To provide AI features you choose to use: lecture summaries, marking of written answers, and question generation.</li>
        <li>To keep {SITE.name} safe: checking teachers, mentors and school administrators, stopping misuse, and fixing problems.</li>
      </ul>
      <p>We use your data because you agree to it when you sign up, and because we need it to provide the service you asked for. We do not sell your data and we do not show advertising.</p>
    </section>

    <section>
      <h2>Who can see your data</h2>
      <ul>
        <li><strong>You.</strong> Your notes, study plan and lecture summaries are private to you.</li>
        <li><strong>Your teachers</strong> see your answers and results for their own quizzes and exams.</li>
        <li><strong>Your school administrator</strong> sees who has joined your school.</li>
        <li><strong>People you message</strong> see the messages you send them.</li>
        <li><strong>Mentors</strong> see what you share with them once you are connected.</li>
      </ul>
    </section>

    <section>
      <h2>Services that process data for us</h2>
      <p>{SITE.name} relies on a few services to work. Some of them store or process data outside Rwanda.</p>
      <ul>
        <li><strong>Lovable Cloud and Supabase</strong> host the database, sign-in and files.</li>
        <li><strong>Vercel</strong> hosts the website.</li>
        <li><strong>Google Gemini, through the Lovable AI gateway,</strong> processes text when you use an AI feature. That text can include lecture transcripts, your notes, written exam answers, and teachers' topics and questions.</li>
        <li><strong>Your browser's speech service</strong> (Google, in Chrome) turns speech into text during Live lecture.</li>
        <li><strong>Wikipedia</strong> receives the key terms of a lecture, without your name, so we can show reading suggestions.</li>
      </ul>
    </section>

    <section>
      <h2>Children</h2>
      <p>
        If you are under 16, a parent or guardian must agree before you create an account. Schools that register their
        students are responsible for having that agreement. If we learn that a child under 16 joined without it, we will
        delete the account.
      </p>
    </section>

    <section>
      <h2>How long we keep it</h2>
      <p>
        We keep your data while your account is open. If you ask us to delete your account, we delete your personal data,
        except what we must keep by law. Your teacher's records of marks for their exams may stay with the school.
      </p>
    </section>

    <section>
      <h2>Your rights</h2>
      <p>You can ask us to:</p>
      <ul>
        <li>show you the data we hold about you, or give you a copy;</li>
        <li>correct data that is wrong;</li>
        <li>delete your data or your account;</li>
        <li>stop using your data for a purpose you object to.</li>
      </ul>
      <p>You can withdraw your consent at any time. To make a request, contact <ContactLine />. You can also complain to Rwanda's National Cyber Security Authority (NCSA), which oversees data protection.</p>
    </section>

    <section>
      <h2>Keeping it safe</h2>
      <p>
        Data travels encrypted (HTTPS). The database checks who is asking before it returns anything, so each person only
        reaches what they are allowed to see, and marks can only be set by the marking system or the teacher. No system is
        perfect: if a breach affects your data, we will tell you and the authority as the law requires.
      </p>
    </section>

    <section>
      <h2>Changes</h2>
      <p>If we change this policy, we will update the date at the top and tell you in the app when the change is important.</p>
    </section>
  </LegalLayout>
);

export const TermsPage = () => (
  <LegalLayout
    title="Terms of Use"
    intro={`These terms are the rules for using ${SITE.name}. By creating an account you agree to them and to our Privacy Policy.`}
  >
    <section>
      <h2>Your account</h2>
      <ul>
        <li>Give true information when you sign up, and keep your password to yourself.</li>
        <li>If you are under 16, a parent or guardian must agree to these terms for you.</li>
        <li>Teacher, mentor and school administrator accounts are checked before they get full access. We may refuse or remove an account that does not pass.</li>
      </ul>
    </section>

    <section>
      <h2>Fair use</h2>
      <p>You must not:</p>
      <ul>
        <li>cheat in quizzes, exams or competitions, or try to change marks;</li>
        <li>use someone else's account, or pretend to be someone you are not;</li>
        <li>bully, harass or threaten anyone, or share content that is sexual, violent or hateful;</li>
        <li>upload material you do not have the right to share;</li>
        <li>try to break, overload or get around the security of {SITE.name}.</li>
      </ul>
      <p>We may remove content or suspend accounts that break these rules. Serious cases involving children are reported to the authorities.</p>
    </section>

    <section>
      <h2>Lectures and AI</h2>
      <ul>
        <li>Ask your lecturer before you capture a lecture with Live lecture.</li>
        <li>AI summaries, marks and questions can be wrong. Check important facts in your course materials. Teachers should review AI marks before they count.</li>
        <li>Use AI to learn, not to hand in work that is not yours. Follow your school's rules on AI.</li>
        <li>AI features have daily limits so they stay available for everyone.</li>
      </ul>
    </section>

    <section>
      <h2>Your content</h2>
      <p>
        What you create stays yours: notes, messages, courses and questions. You let {SITE.name} store and show it to the
        people it is meant for, so that the service can work.
      </p>
    </section>

    <section>
      <h2>The service</h2>
      <p>
        We work to keep {SITE.name} running and accurate, but we cannot promise it will always be available or free of
        mistakes. As far as the law allows, we are not responsible for losses caused by outages or by relying on AI output.
      </p>
    </section>

    <section>
      <h2>Ending your account</h2>
      <p>You can ask us to close your account at any time by contacting <ContactLine />.</p>
    </section>

    <section>
      <h2>Law</h2>
      <p>These terms follow the laws of Rwanda. If they change, we will update the date at the top and tell you in the app when the change is important.</p>
    </section>
  </LegalLayout>
);
