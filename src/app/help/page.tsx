import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Help",
  description:
    "Help and support information for The Study Alumni Connect.",
};

const items = [
  {
    title: "Creating an account",
    text: "Use Google or email and password. Email-and-password accounts must verify their email address before accessing protected areas of the platform.",
  },
  {
    title: "Completing your profile",
    text: "After your first sign-in, complete onboarding as a student or alumnus. You can later update your information from Settings.",
  },
  {
    title: "Alumni verification",
    text: "An alumni profile remains pending until a school-approved administrator reviews and verifies it. Google sign-in or email verification does not replace school verification.",
  },
  {
    title: "Mentorship",
    text: "Students can request mentorship from verified alumni who have made themselves available. Accepted requests create a conversation for continued communication.",
  },
  {
    title: "Reporting and blocking",
    text: "Use the safety controls in Messages if a conversation is inappropriate or unwanted. Blocking stops direct interaction, while reporting sends the concern for administrator review.",
  },
  {
    title: "Password or email help",
    text: "Use Forgot password from the sign-in page for password recovery. If your email is not verified, use the verification page to resend the email and check your status.",
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            Help & support
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
            How Alumni Connect works
          </h1>

          <p className="mt-5 text-base leading-8 text-slate-600">
            Quick answers for signing in, profiles, verification, mentorship and safety.
          </p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.title}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6"
            >
              <h2 className="text-lg font-semibold text-slate-950">
                {item.title}
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                {item.text}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[2rem] border border-blue-100 bg-blue-50 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-blue-950">
            Need school assistance?
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-900/75">
            For account access, alumni verification, moderation, safety or privacy concerns that cannot be handled inside the platform, contact the designated school administrator through an official school communication channel.
          </p>

          <div className="mt-5 flex flex-wrap gap-4">
            <Link
              href="/guidelines"
              className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Community Guidelines
            </Link>

            <Link
              href="/privacy"
              className="rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
            >
              Privacy
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
