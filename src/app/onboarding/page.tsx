"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";
import {
  completeAlumniOnboarding,
  completeStudentOnboarding,
  createAlumniProfile,
  createStudentProfile,
  ensureOwnPublicProfile,
  getAlumniProfile,
  getStudentProfile,
  getUserProfile,
  type UserRole,
} from "@/lib/firebase/firestore";

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function StudentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <path d="m3 9 9-5 9 5-9 5-9-5Z" />
      <path d="M7 12.5V17c2.8 2 7.2 2 10 0v-4.5" />
    </svg>
  );
}

function AlumniIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-2 text-xs leading-5 text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [role, setRole] =
    useState<UserRole | null>(null);

  const [
    existingAccountRole,
    setExistingAccountRole,
  ] = useState<UserRole | null>(null);

  const [graduationYear, setGraduationYear] =
    useState("");

  const [interests, setInterests] =
    useState("");

  const [university, setUniversity] =
    useState("");
  const [degree, setDegree] = useState("");
  const [field, setField] = useState("");
  const [currentRole, setCurrentRole] =
    useState("");
  const [company, setCompany] = useState("");
  const [expertise, setExpertise] =
    useState("");
  const [bio, setBio] = useState("");
  const [
    mentorshipAvailable,
    setMentorshipAvailable,
  ] = useState(false);

  useEffect(() => {
    async function checkProfile() {
      if (loading) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const existingProfile =
          await getUserProfile(user.uid);

        if (existingProfile) {
          await ensureOwnPublicProfile(
            existingProfile,
          );

          const roleProfile =
            existingProfile.role === "student"
              ? await getStudentProfile(
                  user.uid,
                )
              : await getAlumniProfile(
                  user.uid,
                );

          if (roleProfile) {
            router.replace("/dashboard");
            return;
          }

          /*
           * Recovery for an older partial onboarding attempt:
           * keep the already-created account role and finish only
           * the missing role profile.
           */
          setExistingAccountRole(
            existingProfile.role,
          );
          setRole(
            existingProfile.role,
          );
          setName(
            existingProfile.displayName,
          );
          setStep(2);
          return;
        }

        setName(user.displayName ?? "");
      } catch (err) {
        console.error(err);

        setError(
          "We couldn't load your account. Please try again.",
        );
      } finally {
        setChecking(false);
      }
    }

    checkProfile();
  }, [loading, user, router]);

  if (loading || checking) {
    return (
      <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
          <div className="animate-pulse">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-200" />
            <div className="mx-auto mt-6 h-5 w-40 rounded-full bg-slate-200" />
            <div className="mx-auto mt-4 h-10 w-72 rounded-2xl bg-slate-200" />
            <div className="mx-auto mt-10 h-[420px] max-w-3xl rounded-[2rem] bg-white ring-1 ring-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  function nextStep() {
    setError("");

    if (step === 1 && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (step === 1 && !role) {
      setError(
        "Please select Student or Alumni.",
      );
      return;
    }

    if (
      step === 2 &&
      !graduationYear.trim()
    ) {
      setError(
        "Please enter your graduation year.",
      );
      return;
    }

    setStep((current) =>
      Math.min(3, current + 1),
    );
  }

  function previousStep() {
    setError("");
    setStep((current) =>
      Math.max(1, current - 1),
    );
  }

  async function finish() {
    if (!user || !role) return;

    setSaving(true);
    setError("");

    try {
      const interestList = interests
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const expertiseList = expertise
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (existingAccountRole) {
        if (
          existingAccountRole === "student"
        ) {
          await createStudentProfile(
            user.uid,
            {
              name: name.trim(),
              graduationYear:
                graduationYear.trim(),
              interests: interestList,
              bio: bio.trim(),
            },
          );
        } else {
          await createAlumniProfile(
            user.uid,
            {
              name: name.trim(),
              graduationYear:
                graduationYear.trim(),
              university:
                university.trim(),
              degree: degree.trim(),
              field: field.trim(),
              currentRole:
                currentRole.trim(),
              company:
                company.trim(),
              expertise:
                expertiseList,
              bio: bio.trim(),
              mentorshipAvailable,
            },
          );
        }
      } else if (role === "student") {
        await completeStudentOnboarding(
          user.uid,
          {
            email: user.email ?? "",
            displayName: name.trim(),
            photoURL: user.photoURL,
          },
          {
            graduationYear:
              graduationYear.trim(),
            interests: interestList,
            bio: bio.trim(),
          },
        );
      } else {
        await completeAlumniOnboarding(
          user.uid,
          {
            email: user.email ?? "",
            displayName: name.trim(),
            photoURL: user.photoURL,
          },
          {
            graduationYear:
              graduationYear.trim(),
            university:
              university.trim(),
            degree: degree.trim(),
            field: field.trim(),
            currentRole:
              currentRole.trim(),
            company:
              company.trim(),
            expertise:
              expertiseList,
            bio: bio.trim(),
            mentorshipAvailable,
          },
        );
      }

      router.replace("/dashboard");
    } catch (err) {
      console.error(err);

      setError(
        "We couldn't finish your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const progress = `${step * 33.333}%`;

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            <Image
              src="/the-study-logo.png"
              alt="The Study L'école Internationale logo"
              fill
              sizes="64px"
              className="object-contain p-1.5"
            />
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            The Study L&apos;école Internationale
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-5xl">
            Complete your profile.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            A few details help us create the right Alumni Connect
            experience for you.
          </p>
        </div>

        {/* PROGRESS */}
        <div className="mx-auto mt-10 max-w-3xl">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>
              Step {step} of 3
            </span>
            <span>
              {step === 1
                ? "About you"
                : step === 2
                  ? "Your journey"
                  : "Finish setup"}
            </span>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-700 transition-all duration-300"
              style={{ width: progress }}
            />
          </div>
        </div>

        {/* CARD */}
        <div className="mx-auto mt-7 max-w-3xl rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-[0_28px_90px_-60px_rgba(15,23,42,0.32)] sm:p-9 lg:p-10">
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          {step === 1 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Step one
              </p>

              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-3xl">
                First, tell us about yourself.
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                Choose the role that describes your relationship
                with The Study today.
              </p>

              <div className="mt-8">
                <Field label="Full name">
                  <input
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    className={inputClassName}
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                </Field>
              </div>

              <div className="mt-8">
                <p className="text-sm font-semibold text-slate-800">
                  I am a...
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        existingAccountRole
                      ) {
                        return;
                      }

                      setRole("student");
                    }}
                    disabled={
                      existingAccountRole !==
                        null &&
                      existingAccountRole !==
                        "student"
                    }
                    className={[
                      "rounded-[1.6rem] border p-6 text-left transition",
                      role === "student"
                        ? "border-blue-300 bg-blue-50 ring-4 ring-blue-500/5"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-11 w-11 items-center justify-center rounded-2xl",
                        role === "student"
                          ? "bg-blue-700 text-white"
                          : "bg-blue-50 text-blue-700",
                      ].join(" ")}
                    >
                      <StudentIcon />
                    </div>

                    <h3 className="mt-5 font-semibold text-slate-950">
                      Student
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      I currently study at The Study.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        existingAccountRole
                      ) {
                        return;
                      }

                      setRole("alumni");
                    }}
                    disabled={
                      existingAccountRole !==
                        null &&
                      existingAccountRole !==
                        "alumni"
                    }
                    className={[
                      "rounded-[1.6rem] border p-6 text-left transition",
                      role === "alumni"
                        ? "border-blue-300 bg-blue-50 ring-4 ring-blue-500/5"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-11 w-11 items-center justify-center rounded-2xl",
                        role === "alumni"
                          ? "bg-blue-700 text-white"
                          : "bg-blue-50 text-blue-700",
                      ].join(" ")}
                    >
                      <AlumniIcon />
                    </div>

                    <h3 className="mt-5 font-semibold text-slate-950">
                      Alumni
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      I previously studied at The Study.
                    </p>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={nextStep}
                className="mt-9 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Continue
                <ArrowRight />
              </button>
            </section>
          )}

          {step === 2 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Step two
              </p>

              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-3xl">
                Your journey with The Study.
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                Share the details that help other members understand
                your background and interests.
              </p>

              <div className="mt-8 grid gap-6">
                <Field
                  label={
                    role === "student"
                      ? "Expected graduation year"
                      : "Graduation year"
                  }
                >
                  <input
                    value={graduationYear}
                    onChange={(event) =>
                      setGraduationYear(
                        event.target.value,
                      )
                    }
                    placeholder="e.g. 2027"
                    inputMode="numeric"
                    className={inputClassName}
                  />
                </Field>

                {role === "student" && (
                  <Field
                    label="Interests"
                    hint="Separate interests with commas."
                  >
                    <input
                      value={interests}
                      onChange={(event) =>
                        setInterests(
                          event.target.value,
                        )
                      }
                      placeholder="e.g. AI, football, entrepreneurship"
                      className={inputClassName}
                    />
                  </Field>
                )}

                {role === "alumni" && (
                  <>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field label="University">
                        <input
                          value={university}
                          onChange={(event) =>
                            setUniversity(
                              event.target.value,
                            )
                          }
                          placeholder="University name"
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Degree">
                        <input
                          value={degree}
                          onChange={(event) =>
                            setDegree(
                              event.target.value,
                            )
                          }
                          placeholder="e.g. B.Tech Computer Science"
                          className={inputClassName}
                        />
                      </Field>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field label="Field">
                        <input
                          value={field}
                          onChange={(event) =>
                            setField(
                              event.target.value,
                            )
                          }
                          placeholder="e.g. Computer Science"
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Current role">
                        <input
                          value={currentRole}
                          onChange={(event) =>
                            setCurrentRole(
                              event.target.value,
                            )
                          }
                          placeholder="e.g. Software Engineer"
                          className={inputClassName}
                        />
                      </Field>
                    </div>

                    <Field label="Company / organization">
                      <input
                        value={company}
                        onChange={(event) =>
                          setCompany(
                            event.target.value,
                          )
                        }
                        placeholder="Optional"
                        className={inputClassName}
                      />
                    </Field>
                  </>
                )}

                <Field label="Short bio">
                  <textarea
                    value={bio}
                    onChange={(event) =>
                      setBio(event.target.value)
                    }
                    rows={5}
                    placeholder="Tell the community a little about yourself..."
                    className={`${inputClassName} resize-none`}
                  />
                </Field>
              </div>

              <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={previousStep}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Continue
                  <ArrowRight />
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Final step
              </p>

              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-3xl">
                {role === "alumni"
                  ? "How would you like to contribute?"
                  : "You're ready to join the community."}
              </h2>

              {role === "alumni" ? (
                <>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    Your experience can help current students make
                    better-informed decisions.
                  </p>

                  <div className="mt-8">
                    <Field
                      label="Areas of expertise"
                      hint="Separate areas with commas."
                    >
                      <input
                        value={expertise}
                        onChange={(event) =>
                          setExpertise(
                            event.target.value,
                          )
                        }
                        placeholder="e.g. AI, finance, medicine"
                        className={inputClassName}
                      />
                    </Field>
                  </div>

                  <label className="mt-6 flex cursor-pointer gap-4 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-200 hover:bg-blue-50/50">
                    <input
                      type="checkbox"
                      checked={
                        mentorshipAvailable
                      }
                      onChange={(event) =>
                        setMentorshipAvailable(
                          event.target.checked,
                        )
                      }
                      className="mt-0.5 h-5 w-5 accent-blue-700"
                    />

                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        I&apos;m open to mentoring students.
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-500">
                        Students will be able to send you mentorship
                        requests after your alumni profile is
                        verified.
                      </span>
                    </span>
                  </label>

                  <div className="mt-6 rounded-[1.6rem] border border-blue-100 bg-blue-50/70 p-5">
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          aria-hidden="true"
                          className="h-4 w-4"
                        >
                          <path
                            d="M10 2.5 16 5v4.4c0 3.7-2.4 6.4-6 8.1-3.6-1.7-6-4.4-6-8.1V5l6-2.5Z"
                            stroke="currentColor"
                            strokeWidth="1.4"
                          />
                          <path
                            d="m7.2 10 1.8 1.8 3.8-4"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Alumni verification
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          Your profile will be reviewed before it
                          appears as a verified alumni profile.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    Your profile will help Alumni Connect make the
                    community more relevant to your interests and
                    goals.
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {[
                      "Discover verified alumni",
                      "Request mentorship",
                      "Ask the community",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            aria-hidden="true"
                            className="h-4 w-4"
                          >
                            <path
                              d="m5.5 10 2.6 2.6 6-6"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <p className="mt-4 text-sm font-semibold leading-6 text-slate-800">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={previousStep}
                  disabled={saving}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={finish}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Creating your profile..."
                    : "Finish setup"}
                  {!saving && <ArrowRight />}
                </button>
              </div>
            </section>
          )}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-5 text-slate-400">
          Please provide accurate information. Alumni verification
          and community safeguards help keep the network trusted.
        </p>
      </div>
    </main>
  );
}
