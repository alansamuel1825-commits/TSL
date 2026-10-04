"use client";

import Link from "next/link";
import {
  createMentorshipRequest,
  getAlumniProfile,
  getMentorshipRequestsForStudent,
  getUserProfile,
} from "@/lib/firebase/firestore";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";

type AlumniProfile = {
  id: string;
  name?: string;
  university?: string;
  degree?: string;
  field?: string;
  graduationYear?: string;
  currentRole?: string;
  company?: string;
  expertise?: string[];
  bio?: string;
  mentorshipAvailable?: boolean;
  verificationStatus?: string;
};

type CurrentUserRole = "student" | "alumni" | null;

function ArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-4 w-4">
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
      <path d="m5.5 10 2.6 2.6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AlumniProfilePage() {
  const router = useRouter();
  const params = useParams();

  const { user, loading } = useAuth();

  const [profile, setProfile] = useState<AlumniProfile | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<CurrentUserRole>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState("");

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState("");

  const alumniId =
    typeof params.id === "string"
      ? params.id
      : "";

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const currentUserId = user.uid;

    async function loadProfile() {
      if (!alumniId) {
        setError("Invalid alumni profile.");
        setLoadingProfile(false);
        return;
      }

      try {
        setError("");

        const [result, viewerProfile] = await Promise.all([
          getAlumniProfile(alumniId),
          getUserProfile(currentUserId),
        ]);

        if (!result) {
          setError("This alumni profile could not be found.");
          return;
        }

        const alumni = result as AlumniProfile;

        if (alumni.verificationStatus !== "verified") {
          setError("This alumni profile is not currently available.");
          return;
        }

        setProfile(alumni);
        setCurrentUserRole(
          viewerProfile?.role === "student" || viewerProfile?.role === "alumni"
            ? viewerProfile.role
            : null,
        );
      } catch (err) {
        console.error(err);
        setError("Unable to load this alumni profile.");
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile();
  }, [user, loading, alumniId, router]);

  async function handleMentorshipRequest() {
    if (!user || !profile) return;

    if (currentUserRole !== "student") {
      setRequestError("Only current students can send mentorship requests.");
      return;
    }

    if (!requestMessage.trim()) {
      setRequestError("Please introduce yourself and explain what you'd like help with.");
      return;
    }

    setSendingRequest(true);
    setRequestError("");

    try {
      const existing =
        await getMentorshipRequestsForStudent(user.uid);

      const alreadyRequested = existing.some(
        (request) =>
          request.alumniId === profile.id &&
          request.status === "pending",
      );

      if (alreadyRequested) {
        setRequestError("You already have a pending request with this alumnus.");
        return;
      }

      await createMentorshipRequest(
        user.uid,
        profile.id,
        requestMessage,
      );

      setRequestSent(true);
      setRequestOpen(false);
      setRequestMessage("");
    } catch (error) {
      console.error(error);
      setRequestError("We couldn't send your request. Please try again.");
    } finally {
      setSendingRequest(false);
    }
  }

  if (loading || loadingProfile) {
    return (
      <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-5 w-36 rounded-full bg-slate-200" />
            <div className="mt-6 h-72 rounded-[2rem] bg-white ring-1 ring-slate-200" />
            <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
              <div className="h-80 rounded-[2rem] bg-white ring-1 ring-slate-200" />
              <div className="h-80 rounded-[2rem] bg-white ring-1 ring-slate-200" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff] px-5 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/alumni"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft />
            Back to alumni
          </Link>

          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-10 text-center">
            <h1 className="text-2xl font-semibold text-slate-950">
              Profile unavailable
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-500">
              {error || "We couldn't find this profile."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const canRequestMentorship =
    Boolean(
      user &&
        currentUserRole === "student" &&
        user.uid !== profile.id &&
        profile.mentorshipAvailable,
    );

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
        <Link
          href="/alumni"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft />
          Explore alumni
        </Link>

        <section className="relative mt-6 overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white shadow-[0_26px_80px_-55px_rgba(15,23,42,0.3)]">
          <div className="h-36 bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800" />

          <div className="px-6 pb-8 sm:px-8 lg:px-10">
            <div className="-mt-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.75rem] border-4 border-white bg-gradient-to-br from-blue-50 to-slate-100 text-3xl font-semibold text-blue-800 shadow-sm">
                  {(profile.name?.charAt(0) || "?").toUpperCase()}
                </div>

                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
                      {profile.name || "The Study Alumni"}
                    </h1>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      <CheckIcon />
                      Verified alumni
                    </span>
                  </div>

                  <p className="mt-2 text-base text-slate-600">
                    {profile.currentRole || profile.field || "Alumni member"}
                    {profile.company ? ` · ${profile.company}` : ""}
                  </p>

                  {profile.graduationYear && (
                    <p className="mt-1.5 text-sm text-slate-500">
                      The Study · Class of {profile.graduationYear}
                    </p>
                  )}
                </div>
              </div>

              {canRequestMentorship ? (
                <button
                  type="button"
                  onClick={() => setRequestOpen(true)}
                  disabled={requestSent}
                  className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {requestSent ? "Request sent ✓" : "Request mentorship"}
                </button>
              ) : profile.mentorshipAvailable && currentUserRole === "alumni" ? (
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                  Open to student mentorship
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {requestSent && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            Your mentorship request has been sent successfully.
          </div>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              About
            </p>

            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
              Experience and background
            </h2>

            <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600">
              {profile.bio || "This alumnus hasn't added a biography yet."}
            </p>

            {profile.expertise && profile.expertise.length > 0 && (
              <div className="mt-8 border-t border-slate-200 pt-7">
                <h3 className="text-sm font-semibold text-slate-950">
                  Areas of expertise
                </h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.expertise.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-blue-50 px-3.5 py-2 text-sm font-medium text-blue-800 ring-1 ring-blue-100"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Education
              </p>

              <div className="mt-5 space-y-5">
                {profile.university && (
                  <div>
                    <p className="text-xs font-medium text-slate-400">University</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{profile.university}</p>
                  </div>
                )}

                {profile.degree && (
                  <div>
                    <p className="text-xs font-medium text-slate-400">Degree</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{profile.degree}</p>
                  </div>
                )}

                {profile.graduationYear && (
                  <div>
                    <p className="text-xs font-medium text-slate-400">The Study</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">Class of {profile.graduationYear}</p>
                  </div>
                )}
              </div>
            </section>

            {(profile.field || profile.currentRole || profile.company) && (
              <section className="rounded-[2rem] border border-slate-200 bg-white p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Professional journey
                </p>

                <div className="mt-5 space-y-4">
                  {profile.field && (
                    <div>
                      <p className="text-xs font-medium text-slate-400">Field</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{profile.field}</p>
                    </div>
                  )}

                  {profile.currentRole && (
                    <div>
                      <p className="text-xs font-medium text-slate-400">Current role</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{profile.currentRole}</p>
                    </div>
                  )}

                  {profile.company && (
                    <div>
                      <p className="text-xs font-medium text-slate-400">Organization</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{profile.company}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {profile.mentorshipAvailable && (
              <section className="rounded-[2rem] bg-slate-950 p-7 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                  Mentorship
                </p>

                <h2 className="mt-3 text-xl font-semibold">
                  Open to supporting students
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-300">
                  This alumnus has indicated that they are interested in supporting current students.
                </p>

                {canRequestMentorship && (
                  <button
                    type="button"
                    onClick={() => setRequestOpen(true)}
                    disabled={requestSent}
                    className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {requestSent ? "Request sent ✓" : "Request mentorship"}
                  </button>
                )}
              </section>
            )}
          </aside>
        </div>
      </div>

      {requestOpen && canRequestMentorship && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mentorship-request-title"
        >
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Mentorship
                </p>
                <h2 id="mentorship-request-title" className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                  Request guidance from {profile.name || "this alumnus"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Introduce yourself and explain what you would like guidance with.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRequestOpen(false);
                  setRequestError("");
                }}
                aria-label="Close mentorship request"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            {requestError && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                {requestError}
              </div>
            )}

            <textarea
              value={requestMessage}
              onChange={(event) => setRequestMessage(event.target.value)}
              rows={6}
              maxLength={1000}
              placeholder="Hi! I'm a student at The Study interested in..."
              className="mt-6 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />

            <div className="mt-2 text-right text-xs text-slate-400">
              {requestMessage.length}/1000
            </div>

            <button
              type="button"
              onClick={handleMentorshipRequest}
              disabled={sendingRequest}
              className="mt-5 w-full rounded-2xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingRequest ? "Sending request..." : "Send mentorship request"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
