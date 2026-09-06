"use client";
import {
  createMentorshipRequest,
  getAlumniProfile,
  getMentorshipRequestsForStudent,
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

export default function AlumniProfilePage() {
  const router = useRouter();
  const params = useParams();

  const { user, loading } = useAuth();

  const [profile, setProfile] =
    useState<AlumniProfile | null>(null);

  const [loadingProfile, setLoadingProfile] =
    useState(true);

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

    async function loadProfile() {
      if (!alumniId) {
        setError("Invalid alumni profile.");
        setLoadingProfile(false);
        return;
      }

      try {
        const result = await getAlumniProfile(alumniId);

        if (!result) {
          setError("This alumni profile could not be found.");
          return;
        }

        const alumni = result as AlumniProfile;

        if (alumni.verificationStatus !== "verified") {
          setError(
            "This alumni profile is not currently available."
          );
          return;
        }

        setProfile(alumni);
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load this alumni profile."
        );
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile();
  }, [user, loading, alumniId, router]);
    async function handleMentorshipRequest() {
    if (!user || !profile) return;

    if (!requestMessage.trim()) {
      setRequestError(
        "Please introduce yourself and explain what you'd like help with."
      );
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
          request.status === "pending"
      );

      if (alreadyRequested) {
        setRequestError(
          "You already have a pending request with this alumni."
        );
        return;
      }

      await createMentorshipRequest(
        user.uid,
        profile.id,
        requestMessage
      );

      setRequestSent(true);
      setRequestOpen(false);
      setRequestMessage("");
    } catch (error) {
      console.error(error);

      setRequestError(
        "We couldn't send your request. Please try again."
      );
    } finally {
      setSendingRequest(false);
    }
  }

  if (loading || loadingProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">
          Loading profile...
        </p>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => router.push("/alumni")}
            className="text-sm font-semibold text-slate-600 hover:text-slate-950"
          >
            ← Back to alumni
          </button>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <h1 className="text-2xl font-bold text-slate-950">
              Profile unavailable
            </h1>

            <p className="mt-3 text-slate-500">
              {error ||
                "We couldn't find this profile."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* Back */}
        <button
          onClick={() => router.push("/alumni")}
          className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          ← Explore alumni
        </button>

        {/* Hero */}
        <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">

          <div className="h-32 bg-slate-900" />

          <div className="px-6 pb-8 md:px-10">

            <div className="-mt-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

              <div className="flex flex-col gap-4 md:flex-row md:items-end">

                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-slate-100 text-3xl font-bold text-slate-700 shadow-sm">
                  {(profile.name?.charAt(0) || "?").toUpperCase()}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                      {profile.name || "TSL Alumni"}
                    </h1>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      ✓ Verified TSL Alumni
                    </span>
                  </div>

                  <p className="mt-2 text-slate-600">
                    {profile.currentRole ||
                      profile.field ||
                      "TSL Alumni"}
                    {profile.company
                      ? ` · ${profile.company}`
                      : ""}
                  </p>
                </div>

              </div>

              {profile.mentorshipAvailable && (
  <button
    onClick={() => setRequestOpen(true)}
    disabled={requestSent}
    className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {requestSent
      ? "Request sent ✓"
      : "Request mentorship"}
  </button>
)}
              

            </div>
          </div>
        </section>

        {/* Main content */}
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">

          {/* About */}
          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">

            <h2 className="text-xl font-bold text-slate-950">
              About
            </h2>

            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
              {profile.bio ||
                "This alumni hasn't added a biography yet."}
            </p>

            {profile.expertise &&
              profile.expertise.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-slate-950">
                    Areas of expertise
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.expertise.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

          </section>

          {/* Information */}
          <aside className="space-y-6">

            <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Education
              </h2>

              <div className="mt-5 space-y-4">

                {profile.university && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      University
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {profile.university}
                    </p>
                  </div>
                )}

                {profile.degree && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Degree
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {profile.degree}
                    </p>
                  </div>
                )}

                {profile.graduationYear && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      TSL graduation
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      Class of {profile.graduationYear}
                    </p>
                  </div>
                )}

              </div>
            </section>

            {profile.field && (
              <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">
                  Professional field
                </h2>

                <p className="mt-4 text-sm text-slate-600">
                  {profile.field}
                </p>

                {profile.currentRole && (
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {profile.currentRole}
                  </p>
                )}

                {profile.company && (
                  <p className="mt-1 text-sm text-slate-500">
                    {profile.company}
                  </p>
                )}
              </section>
            )}

            {profile.mentorshipAvailable && (
              <section className="rounded-3xl border border-slate-200 bg-slate-900 p-7 text-white shadow-sm">
                <p className="text-lg font-bold">
                  Open to mentorship
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This alumnus has indicated that they're
                  interested in supporting TSL students.
                </p>

                <button
  onClick={() => setRequestOpen(true)}
  disabled={requestSent}
  className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
>
  {requestSent
    ? "Request sent ✓"
    : "Request mentorship"}
</button>
              </section>
            )}

          </aside>
        </div>
      </div>
      {requestOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
    <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">
            Request mentorship
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Introduce yourself and explain what you'd like
            guidance with.
          </p>
        </div>

        <button
          onClick={() => setRequestOpen(false)}
          className="text-xl text-slate-400 hover:text-slate-900"
        >
          ×
        </button>
      </div>

      {requestError && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {requestError}
        </div>
      )}

      <textarea
        value={requestMessage}
        onChange={(event) =>
          setRequestMessage(event.target.value)
        }
        rows={6}
        maxLength={1000}
        placeholder="Hi! I'm a TSL student interested in..."
        className="mt-6 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-slate-900 focus:bg-white"
      />

      <div className="mt-2 text-right text-xs text-slate-400">
        {requestMessage.length}/1000
      </div>

      <button
        onClick={handleMentorshipRequest}
        disabled={sendingRequest}
        className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:opacity-50"
      >
        {sendingRequest
          ? "Sending request..."
          : "Send mentorship request"}
      </button>
    </div>
  </div>
)}
    </main>
  );
}