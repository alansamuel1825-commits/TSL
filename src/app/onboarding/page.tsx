"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";

import {
  createAlumniProfile,
  createStudentProfile,
  createUserProfile,
  getUserProfile,
  UserRole,
} from "@/lib/firebase/firestore";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);

  const [graduationYear, setGraduationYear] = useState("");

  const [interests, setInterests] = useState("");

  const [university, setUniversity] = useState("");
  const [degree, setDegree] = useState("");
  const [field, setField] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [company, setCompany] = useState("");
  const [expertise, setExpertise] = useState("");
  const [bio, setBio] = useState("");
  const [mentorshipAvailable, setMentorshipAvailable] =
    useState(false);

  useEffect(() => {
    async function checkProfile() {
      if (loading) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const existingProfile = await getUserProfile(user.uid);

        if (existingProfile) {
          router.replace("/dashboard");
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">
          Preparing your profile...
        </p>
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
      setError("Please select Student or Alumni.");
      return;
    }

    if (step === 2 && !graduationYear) {
      setError("Please enter your graduation year.");
      return;
    }

    setStep((current) => current + 1);
  }

  async function finish() {
    if (!user || !role) return;

    setSaving(true);
    setError("");

    try {
      await createUserProfile(user.uid, {
        email: user.email ?? "",
        displayName: name.trim(),
        role,
        photoURL: user.photoURL,
      });

      const interestList = interests
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const expertiseList = expertise
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (role === "student") {
        await createStudentProfile(user.uid, {
          name: name.trim(),
          graduationYear,
          interests: interestList,
          bio,
        });
      }

      if (role === "alumni") {
        await createAlumniProfile(user.uid, {
          name: name.trim(),
          graduationYear,
          university,
          degree,
          field,
          currentRole,
          company,
          expertise: expertiseList,
          bio,
          mentorshipAvailable,
        });
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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            TSL ALUMNI CONNECT
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            Complete your profile
          </h1>

          <p className="mt-3 text-slate-600">
            A few details will help us personalize TSL Connect.
          </p>
        </div>

        <div className="mb-6 flex gap-2">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className={`h-1 flex-1 rounded-full ${
                item <= step
                  ? "bg-slate-900"
                  : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 1 && (
            <section>
              <h2 className="text-2xl font-semibold">
                First, tell us about yourself
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                This information will be used to personalize your experience.
              </p>

              <div className="mt-8">
                <label className="mb-2 block text-sm font-medium">
                  Full name
                </label>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="Your full name"
                />
              </div>

              <div className="mt-8">
                <p className="text-sm font-medium">
                  I am a...
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">

                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`rounded-2xl border p-6 text-left ${
                      role === "student"
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <div className="text-2xl">🎓</div>

                    <h3 className="mt-3 font-semibold">
                      Student
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Currently studying at TSL.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("alumni")}
                    className={`rounded-2xl border p-6 text-left ${
                      role === "alumni"
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <div className="text-2xl">🌍</div>

                    <h3 className="mt-3 font-semibold">
                      Alumni
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Previously studied at TSL.
                    </p>
                  </button>

                </div>
              </div>

              <button
                onClick={nextStep}
                className="mt-8 w-full rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white"
              >
                Continue
              </button>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 className="text-2xl font-semibold">
                Your TSL journey
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Tell us a little more about your connection with TSL.
              </p>

              <div className="mt-8">
                <label className="mb-2 block text-sm font-medium">
                  Graduation year
                </label>

                <input
                  value={graduationYear}
                  onChange={(event) =>
                    setGraduationYear(event.target.value)
                  }
                  placeholder="e.g. 2027"
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              {role === "student" && (
                <div className="mt-8">
                  <label className="mb-2 block text-sm font-medium">
                    Interests
                  </label>

                  <input
                    value={interests}
                    onChange={(event) =>
                      setInterests(event.target.value)
                    }
                    placeholder="e.g. AI, football, entrepreneurship"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  />
                </div>
              )}

              {role === "alumni" && (
                <>
                  <div className="mt-8">
                    <label className="mb-2 block text-sm font-medium">
                      University
                    </label>

                    <input
                      value={university}
                      onChange={(event) =>
                        setUniversity(event.target.value)
                      }
                      placeholder="University name"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-medium">
                      Degree
                    </label>

                    <input
                      value={degree}
                      onChange={(event) =>
                        setDegree(event.target.value)
                      }
                      placeholder="e.g. B.Tech Computer Science"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-medium">
                      Field
                    </label>

                    <input
                      value={field}
                      onChange={(event) =>
                        setField(event.target.value)
                      }
                      placeholder="e.g. Computer Science"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-medium">
                      Current role
                    </label>

                    <input
                      value={currentRole}
                      onChange={(event) =>
                        setCurrentRole(event.target.value)
                      }
                      placeholder="e.g. Software Engineer"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-medium">
                      Company / organization
                    </label>

                    <input
                      value={company}
                      onChange={(event) =>
                        setCompany(event.target.value)
                      }
                      placeholder="Optional"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    />
                  </div>
                </>
              )}

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium">
                  Short bio
                </label>

                <textarea
                  value={bio}
                  onChange={(event) =>
                    setBio(event.target.value)
                  }
                  rows={4}
                  placeholder="Tell the TSL community a little about yourself..."
                  className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <button
                onClick={nextStep}
                className="mt-8 w-full rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white"
              >
                Continue
              </button>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 className="text-2xl font-semibold">
                One last step
              </h2>

              {role === "alumni" ? (
                <>
                  <p className="mt-2 text-sm text-slate-500">
                    Help future TSL students by sharing your expertise.
                  </p>

                  <div className="mt-8">
                    <label className="mb-2 block text-sm font-medium">
                      Areas of expertise
                    </label>

                    <input
                      value={expertise}
                      onChange={(event) =>
                        setExpertise(event.target.value)
                      }
                      placeholder="e.g. AI, finance, medicine"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                    />
                  </div>

                  <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      checked={mentorshipAvailable}
                      onChange={(event) =>
                        setMentorshipAvailable(
                          event.target.checked,
                        )
                      }
                      className="h-5 w-5"
                    />

                    <span className="text-sm">
                      I'm interested in mentoring TSL students.
                    </span>
                  </label>

                  <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    Your alumni profile will be reviewed before it
                    appears as a verified alumni profile.
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                  <p className="font-medium">
                    You're almost there!
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Your student profile will help us personalize
                    alumni recommendations, mentorship opportunities,
                    events, and resources.
                  </p>
                </div>
              )}

              <button
                onClick={finish}
                disabled={saving}
                className="mt-8 w-full rounded-2xl bg-slate-900 px-5 py-3 font-medium text-white disabled:opacity-50"
              >
                {saving
                  ? "Creating your profile..."
                  : "Finish setup"}
              </button>
            </section>
          )}

        </div>
      </div>
    </main>
  );
}