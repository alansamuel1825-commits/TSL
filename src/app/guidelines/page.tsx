import type { Metadata } from "next";

import PolicyShell, {
  PolicySection,
} from "@/components/content/PolicyShell";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description:
    "Community and safeguarding guidelines for The Study Alumni Connect.",
};

export default function GuidelinesPage() {
  return (
    <PolicyShell
      eyebrow="Community & safety"
      title="Community Guidelines"
      intro="Alumni Connect is designed for respectful, useful and school-appropriate interaction between current students and verified alumni."
    >
      <PolicySection title="Be respectful and constructive">
        <p>
          Treat other members with respect. Harassment, threats, bullying, discrimination, humiliation, impersonation and deliberately disruptive behavior are not appropriate for this community.
        </p>
      </PolicySection>

      <PolicySection title="Keep mentoring appropriate">
        <p>
          Mentorship should focus on education, careers, skills, projects, university experiences and other appropriate guidance.
        </p>
        <p>
          Alumni and students should not pressure one another to share private contact details, photographs, passwords, financial information or other sensitive personal information.
        </p>
      </PolicySection>

      <PolicySection title="Student safeguarding">
        <p>
          Because current students may be minors, communication should remain professional and suitable for a school community. Members should use the platform&apos;s reporting and blocking tools when an interaction feels inappropriate, unsafe or concerning.
        </p>
        <p>
          Any in-person meeting, event or activity connected to the platform should follow school procedures and appropriate adult oversight rather than being arranged privately through the platform.
        </p>
      </PolicySection>

      <PolicySection title="Use accurate identities">
        <p>
          Members should provide truthful profile information. Alumni verification is controlled by the school and must not be represented as complete until the school has actually approved the profile.
        </p>
      </PolicySection>

      <PolicySection title="Keep content relevant">
        <p>
          Do not use Alumni Connect for spam, commercial solicitation, scams, chain messages, unrelated promotion or attempts to move students into unsafe or unmoderated spaces.
        </p>
      </PolicySection>

      <PolicySection title="Report concerns">
        <p>
          Use Report when a conversation or member needs review, and Block when you do not want further direct communication. Serious safety concerns should also be raised with an appropriate trusted adult or designated school staff member through official school channels.
        </p>
      </PolicySection>

      <PolicySection title="Moderation">
        <p>
          School-approved administrators may review reports, verify alumni, restrict access or take other proportionate moderation actions under the school&apos;s final policy.
        </p>
      </PolicySection>
    </PolicyShell>
  );
}
