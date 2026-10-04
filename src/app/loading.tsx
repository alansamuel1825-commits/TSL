export default function Loading() {
  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-4 w-44 rounded-full bg-slate-200" />
          <div className="mt-5 h-12 w-80 max-w-full rounded-2xl bg-slate-200" />
          <div className="mt-4 h-5 w-[34rem] max-w-full rounded-full bg-slate-100" />

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-44 rounded-[1.75rem] bg-white ring-1 ring-slate-200"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
