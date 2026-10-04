import type { Metadata } from "next";

import PolicyShell, {
  PolicySection,
} from "@/components/content/PolicyShell";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Draft platform terms for The Study Alumni Connect.",
};

export default function TermsPage() {
  return (
    <PolicyShell
      eyebrow="Platform use"
      title="Terms of Use"
      intro="These draft terms describe the intended rules for participating in Alumni Connect and should be finalized by the school before public launch."
    >
      <PolicySection title="Who the platform is for">
        <p>
          Alumni Connect is intended for authorized current students, verified alumni and school-approved administrators associated with The Study L&apos;école Internationale.
        </p>
      </PolicySection>

      <PolicySection title="Your account">
        <p>
          Use accurate information, keep your sign-in credentials private and do not allow another person to use your account. You are responsible for activity carried out through your account.
        </p>
      </PolicySection>

      <PolicySection title="Alumni verification">
        <p>
          Creating an alumni account does not automatically make a member verified. Verification is a separate school-controlled review process.
        </p>
      </PolicySection>

      <PolicySection title="Acceptable use">
        <p>
          Members must follow the Community Guidelines and use Alumni Connect for appropriate community, education, mentorship and alumni-engagement purposes.
        </p>
        <p>
          Attempts to bypass access controls, impersonate another person, interfere with the service, misuse another member&apos;s information or exploit the platform are prohibited.
        </p>
      </PolicySection>

      <PolicySection title="Moderation and access">
        <p>
          The school may review reports and, under its final approved policy, suspend, restrict or remove access when reasonably necessary for safety, integrity, safeguarding or platform administration.
        </p>
      </PolicySection>

      <PolicySection title="Availability">
        <p>
          Alumni Connect is an evolving school-community project. Features may change, be unavailable temporarily or be removed as the platform is tested and improved.
        </p>
      </PolicySection>

      <PolicySection title="Final school policy">
        <p>
          Before broad release, the school should determine the final governing terms, privacy notice, moderation responsibilities, safeguarding escalation process and data-retention rules.
        </p>
      </PolicySection>
    </PolicyShell>
  );
}
