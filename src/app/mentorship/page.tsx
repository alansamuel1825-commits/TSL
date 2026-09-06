"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";

import {
  getMentorshipRequestsForAlumni,
  getUserProfile,
  updateMentorshipRequest,
  acceptMentorshipRequest,
} from "@/lib/firebase/firestore";

type Request = {
  id: string;
  studentId: string;
  alumniId: string;
  message?: string;
  status?: string;
};

type Requester = {
  name?: string;
};

export default function MentorshipPage() {
  const router = useRouter();

  const { user, loading } = useAuth();

  const [requests, setRequests] = useState<Request[]>([]);
  const [requesters, setRequesters] = useState<Record<string, Requester>>({});
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [error, setError] = useState("");
  const [acceptingRequestId, setAcceptingRequestId] = useState<
    string | null
  >(null);

  async function handleAcceptRequest(requestId: string) {
    setAcceptingRequestId(requestId);
    setError("");

    try {
      await acceptMentorshipRequest(requestId);

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: "accepted",
              }
            : request
        )
      );
    } catch (err) {
      console.error(err);
      setError("Unable to accept this mentorship request.");
    } finally {
      setAcceptingRequestId(null);
    }
  }

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const currentUser = user;

    async function load() {
      try {
        const profile = await getUserProfile(currentUser.uid);

        if (!profile) {
          router.replace("/onboarding");
          return;
        }

        const results = await getMentorshipRequestsForAlumni(
          currentUser.uid
        );

        setRequests(results as Request[]);

        const entries = await Promise.all(
          results.map(async (request) => {
            try {
              const studentProfile = await getUserProfile(
                request.studentId
              );

              return [
                request.id,
                { name: studentProfile?.displayName },
              ] as const;
            } catch (err) {
              console.error(err);
              return [request.id, {}] as const;
            }
          })
        );

        setRequesters(Object.fromEntries(entries));
      } catch (err) {
        console.error(err);
        setError("Unable to load mentorship requests.");
      } finally {
        setLoadingRequests(false);
      }
    }

    load();
  }, [user, loading, router]);

  async function decide(id: string, status: "accepted" | "declined") {
    try {
      await updateMentorshipRequest(id, status);

      setRequests((current) =>
        current.map((request) =>
          request.id === id ? { ...request, status } : request
        )
      );
    } catch (err) {
      console.error(err);
      setError("Unable to update the request.");
    }
  }

  if (loading || loadingRequests) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading mentorship...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          TSL ALUMNI CONNECT
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          Mentorship
        </h1>

        <p className="mt-3 text-slate-600">
          Manage mentorship requests from the TSL community.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mt-10 space-y-5">
          {requests.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
              <h2 className="text-xl font-semibold">
                No mentorship requests yet
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Requests from TSL students will appear here.
              </p>
            </div>
          ) : (
            requests.map((request) => {
              const requesterName =
                requesters[request.id]?.name || "TSL Student";

              return (
                <article
                  key={request.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 font-semibold text-slate-700">
                        {requesterName.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">
                          {request.status}
                        </span>

                        <h2 className="mt-4 text-lg font-bold">
                          {requesterName}
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {request.message}
                        </p>
                      </div>
                    </div>

                    {request.status === "pending" && (
                      <div className="flex shrink-0 gap-3">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          disabled={acceptingRequestId === request.id}
                          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {acceptingRequestId === request.id
                            ? "Accepting..."
                            : "Accept"}
                        </button>

                        <button
                          onClick={() => decide(request.id, "declined")}
                          className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}