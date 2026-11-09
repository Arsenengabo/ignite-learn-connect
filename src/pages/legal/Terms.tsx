import { Link } from "react-router-dom";
import { ContactEmail, LegalLayout } from "./LegalLayout";

const Terms = () => (
  <LegalLayout
    title="Terms of Use"
    intro="These terms are the rules for using Codex. By creating an account or using Codex, you agree to them. Please read them together with our Privacy Policy."
  >
    <section aria-labelledby="who-can">
      <h2 id="who-can">1. Who can use Codex</h2>
      <ul>
        <li>Anyone 16 or older can create an account. If you are under 16, your parent or guardian must agree first.</li>
        <li>Choose the role that is true for you. School admin and mentor accounts are checked by the Codex team, and teachers are approved by their school, before they get full access.</li>
        <li>Keep your password private. You are responsible for what happens in your account; tell us quickly if you think someone else is using it.</li>
      </ul>
    </section>

    <section aria-labelledby="fair">
      <h2 id="fair">2. Learn and teach fairly</h2>
      <ul>
        <li>Do your own work in quizzes and exams. Do not try to see answers early, change marks, or get around exam time limits or proctoring.</li>
        <li>Use AI features to understand and practise, not to submit work that is not yours where your school forbids it.</li>
        <li>Ask your lecturer or teacher before capturing their lessons with Live lecture.</li>
      </ul>
    </section>

    <section aria-labelledby="respect">
      <h2 id="respect">3. Respect other people</h2>
      <ul>
        <li>No bullying, harassment, hate, threats, or sexual content in chats, messages or uploads.</li>
        <li>Do not share other people's personal information, or photos or recordings of them, without their permission.</li>
        <li>Mentors must keep conversations with students about learning and careers, and never ask students to move to private channels outside Codex.</li>
        <li>Report anything worrying to your teacher, your school or us at <ContactEmail />.</li>
      </ul>
    </section>

    <section aria-labelledby="security-rules">
      <h2 id="security-rules">4. Keep Codex safe</h2>
      <ul>
        <li>Do not try to access accounts, data or parts of Codex that are not yours, or test our security without our written permission.</li>
        <li>Do not overload the service, scrape it, or get around usage limits, including the daily limits on AI features.</li>
        <li>Do not upload viruses or harmful files.</li>
      </ul>
    </section>

    <section aria-labelledby="content">
      <h2 id="content">5. Your content</h2>
      <p>
        You keep ownership of what you create: your notes, answers, messages, and the courses and questions teachers
        write. You allow Codex to store, show and process this content only to run the service for you and the people you
        share it with. Only upload material you have the right to share.
      </p>
    </section>

    <section aria-labelledby="ai">
      <h2 id="ai">6. AI features</h2>
      <p>
        Lecture summaries, generated questions and AI marking can be wrong or incomplete. Check important facts against
        your textbook and your teacher. Teachers should review AI marks before they count. Marks set by your teacher are
        the official ones.
      </p>
    </section>

    <section aria-labelledby="service">
      <h2 id="service">7. The service</h2>
      <ul>
        <li>We work to keep Codex available and accurate, but it may sometimes be unavailable or contain mistakes. Keep your own copy of anything essential.</li>
        <li>We may change, add or remove features. We will tell you in advance about changes that significantly affect you.</li>
        <li>We may suspend or close accounts that break these terms. Where possible we will tell you why first.</li>
        <li>You can stop using Codex at any time and ask us to delete your account.</li>
      </ul>
    </section>

    <section aria-labelledby="liability">
      <h2 id="liability">8. Responsibility</h2>
      <p>
        Codex is a learning aid. As far as the law allows, we are not responsible for exam results, decisions made using
        Codex, or losses caused by events outside our reasonable control. Nothing in these terms limits rights you have
        under the law that cannot be limited.
      </p>
    </section>

    <section aria-labelledby="law">
      <h2 id="law">9. Law and contact</h2>
      <p>
        These terms are governed by the laws of the Republic of Rwanda. If we update them, we will change the date above
        and tell you in the app before important changes take effect. Questions: <ContactEmail />. See our{" "}
        <Link to="/privacy" className="text-primary underline underline-offset-2">Privacy Policy</Link> for how we handle your information.
      </p>
    </section>
  </LegalLayout>
);

export default Terms;
