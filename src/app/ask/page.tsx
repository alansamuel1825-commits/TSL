"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
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

type ViewerRole =
  | "student"
  | "alumni"
  | null;

type TimestampLike = {
  toMillis?: () => number;
};

function QuestionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9a2.5 2.5 0 0 1 4.8 1c0 1.8-2.4 2.1-2.4 4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-3.5 w-3.5"
    >
      <path
        d="m5.5 10 2.6 2.6 6-6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function timestampToMillis(
  value: unknown,
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return 0;
  }

  const timestamp =
    value as TimestampLike;

  return typeof timestamp.toMillis ===
    "function"
    ? timestamp.toMillis()
    : 0;
}

export default function AskPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [role, setRole] =
    useState<ViewerRole>(null);
  const [
    alumniVerified,
    setAlumniVerified,
  ] = useState(false);
  const [
    displayName,
    setDisplayName,
  ] = useState("");
  const [
    checkingProfile,
    setCheckingProfile,
  ] = useState(true);

  const [
    questionText,
    setQuestionText,
  ] = useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [myQuestions, setMyQuestions] =
    useState<Question[]>([]);

  const [
    openQuestions,
    setOpenQuestions,
  ] = useState<Question[]>([]);
  const [
    answerDrafts,
    setAnswerDrafts,
  ] = useState<
    Record<string, string>
  >({});
  const [
    answeringId,
    setAnsweringId,
  ] = useState<string | null>(null);

  const [
    loadingQuestions,
    setLoadingQuestions,
  ] = useState(true);
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
      setCheckingProfile(true);
      setLoadingQuestions(true);
      setError("");

      try {
        const profile =
          await getUserProfile(
            currentUserId,
          );

        if (!profile) {
          router.replace(
            "/onboarding",
          );
          return;
        }

        setRole(profile.role);
        setDisplayName(
          profile.displayName,
        );

        if (
          profile.role === "student"
        ) {
          const results =
            await getQuestionsForStudent(
              currentUserId,
            );

          setMyQuestions(results);
          setAlumniVerified(false);
        } else {
          const verified =
            profile.status === "active";

          setAlumniVerified(verified);

          if (verified) {
            const results =
              await getOpenQuestions();

            setOpenQuestions(results);
          } else {
            setOpenQuestions([]);
          }
        }
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load Ask an Alumni right now.",
        );
      } finally {
        setCheckingProfile(false);
        setLoadingQuestions(false);
      }
    }

    load();
  }, [
    user,
    loading,
    router,
  ]);

  const sortedMyQuestions =
    useMemo(
      () =>
        [...myQuestions].sort(
          (a, b) =>
            timestampToMillis(
              b.createdAt,
            ) -
            timestampToMillis(
              a.createdAt,
            ),
        ),
      [myQuestions],
    );

  const sortedOpenQuestions =
    useMemo(
      () =>
        [...openQuestions].sort(
          (a, b) =>
            timestampToMillis(
              b.createdAt,
            ) -
            timestampToMillis(
              a.createdAt,
            ),
        ),
      [openQuestions],
    );

  async function handleSubmitQuestion() {
    if (
      !user ||
      !questionText.trim()
    ) {
      return;
    }

    if (
      questionText.trim().length >
      3000
    ) {
      setError(
        "Please keep your question under 3,000 characters.",
      );
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await createQuestion(
        user.uid,
        displayName,
        questionText,
      );

      setQuestionText("");

      const results =
        await getQuestionsForStudent(
          user.uid,
        );

      setMyQuestions(results);
      setSuccess(
        "Your question has been shared with the verified alumni community.",
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to submit your question. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAnswer(
    questionId: string,
  ) {
    if (
      !user ||
      !alumniVerified
    ) {
      return;
    }

    const draft =
      answerDrafts[questionId];

    if (
      !draft ||
      !draft.trim()
    ) {
      setError(
        "Please write an answer before submitting.",
      );
      return;
    }

    if (
      draft.trim().length >
      5000
    ) {
      setError(
        "Please keep your answer under 5,000 characters.",
      );
      return;
    }

    setAnsweringId(questionId);
    setError("");
    setSuccess("");

    try {
      await answerQuestion(
        questionId,
        user.uid,
        displayName,
        draft,
      );

      setOpenQuestions(
        (current) =>
          current.filter(
            (question) =>
              question.id !==
              questionId,
          ),
      );

      setAnswerDrafts(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            questionId
          ];

          return next;
        },
      );

      setSuccess(
        "Your answer has been shared with the student.",
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to submit your answer. Please try again.",
      );
    } finally {
      setAnsweringId(null);
    }
  }

  if (
    loading ||
    checkingProfile
  ) {
    return (
      <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-4 w-44 rounded-full bg-slate-200" />
            <div className="mt-5 h-12 w-72 rounded-2xl bg-slate-200" />
            <div className="mt-4 h-5 w-[34rem] max-w-full rounded-full bg-slate-100" />
            <div className="mt-10 h-64 rounded-[2rem] bg-white ring-1 ring-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const isStudent =
    role === "student";

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            The Study L&apos;école Internationale Alumni Connect
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
            Ask an Alumni
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            {isStudent
              ? "Ask thoughtful questions about university, careers, industries, projects, or life after The Study — and learn from people who have already taken those steps."
              : "Share what experience has taught you and help current students make better-informed decisions."}
          </p>
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

        {isStudent ? (
          <>
            <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.3)] sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <QuestionIcon />
              </div>

              <h2 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                What would you like to ask?
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                Give enough context for alumni to understand what you need help with. Avoid sharing private contact information.
              </p>

              <textarea
                value={
                  questionText
                }
                onChange={(event) =>
                  setQuestionText(
                    event.target.value,
                  )
                }
                maxLength={3000}
                rows={7}
                placeholder="For example: I'm interested in studying computer science. What helped you decide between different university paths?"
                className="mt-6 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  {
                    questionText.length
                  }
                  /3000
                </p>

                <button
                  type="button"
                  onClick={
                    handleSubmitQuestion
                  }
                  disabled={
                    submitting ||
                    !questionText.trim()
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit question"}
                  {!submitting && (
                    <ArrowRight />
                  )}
                </button>
              </div>
            </section>

            <section className="mt-12">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Your activity
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                    Your questions
                  </h2>
                </div>

                <p className="text-sm text-slate-500">
                  {
                    sortedMyQuestions.length
                  }{" "}
                  {sortedMyQuestions.length ===
                  1
                    ? "question"
                    : "questions"}
                </p>
              </div>

              {loadingQuestions ? (
                <div className="mt-6 h-48 animate-pulse rounded-[2rem] bg-white ring-1 ring-slate-200" />
              ) : sortedMyQuestions.length ===
                0 ? (
                <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <QuestionIcon />
                  </div>

                  <h3 className="mt-5 text-lg font-semibold text-slate-950">
                    No questions yet
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Your questions and alumni answers will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  {sortedMyQuestions.map(
                    (question) => (
                      <article
                        key={
                          question.id
                        }
                        className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-7"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={[
                              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1",
                              question.status ===
                              "answered"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                : "bg-amber-50 text-amber-700 ring-amber-100",
                            ].join(
                              " ",
                            )}
                          >
                            {question.status ===
                            "answered" ? (
                              <>
                                <CheckIcon />
                                Answered
                              </>
                            ) : (
                              "Waiting for an answer"
                            )}
                          </span>
                        </div>

                        <p className="mt-5 text-base font-medium leading-7 text-slate-900">
                          {
                            question.questionText
                          }
                        </p>

                        {question.status ===
                          "answered" &&
                          question.answerText && (
                            <div className="mt-6 rounded-[1.5rem] border border-blue-100 bg-blue-50/60 p-5">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                                Answer from{" "}
                                {question.answererName ||
                                  "verified alumni"}
                              </p>

                              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                                {
                                  question.answerText
                                }
                              </p>
                            </div>
                          )}
                      </article>
                    ),
                  )}
                </div>
              )}
            </section>
          </>
        ) : !alumniVerified ? (
          <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-8 sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              </svg>
            </div>

            <h2 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
              Alumni verification pending
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Questions from students are available only to verified alumni. Once your profile is approved, you will be able to view open questions and share answers.
            </p>
          </section>
        ) : (
          <section className="mt-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Alumni contribution
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                  Open student questions
                </h2>
              </div>

              <p className="text-sm text-slate-500">
                {
                  sortedOpenQuestions.length
                }{" "}
                {sortedOpenQuestions.length ===
                1
                  ? "question"
                  : "questions"}
              </p>
            </div>

            {loadingQuestions ? (
              <div className="mt-6 h-56 animate-pulse rounded-[2rem] bg-white ring-1 ring-slate-200" />
            ) : sortedOpenQuestions.length ===
              0 ? (
              <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-10 text-center sm:p-14">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <CheckIcon />
                </div>

                <h3 className="mt-5 text-xl font-semibold text-slate-950">
                  All caught up
                </h3>

                <p className="mt-2 text-sm leading-7 text-slate-500">
                  There are no open student questions right now.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                {sortedOpenQuestions.map(
                  (question) => {
                    const draft =
                      answerDrafts[
                        question.id
                      ] || "";

                    return (
                      <article
                        key={
                          question.id
                        }
                        className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-7"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 font-semibold text-blue-800 ring-1 ring-blue-100">
                            {(
                              question.studentName?.charAt(
                                0,
                              ) ||
                              "S"
                            ).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                              {
                                question.studentName ||
                                "The Study Student"
                              }
                            </p>

                            <p className="mt-3 text-base font-medium leading-7 text-slate-900">
                              {
                                question.questionText
                              }
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 border-t border-slate-200 pt-6">
                          <label
                            htmlFor={`answer-${question.id}`}
                            className="text-sm font-semibold text-slate-800"
                          >
                            Your answer
                          </label>

                          <textarea
                            id={`answer-${question.id}`}
                            value={
                              draft
                            }
                            onChange={(
                              event,
                            ) =>
                              setAnswerDrafts(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  [question.id]:
                                    event
                                      .target
                                      .value,
                                }),
                              )
                            }
                            maxLength={
                              5000
                            }
                            rows={5}
                            placeholder="Share a clear, thoughtful answer based on your experience..."
                            className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                          />

                          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-slate-400">
                              {
                                draft.length
                              }
                              /5000
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                handleAnswer(
                                  question.id,
                                )
                              }
                              disabled={
                                answeringId ===
                                  question.id ||
                                !draft.trim()
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {answeringId ===
                              question.id
                                ? "Submitting..."
                                : "Submit answer"}
                              {answeringId !==
                                question.id && (
                                <ArrowRight />
                              )}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
