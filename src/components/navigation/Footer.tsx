import Link from "next/link";
import Image from "next/image";

const footerLinks = [
  { href: "/guidelines", label: "Community Guidelines" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/help", label: "Help" },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <Image
              src="/the-study-logo.png"
              alt="The Study L'école Internationale logo"
              fill
              sizes="40px"
              className="object-contain p-1"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              The Study Alumni Connect
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              A school-community initiative for current students and alumni.
            </p>
          </div>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-5 gap-y-3 text-sm"
        >
          {footerLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-medium text-slate-500 transition hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-5 py-4 text-xs leading-5 text-slate-400 sm:px-6 lg:px-8">
          Community, verification, moderation, privacy and safeguarding procedures should remain subject to school review and oversight before public launch.
        </div>
      </div>
    </footer>
  );
}
