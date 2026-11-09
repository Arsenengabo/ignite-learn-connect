import { Link } from "react-router-dom";
import { ContactEmail, LegalLayout } from "./LegalLayout";

/**
 * Plain-language privacy policy, written from what the Codex code actually collects
 * (November 2026). Keep it in step with the app: update it when data use changes.
 */
const PrivacyPolicy = () => (
  <LegalLayout
    title="Privacy Policy"
    intro="This page explains what information Codex keeps about you, why, who helps us run the service, and the choices and rights you have. We wrote it in plain language. If anything is unclear, ask us."
  >
    <section aria-labelledby="who">
      <h2 id="who">1. Who we are</h2>
      <p>
        Codex is a learning platform for students, teachers, schools and mentors, built in Rwanda. In this policy,
        "Codex", "we" and "us" mean the team that runs Codex. You can reach us at <ContactEmail /> for any privacy
        question or request.
      </p>
      <p>
        Rwanda's Law N° 058/2021 of 13/10/2021 relating to the protection of personal data and privacy applies to the
        personal data we handle. The supervisory authority is the National Cyber Security Authority (NCSA).
      </p>
    </section>

    <section aria-labelledby="what">
      <h2 id="what">2. What we collect</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Information</th>
            <th scope="col">Examples</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Account details</strong></td>
            <td>Your name, email address, password (stored only in scrambled, hashed form) and role: student, teacher, mentor or school admin.</td>
          </tr>
          <tr>
            <td><strong>Profile and school</strong></td>
            <td>School or organization, education level, subjects, province and district, a short description of your role, and your school membership.</td>
          </tr>
          <tr>
            <td><strong>Learning activity</strong></td>
            <td>Quiz and exam answers and results, course progress, competition entries and your daily learning streak.</td>
          </tr>
          <tr>
            <td><strong>Study tab</strong></td>
            <td>Your courses, timetable, the text of lectures you capture with Live lecture, your own notes and the summaries made from them. We keep the text only, never the audio.</td>
          </tr>
          <tr>
            <td><strong>Messages</strong></td>
            <td>Class chat messages, direct messages and mentor requests.</td>
          </tr>
          <tr>
            <td><strong>Files</strong></td>
            <td>Course materials teachers upload and scanned answer sheets.</td>
          </tr>
          <tr>
            <td><strong>Usage and errors</strong></td>
            <td>Which pages are visited and error reports when something breaks, with the web address but without anything after a "?" or "#" in it. These are not linked to your name or email.</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Proctored exams:</strong> when a teacher turns on proctoring, your camera and microphone stay on during
        the exam and are checked on your own device. Nothing from them is recorded or uploaded. Leaving the exam tab,
        exiting full screen, or copy and paste are counted as warnings, and too many may submit the exam.
      </p>
    </section>

    <section aria-labelledby="why">
      <h2 id="why">3. Why we use it</h2>
      <ul>
        <li>To run your account and show you your courses, quizzes, exams, notes and messages.</li>
        <li>To mark quizzes and exams and show results to you and your teacher.</li>
        <li>To let schools approve their teachers and students, and to check new school admins and mentors before students can see them.</li>
        <li>To make AI features work, such as lecture summaries and marking of written answers (see section 4).</li>
        <li>To keep Codex safe and working: stopping misuse, limiting AI use, and fixing errors.</li>
      </ul>
      <p>
        We use your information because you agree to it when you create an account, and because we need it to provide the
        service you asked for. We do not sell your personal data and we do not show advertising.
      </p>
    </section>

    <section aria-labelledby="who-sees">
      <h2 id="who-sees">4. Who sees your information</h2>
      <h3>Inside Codex</h3>
      <ul>
        <li><strong>Your teachers</strong> see your answers and results for their own quizzes and exams.</li>
        <li><strong>Your school's admin</strong> sees your membership of their school and basic profile details.</li>
        <li><strong>Classmates</strong> see your name and the messages you post in shared chats.</li>
        <li>Your Study tab notes, lecture text and summaries are visible <strong>only to you</strong>.</li>
      </ul>
      <h3>Services that help us run Codex</h3>
      <table>
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">What it does</th>
            <th scope="col">What it receives</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Lovable Cloud (built on Supabase)</td>
            <td>Database, sign-in and file storage</td>
            <td>Everything listed in section 2 except usage and error reports</td>
          </tr>
          <tr>
            <td>Vercel</td>
            <td>Delivers the website</td>
            <td>Standard web request details such as your IP address</td>
          </tr>
          <tr>
            <td>Lovable AI Gateway, using Google's Gemini models</td>
            <td>AI summaries, question generation and marking of written answers</td>
            <td>The text needed for the task: lecture text and your notes, written exam answers with the question, or a teacher's topic</td>
          </tr>
          <tr>
            <td>Your browser's speech service (Google, in Chrome)</td>
            <td>Turns speech into text during Live lecture</td>
            <td>The lecture audio while you are listening, handled by your browser's provider</td>
          </tr>
          <tr>
            <td>Wikipedia</td>
            <td>"Read more" links in lecture summaries</td>
            <td>Only the key terms being looked up, never your name or notes</td>
          </tr>
          <tr>
            <td>PostHog</td>
            <td>Page visit counts and error reports</td>
            <td>Pages visited and error details, not linked to your name or email</td>
          </tr>
        </tbody>
      </table>
      <p>
        We may also share information if the law requires it, or to protect the safety of our users.
      </p>
    </section>

    <section aria-labelledby="where">
      <h2 id="where">5. Where your information is stored</h2>
      <p>
        The services above store and process data on servers outside Rwanda. By creating an account you consent to this
        transfer. We choose services that protect data with encryption in transit and access controls, and we limit what
        each one receives to what it needs.
      </p>
    </section>

    <section aria-labelledby="keep">
      <h2 id="keep">6. How long we keep it</h2>
      <ul>
        <li>Account, learning and Study tab information: while your account is open. You can delete lectures and notes yourself at any time.</li>
        <li>When you ask us to delete your account, we delete your personal data within 30 days, except what the law requires us to keep.</li>
        <li>Usage and error reports: up to 12 months.</li>
      </ul>
    </section>

    <section aria-labelledby="children">
      <h2 id="children">7. Students under 16</h2>
      <p>
        If you are under 16, a parent or guardian must agree before you create an account. When you sign up you confirm
        that you are 16 or older, or that your parent or guardian has agreed. A parent or guardian can ask us at
        any time to see, correct or delete their child's information.
      </p>
    </section>

    <section aria-labelledby="rights">
      <h2 id="rights">8. Your rights</h2>
      <p>You can ask us to:</p>
      <ul>
        <li>tell you what information we hold about you and give you a copy;</li>
        <li>correct information that is wrong;</li>
        <li>delete your information or your account;</li>
        <li>stop using your information for a particular purpose, or withdraw your consent;</li>
        <li>give you your information in a format you can take elsewhere.</li>
      </ul>
      <p>
        Write to <ContactEmail /> from the email address on your account. We will reply within 30 days. If you are not
        satisfied with our answer, you can complain to the National Cyber Security Authority (NCSA).
      </p>
    </section>

    <section aria-labelledby="security">
      <h2 id="security">9. Security</h2>
      <p>
        Access to data is limited by account and role: for example, students cannot see or change other people's
        results, and only the marking system or the teacher can set a grade. Passwords are stored hashed. Data is
        encrypted between your device and our services. If a data breach puts you at risk, we will tell you and the
        authorities as the law requires.
      </p>
    </section>

    <section aria-labelledby="device">
      <h2 id="device">10. Information stored on your device</h2>
      <p>
        Codex stores a few small items in your browser: your sign-in session, your light or dark theme, and on the home
        page the role you picked before signing up. PostHog stores an anonymous visitor identifier so page visits can be
        counted. We do not use advertising cookies.
      </p>
    </section>

    <section aria-labelledby="changes">
      <h2 id="changes">11. Changes to this policy</h2>
      <p>
        If we change how we use your information, we will update this page and its date, and tell you in the app before
        important changes take effect. See also our <Link to="/terms" className="text-primary underline underline-offset-2">Terms of Use</Link>.
      </p>
    </section>
  </LegalLayout>
);

export default PrivacyPolicy;
