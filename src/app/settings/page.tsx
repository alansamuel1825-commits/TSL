"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";
import { logOut } from "@/lib/firebase/auth";
import {
  getAlumniProfile,
  getStudentProfile,
  getUserProfile,
  updateAlumniProfile,
  updateStudentProfile,
  type AlumniVerificationStatus,
  type UserRole,
  type UserStatus,
} from "@/lib/firebase/firestore";

type CommonAccount = {
  displayName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isAdmin: boolean;
};

type StudentForm = {
  name: string;
  graduationYear: string;
  interests: string;
  bio: string;
};

type AlumniForm = {
  name: string;
  graduationYear: string;
  university: string;
  degree: string;
  field: string;
  currentRole: string;
  company: string;
  expertise: string;
  bio: string;
  mentorshipAvailable: boolean;
  verificationStatus:
    AlumniVerificationStatus;
};

function splitTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.3V9.6h.1A1.7 1.7 0 0 0 4.1 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.5 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2.3h4v.1a1.7 1.7 0 0 0 1.1 1.7 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8.5a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.7 1.1Z" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M5 3h12l2 2v16H5Z" />
      <path d="M8 3v6h8V3M8 21v-7h8v7" />
    </svg>
  );
}

function fieldClassName() {
  return "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10";
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [checking, setChecking] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [signingOut, setSigningOut] =
    useState(false);

  const [account, setAccount] =
    useState<CommonAccount | null>(
      null,
    );

  const [studentForm, setStudentForm] =
    useState<StudentForm>({
      name: "",
      graduationYear: "",
      interests: "",
      bio: "",
    });

  const [alumniForm, setAlumniForm] =
    useState<AlumniForm>({
      name: "",
      graduationYear: "",
      university: "",
      degree: "",
      field: "",
      currentRole: "",
      company: "",
      expertise: "",
      bio: "",
      mentorshipAvailable: false,
      verificationStatus: "pending",
    });

  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const currentUserId =
      user.uid;

    async function load() {
      setChecking(true);
      setError("");

      try {
        const userProfile =
          await getUserProfile(
            currentUserId,
          );

        if (!userProfile) {
          router.replace(
            "/onboarding",
          );
          return;
        }

        setAccount({
          displayName:
            userProfile.displayName,
          email: userProfile.email,
          role: userProfile.role,
          status: userProfile.status,
          isAdmin:
            userProfile.isAdmin === true,
        });

        if (
          userProfile.role ===
          "student"
        ) {
          const student =
            await getStudentProfile(
              currentUserId,
            );

          if (!student) {
            router.replace(
              "/onboarding",
            );
            return;
          }

          setStudentForm({
            name: student.name,
            graduationYear:
              student.graduationYear,
            interests:
              student.interests.join(
                ", ",
              ),
            bio: student.bio,
          });
        } else {
          const alumni =
            await getAlumniProfile(
              currentUserId,
            );

          if (!alumni) {
            router.replace(
              "/onboarding",
            );
            return;
          }

          setAlumniForm({
            name: alumni.name,
            graduationYear:
              alumni.graduationYear,
            university:
              alumni.university,
            degree: alumni.degree,
            field: alumni.field,
            currentRole:
              alumni.currentRole,
            company: alumni.company,
            expertise:
              alumni.expertise.join(
                ", ",
              ),
            bio: alumni.bio,
            mentorshipAvailable:
              alumni.mentorshipAvailable,
            verificationStatus:
              alumni.verificationStatus,
          });
        }
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load your settings.",
        );
      } finally {
        setChecking(false);
      }
    }

    load();
  }, [
    user,
    loading,
    router,
  ]);

  const roleLabel = useMemo(
    () =>
      account?.role === "alumni"
        ? "Alumni"
        : "Student",
    [account?.role],
  );

  async function handleSave() {
    if (!user || !account) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (
        account.role === "student"
      ) {
        await updateStudentProfile(
          user.uid,
          {
            name:
              studentForm.name,
            graduationYear:
              studentForm.graduationYear,
            interests: splitTags(
              studentForm.interests,
            ),
            bio: studentForm.bio,
          },
        );

        setAccount((current) =>
          current
            ? {
                ...current,
                displayName:
                  studentForm.name.trim(),
              }
            : current,
        );
      } else {
        await updateAlumniProfile(
          user.uid,
          {
            name: alumniForm.name,
            graduationYear:
              alumniForm.graduationYear,
            university:
              alumniForm.university,
            degree:
              alumniForm.degree,
            field: alumniForm.field,
            currentRole:
              alumniForm.currentRole,
            company:
              alumniForm.company,
            expertise: splitTags(
              alumniForm.expertise,
            ),
            bio: alumniForm.bio,
            mentorshipAvailable:
              alumniForm.mentorshipAvailable,
          },
        );

        setAccount((current) =>
          current
            ? {
                ...current,
                displayName:
                  alumniForm.name.trim(),
              }
            : current,
        );
      }

      setSuccess(
        "Your profile has been updated.",
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await logOut();
      router.push("/login");
    } catch (err) {
      console.error(err);
      setError(
        "Unable to sign out right now.",
      );
      setSigningOut(false);
    }
  }

  if (loading || checking) {
    return (
      <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-4 w-44 rounded-full bg-slate-200" />
            <div className="mt-5 h-12 w-72 rounded-2xl bg-slate-200" />
            <div className="mt-8 h-72 rounded-[2rem] bg-white ring-1 ring-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  if (!user || !account) {
    return null;
  }

  const isStudent =
    account.role === "student";

  const verificationLabel =
    !isStudent
      ? alumniForm.verificationStatus ===
        "verified"
        ? "Verified alumni"
        : alumniForm.verificationStatus ===
            "rejected"
          ? "Verification requires review"
          : "Verification pending"
      : null;

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            Your account
          </p>

          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <SettingsIcon />
            </div>

            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
                Profile &amp; settings
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Keep your information accurate so students and alumni can understand who you are and how you participate in The Study community.
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm leading-6 text-emerald-700"
          >
            {success}
          </div>
        )}

        <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Public profile
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Edit the information associated with your {roleLabel.toLowerCase()} profile.
                </p>
              </div>

              {!isStudent && (
                <span
                  className={[
                    "self-start rounded-full px-3 py-1.5 text-xs font-semibold ring-1",
                    alumniForm.verificationStatus ===
                    "verified"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                      : "bg-amber-50 text-amber-700 ring-amber-100",
                  ].join(" ")}
                >
                  {verificationLabel}
                </span>
              )}
            </div>

            {isStudent ? (
              <div className="mt-7 grid gap-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Name
                    <input
                      value={
                        studentForm.name
                      }
                      onChange={(event) =>
                        setStudentForm(
                          (current) => ({
                            ...current,
                            name:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      maxLength={100}
                      className={fieldClassName()}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-800">
                    Graduation year
                    <input
                      value={
                        studentForm.graduationYear
                      }
                      onChange={(event) =>
                        setStudentForm(
                          (current) => ({
                            ...current,
                            graduationYear:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      maxLength={20}
                      placeholder="2027"
                      className={fieldClassName()}
                    />
                  </label>
                </div>

                <label className="block text-sm font-semibold text-slate-800">
                  Interests
                  <input
                    value={
                      studentForm.interests
                    }
                    onChange={(event) =>
                      setStudentForm(
                        (current) => ({
                          ...current,
                          interests:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Engineering, design, medicine"
                    className={fieldClassName()}
                  />
                  <span className="mt-2 block text-xs font-normal leading-5 text-slate-400">
                    Separate interests with commas.
                  </span>
                </label>

                <label className="block text-sm font-semibold text-slate-800">
                  Bio
                  <textarea
                    value={
                      studentForm.bio
                    }
                    onChange={(event) =>
                      setStudentForm(
                        (current) => ({
                          ...current,
                          bio:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    maxLength={2000}
                    rows={6}
                    placeholder="Tell the community a little about your interests and what you hope to learn."
                    className={`${fieldClassName()} resize-none leading-7`}
                  />
                  <span className="mt-2 block text-right text-xs font-normal text-slate-400">
                    {studentForm.bio.length}/2000
                  </span>
                </label>
              </div>
            ) : (
              <div className="mt-7 grid gap-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Name
                    <input
                      value={
                        alumniForm.name
                      }
                      onChange={(event) =>
                        setAlumniForm(
                          (current) => ({
                            ...current,
                            name:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      maxLength={100}
                      className={fieldClassName()}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-800">
                    Graduation year
                    <input
                      value={
                        alumniForm.graduationYear
                      }
                      onChange={(event) =>
                        setAlumniForm(
                          (current) => ({
                            ...current,
                            graduationYear:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      maxLength={20}
                      className={fieldClassName()}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-800">
                    University
                    <input
                      value={
                        alumniForm.university
                      }
                      onChange={(event) =>
                        setAlumniForm(
                          (current) => ({
                            ...current,
                            university:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      maxLength={150}
                      className={fieldClassName()}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-800">
                    Degree
                    <input
                      value={
                        alumniForm.degree
                      }
                      onChange={(event) =>
                        setAlumniForm(
                          (current) => ({
                            ...current,
                            degree:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      maxLength={150}
                      className={fieldClassName()}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-800">
                    Field
                    <input
                      value={
                        alumniForm.field
                      }
                      onChange={(event) =>
                        setAlumniForm(
                          (current) => ({
                            ...current,
                            field:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      maxLength={150}
                      className={fieldClassName()}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-800">
                    Current role
                    <input
                      value={
                        alumniForm.currentRole
                      }
                      onChange={(event) =>
                        setAlumniForm(
                          (current) => ({
                            ...current,
                            currentRole:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      maxLength={150}
                      className={fieldClassName()}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-slate-800 sm:col-span-2">
                    Organization / company
                    <input
                      value={
                        alumniForm.company
                      }
                      onChange={(event) =>
                        setAlumniForm(
                          (current) => ({
                            ...current,
                            company:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      maxLength={150}
                      className={fieldClassName()}
                    />
                  </label>
                </div>

                <label className="block text-sm font-semibold text-slate-800">
                  Areas of expertise
                  <input
                    value={
                      alumniForm.expertise
                    }
                    onChange={(event) =>
                      setAlumniForm(
                        (current) => ({
                          ...current,
                          expertise:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Software engineering, product, university applications"
                    className={fieldClassName()}
                  />
                  <span className="mt-2 block text-xs font-normal leading-5 text-slate-400">
                    Separate areas with commas.
                  </span>
                </label>

                <label className="block text-sm font-semibold text-slate-800">
                  Bio
                  <textarea
                    value={
                      alumniForm.bio
                    }
                    onChange={(event) =>
                      setAlumniForm(
                        (current) => ({
                          ...current,
                          bio:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    maxLength={3000}
                    rows={7}
                    className={`${fieldClassName()} resize-none leading-7`}
                  />

                  <span className="mt-2 block text-right text-xs font-normal text-slate-400">
                    {alumniForm.bio.length}/3000
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={
                      alumniForm.mentorshipAvailable
                    }
                    onChange={(event) =>
                      setAlumniForm(
                        (current) => ({
                          ...current,
                          mentorshipAvailable:
                            event
                              .target
                              .checked,
                        }),
                      )
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      Open to mentorship requests
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Students can request mentorship only when this is enabled and your alumni profile is verified.
                    </span>
                  </span>
                </label>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-400">
                Your account role and verification status are controlled separately and cannot be changed here.
              </p>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SaveIcon />
                {saving
                  ? "Saving..."
                  : "Save changes"}
              </button>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                Account
              </p>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-xs text-slate-400">
                    Email
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                    {account.email}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Role
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {roleLabel}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Account status
                  </p>
                  <span
                    className={[
                      "mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1",
                      account.status ===
                      "active"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                        : "bg-amber-50 text-amber-700 ring-amber-100",
                    ].join(" ")}
                  >
                    {account.status ===
                    "active"
                      ? "Active"
                      : "Pending"}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Email verification
                  </p>
                  <span
                    className={[
                      "mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1",
                      user.emailVerified
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                        : "bg-amber-50 text-amber-700 ring-amber-100",
                    ].join(" ")}
                  >
                    {user.emailVerified
                      ? "Verified"
                      : "Not verified"}
                  </span>
                </div>

                {account.isAdmin && (
                  <div>
                    <p className="text-xs text-slate-400">
                      Administration
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                      School administrator
                    </span>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-950">
                Account actions
              </h2>

              <p className="mt-2 text-xs leading-6 text-slate-500">
                Manage sign-in recovery and this device&apos;s session.
              </p>

              <div className="mt-5 space-y-3">
                {!user.emailVerified && (
                  <Link
                    href="/verify-email"
                    className="block w-full rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                  >
                    Verify email
                  </Link>
                )}

                <Link
                  href="/forgot-password"
                  className="block w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Password recovery
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {signingOut
                    ? "Signing out..."
                    : "Sign out"}
                </button>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
