import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SITE } from "@/config/site";
import logo from "@/assets/logo.png";

/** The contact address, or a clearly marked gap until it is set. */
export const ContactEmail = () =>
  SITE.contactEmail ? (
    <a href={`mailto:${SITE.contactEmail}`} className="text-primary underline underline-offset-2">
      {SITE.contactEmail}
    </a>
  ) : (
    <mark className="rounded bg-amber-500/20 px-1 text-foreground">[contact email to be added]</mark>
  );

export const LegalLayout = ({ title, intro, children }: { title: string; intro: string; children: ReactNode }) => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold" aria-label="Codex home">
          <img src={logo} alt="" className="h-6 w-6 object-contain dark:invert dark:brightness-200" />
          Codex
        </Link>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Codex
        </Link>
      </div>
    </header>
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {SITE.legalUpdated}</p>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{intro}</p>
      <div className="legal mt-10 space-y-10 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-4 [&_h3]:font-semibold [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:text-muted-foreground [&_p]:text-muted-foreground [&_strong]:text-foreground [&_table]:mt-4 [&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:pr-3 [&_th]:text-left [&_td]:border-b [&_td]:border-border [&_td]:py-2 [&_td]:pr-3 [&_td]:align-top [&_td]:text-muted-foreground">
        {children}
      </div>
      <p className="mt-14 border-t border-border pt-6 text-sm text-muted-foreground">
        Questions about this page? Write to <ContactEmail />. See also the{" "}
        <Link to="/privacy" className="text-primary underline underline-offset-2">Privacy Policy</Link> and{" "}
        <Link to="/terms" className="text-primary underline underline-offset-2">Terms of Use</Link>.
      </p>
    </main>
  </div>
);
