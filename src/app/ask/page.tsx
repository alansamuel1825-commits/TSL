"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";

import {
  answerQuestion,
  createQuestion,
  getOpenQuestions,
  getQuestionsForStudent,
  getUserProfile,
  type Question,
} from "@/lib/firebase/firestore";

export default function AskPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [role, setRole] = useState<"student" | "alumni" | null>(null);
  const [displayName, setDisplayName] = useState("");

  const [checkingProfile, setCheckingProfile] = useState(true);

  // Student state
  const [questionText, setQuestionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);

  // Alumni state
  const [openQuestions, setOpenQuestions] = useState<Question[]>([]);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>(
    {}
  );
  const [answeringId, setAnsweringId] = useState<string | null>(null);

  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [error, setError] = useState("");

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

        setRole(profile.role);
        setDisplayName(profile.displayName);

        if (profile.role === "student") {
          const results = await getQuestionsForStudent(currentUser.uid);
          setMyQuestions(results);
        } else {
          const results = await getOpenQuestions();
          setOpenQuestions(results);
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load questions.");
      } finally {
        setCheckingProfile(false);
        setLoadingQuestions(false);
      }
    }

    load();
  }, [user, loading, router]);

  async function handleSubmitQuestion() {
    if (!user || !questionText.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      await createQuestion(user.uid, displayName, questionText);

      setQuestionText("");

      const results = await getQuestionsForStudent(user.uid);
      setMyQuestions(results);
    } catch (err) {
      console.error(err);
      setError("Unable to submit your question. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAnswer(questionId: string) {
    if (!user) return;

    const draft = answerDrafts[questionId];

    if (!draft || !draft.trim()) {
      setError("Please write an answer before submitting.");
      return;
    }

    setAnsweringId(questionId);
    setError("");

    try {
      await answerQuestion(questionId, user.uid, displayName, draft);

      setOpenQuestions((current) =>
        current.filter((question) => question.id !== questionId)
      );

      setAnswerDrafts((current) => {
        const next = { ...current };
        delete next[questionId];
        return next;
      });
    } catch (err) {
      console.error(err);
      setError("Unable to submit your answer. Please try again.");
    } finally {
      setAnsweringId(null);
    }
  }

  if (loading || checkingProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          TSL Alumni Connect
        </p>

        <h1 className="mt-4 text-5xl font-bold tracking-tight">
          Ask an Alumni
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Have a question about university, careers, industries, projects
          or life after TSL? Ask someone who has already experienced it.
        </p>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {role === "student" ? (
          <>
            <div className="mt-12 rounded-3xl border border-slate-200 p-8">
              <h2 className="text-xl font-semibold">
                What would you like to ask?
              </h2>

              <textarea
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                maxLength={1000}
                placeholder="Write your question..."
                className="mt-5 min-h-40 w-full rounded-2xl border border-slate-300 p-4 outline-none focus:border-slate-500"
              />

              <button
                onClick={handleSubmitQuestion}
                disabled={submitting || !questionText.trim()}
                className="mt-5 rounded-full bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Question"}
              </button>
            </div>

            <div className="mt-14">
              <h2 className="text-2xl font-bold text-slate-950">
                Your questions
              </h2>

              {loadingQuestions ? (
                <p className="mt-4 text-sm text-slate-500">Loading...</p>
              ) : myQuestions.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  You haven't asked anything yet.
                </p>
              ) : (
                <div className="mt-6 space-y-5">
                  {myQuestions.map((question) => (
                    <article
                      key={question.id}
                      className="rounded-3xl border border-slate-200 p-6"
                    >
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          question.status === "answered"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {question.status === "answered"
                          ? "Answered"
                          : "Waiting for an answer"}
                      </span>

                      <p className="mt-4 text-sm font-medium text-slate-900">
                        {question.questionText}
                      </p>

                      {question.status === "answered" && (
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {question.answererName || "TSL Alumni"}
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {question.answerText}
                          </p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-14">
            <h2 className="text-2xl font-bold text-slate-950">
              Open questions from students
            </h2>

            {loadingQuestions ? (
              <p className="mt-4 text-sm text-slate-500">Loading...</p>
            ) : openQuestions.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-slate-200 p-10 text-center">
                <p className="font-semibold text-slate-800">All caught up</p>
                <p className="mt-2 text-sm text-slate-500">
                  There are no open questions right now.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                {openQuestions.map((question) => (
                  <article
                    key={question.id}
                    className="rounded-3xl border border-slate-200 p-6"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {question.studentName || "TSL Student"}
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {question.questionText}
                    </p>

                    <textarea
                      value={answerDrafts[question.id] || ""}
                      onChange={(event) =>
                        setAnswerDrafts((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }))
                      }
                      placeholder="Write your answer..."
                      className="mt-4 min-h-24 w-full rounded-2xl border border-slate-300 p-4 text-sm outline-none focus:border-slate-500"
                    />

                    <button
                      onClick={() => handleAnswer(question.id)}
                      disabled={answeringId === question.id}
                      className="mt-3 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {answeringId === question.id
                        ? "Submitting..."
                        : "Submit Answer"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}