import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      
      {/* Navigation */}
      

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="max-w-4xl">
          <p className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            TSL Alumni Connect
          </p>

          <h2 className="text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            One school.
            <br />
            Every generation.
          </h2>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-600">
            A trusted community connecting TSL students and alumni
            through mentorship, knowledge, opportunities and
            meaningful collaboration.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
  <Link
    href="/alumni"
    className="rounded-full bg-slate-900 px-7 py-3.5 text-center font-medium text-white hover:bg-slate-800"
  >
    Explore Alumni
  </Link>

  <Link
    href="/signup"
    className="rounded-full border border-slate-300 px-7 py-3.5 text-center font-medium hover:bg-slate-50"
  >
    Become a Mentor
  </Link>
</div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-y border-slate-200 bg-slate-50"
      >
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              What you can do
            </p>

            <h3 className="mt-3 text-3xl font-bold tracking-tight">
              Turn connections into opportunities.
            </h3>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Feature
              title="Find a Mentor"
              description="Connect with alumni whose experience matches your interests and goals."
            />

            <Feature
              title="Ask an Alumni"
              description="Get real-world answers from people who have already walked the path."
            />

            <Feature
  title="Manage Mentorship"
  description="Request mentorship, accept or decline requests, and chat directly once connected."
/>

            <Feature
              title="Build Together"
              description="Collaborate with alumni and students on meaningful projects."
            />
          </div>
        </div>
      </section>

      {/* Vision */}
      <section id="about" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              More than a directory
            </p>

            <h3 className="mt-3 text-4xl font-bold tracking-tight">
              A community that grows with every graduating class.
            </h3>
          </div>

          <div className="text-lg leading-8 text-slate-600">
            TSL Alumni Connect is designed to become a lasting
            bridge between generations of the school community —
            giving students access to experience, and giving alumni
            a meaningful way to give back.
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-slate-500">
          © {new Date().getFullYear()} TSL Alumni Connect
        </div>
      </footer>
    </main>
  );
}

function Feature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h4 className="font-semibold">{title}</h4>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}