import type { Metadata } from "next";

import PolicyShell, {
  PolicySection,
} from "@/components/content/PolicyShell";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Privacy information for The Study Alumni Connect.",
};

export default function PrivacyPage() {
  return (
    <PolicyShell
      eyebrow="Privacy"
      title="Privacy at Alumni Connect"
      intro="The platform should collect only the information needed to operate student–alumni profiles, mentorship, messaging, Q&A, verification and moderation."
    >
      <PolicySection title="Information used by the platform">
        <p>
          Account information can include your name, email address, sign-in provider, account role and account status.
        </p>
        <p>
          Student and alumni profiles can include graduation year, interests, education, field, current role, organization, expertise, biography and mentorship availability, depending on role.
        </p>
      </PolicySection>

      <PolicySection title="Community activity">
        <p>
          The platform stores information needed for mentorship requests, conversations, messages, Ask an Alumni questions and answers, reports, blocks and moderation actions.
        </p>
        <p>
          Do not put passwords, financial information, government identification numbers, medical details, home addresses or other highly sensitive personal information into public profiles, questions or messages.
        </p>
      </PolicySection>

      <PolicySection title="Who can see information">
        <p>
          Verified alumni profiles are intended to be visible to signed-in community members. Student profiles should remain more restricted, while administrators may access information needed for verification, safety and moderation.
        </p>
        <p>
          Private conversations should be limited to their participants and appropriately authorized school administrators when moderation or safeguarding requires review.
        </p>
      </PolicySection>

      <PolicySection title="Service providers and security">
        <p>
          Alumni Connect uses technology providers for services such as authentication, database storage and hosting. Those providers may process technical and account data as needed to provide their services.
        </p>
        <p>
          Access controls, authentication, database security rules, reporting and blocking are part of the platform design, but no online system should be described as risk-free.
        </p>
      </PolicySection>

      <PolicySection title="Retention and deletion">
        <p>
          The school should approve how long account, profile, message, moderation and verification records are kept, including what happens when a student leaves school or an alumnus asks to close an account.
        </p>
        <p>
          Before public launch, Alumni Connect should have a documented process for account deletion, data correction and any records that must be retained for legitimate safeguarding or administrative reasons.
        </p>
      </PolicySection>

      <PolicySection title="Questions or concerns">
        <p>
          Privacy questions should be directed through the school&apos;s designated Alumni Connect administrator or another official school channel.
        </p>
      </PolicySection>
    </PolicyShell>
  );
}
