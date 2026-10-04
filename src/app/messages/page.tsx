"use client";

import Link from "next/link";
import {
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";
import {
  blockUser,
  getConversationsForUser,
  getMyBlockOfUser,
  getPublicUserProfile,
  sendMessage,
  submitReport,
  subscribeToMessages,
  unblockUser,
  type ChatMessage,
  type Conversation,
} from "@/lib/firebase/firestore";

type OtherUser = {
  name?: string;
  role?: string;
};

type TimestampLike = {
  toDate?: () => Date;
  toMillis?: () => number;
};

function ArrowLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className="h-7 w-7"
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}

function formatMessageTime(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const timestamp = value as TimestampLike;

  let date: Date | null = null;

  if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (
    typeof timestamp.toMillis === "function"
  ) {
    date = new Date(
      timestamp.toMillis(),
    );
  }

  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(date);
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [conversations, setConversations] =
    useState<Conversation[]>([]);
  const [participants, setParticipants] =
    useState<Record<string, OtherUser>>({});
  const [
    selectedConversation,
    setSelectedConversation,
  ] = useState<Conversation | null>(null);
  const [messages, setMessages] =
    useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] =
    useState<OtherUser | null>(null);
  const [otherUserId, setOtherUserId] =
    useState<string | null>(null);
  const [
    loadingConversations,
    setLoadingConversations,
  ] = useState(true);
  const [
    loadingMessages,
    setLoadingMessages,
  ] = useState(false);
  const [messageText, setMessageText] =
    useState("");
  const [sending, setSending] =
    useState(false);
  const [error, setError] = useState("");

  const [blockedByMe, setBlockedByMe] =
    useState(false);
  const [blockedByOther, setBlockedByOther] =
    useState(false);
  const [myBlockId, setMyBlockId] =
    useState<string | null>(null);
  const [blocking, setBlocking] =
    useState(false);
  const [unblocking, setUnblocking] =
    useState(false);

  const [showSafetyMenu, setShowSafetyMenu] =
    useState(false);
  const [showReportForm, setShowReportForm] =
    useState(false);
  const [reportReason, setReportReason] =
    useState("");
  const [
    submittingReport,
    setSubmittingReport,
  ] = useState(false);
  const [reportSent, setReportSent] =
    useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const composerDisabled =
    blockedByMe || blockedByOther;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const currentUserId = user.uid;

    async function loadConversations() {
      setLoadingConversations(true);
      setError("");

      try {
        const results =
          await getConversationsForUser(
            currentUserId,
          );

        setConversations(results);

        const entries = await Promise.all(
          results.map(
            async (conversation) => {
              const otherId =
                conversation.studentId ===
                currentUserId
                  ? conversation.alumniId
                  : conversation.studentId;

              try {
                const profile =
                  await getPublicUserProfile(
                    otherId,
                  );

                return [
                  conversation.id,
                  profile
                    ? {
                        name:
                          profile.displayName,
                        role: profile.role,
                      }
                    : {},
                ] as const;
              } catch (err) {
                console.error(err);
                return [
                  conversation.id,
                  {},
                ] as const;
              }
            },
          ),
        );

        setParticipants(
          Object.fromEntries(entries),
        );
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load your conversations.",
        );
      } finally {
        setLoadingConversations(false);
      }
    }

    loadConversations();
  }, [user, loading, router]);

  useEffect(() => {
    if (!selectedConversation || !user) {
      return;
    }

    const currentConversation =
      selectedConversation;
    const currentUserId = user.uid;

    setMessages([]);
    setLoadingMessages(true);
    setError("");
    setShowSafetyMenu(false);
    setShowReportForm(false);
    setReportReason("");
    setReportSent(false);

    const otherId =
      currentConversation.studentId ===
      currentUserId
        ? currentConversation.alumniId
        : currentConversation.studentId;

    setOtherUserId(otherId);

    const unsubscribe =
      subscribeToMessages(
        currentConversation.id,
        (liveMessages) => {
          setMessages(liveMessages);
          setLoadingMessages(false);
        },
      );

    const cached =
      participants[
        currentConversation.id
      ];

    if (cached?.name) {
      setOtherUser(cached);
    } else {
      getPublicUserProfile(otherId)
        .then((profile) => {
          setOtherUser(
            profile
              ? {
                  name:
                    profile.displayName,
                  role: profile.role,
                }
              : null,
          );
        })
        .catch((err) =>
          console.error(err),
        );
    }

    Promise.all([
      getMyBlockOfUser(
        currentUserId,
        otherId,
      ),
      getMyBlockOfUser(
        otherId,
        currentUserId,
      ),
    ])
      .then(([mine, theirs]) => {
        setMyBlockId(mine);
        setBlockedByMe(Boolean(mine));
        setBlockedByOther(Boolean(theirs));
      })
      .catch((err) =>
        console.error(err),
      );

    return () => unsubscribe();
  }, [
    selectedConversation,
    user,
    participants,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  async function handleSendMessage() {
    if (
      !user ||
      !selectedConversation ||
      !messageText.trim() ||
      composerDisabled
    ) {
      return;
    }

    setSending(true);
    setError("");

    const text =
      messageText.trim();

    try {
      await sendMessage(
        selectedConversation.id,
        user.uid,
        text,
      );

      setMessageText("");

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id ===
          selectedConversation.id
            ? {
                ...conversation,
                lastMessage: text,
              }
            : conversation,
        ),
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to send your message.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  async function handleBlock() {
    if (!user || !otherUserId) return;

    const confirmed = window.confirm(
      `Block ${
        otherUser?.name ||
        "this person"
      }? You will no longer be able to message each other.`,
    );

    if (!confirmed) return;

    setBlocking(true);
    setError("");

    try {
      const id = await blockUser(
        user.uid,
        otherUserId,
      );

      setMyBlockId(id);
      setBlockedByMe(true);
      setShowSafetyMenu(false);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to block this user right now.",
      );
    } finally {
      setBlocking(false);
    }
  }

  async function handleUnblock() {
    if (!myBlockId) return;

    setUnblocking(true);
    setError("");

    try {
      await unblockUser(myBlockId);
      setBlockedByMe(false);
      setMyBlockId(null);
      setShowSafetyMenu(false);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to unblock this user right now.",
      );
    } finally {
      setUnblocking(false);
    }
  }

  async function handleSubmitReport() {
    if (
      !user ||
      !selectedConversation ||
      !otherUserId
    ) {
      return;
    }

    if (!reportReason.trim()) {
      setError(
        "Please describe the issue before submitting.",
      );
      return;
    }

    setSubmittingReport(true);
    setError("");

    try {
      await submitReport(
        selectedConversation.id,
        user.uid,
        user.displayName ||
          user.email ||
          "The Study user",
        otherUserId,
        otherUser?.name ||
          "The Study user",
        reportReason,
      );

      setReportSent(true);
      setShowReportForm(false);
      setShowSafetyMenu(false);
      setReportReason("");
    } catch (err) {
      console.error(err);
      setError(
        "Unable to submit your report right now.",
      );
    } finally {
      setSubmittingReport(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#fbfcff]">
        <p className="text-sm text-slate-500">
          Loading messages...
        </p>
      </main>
    );
  }

  if (!user) return null;

  const showConversationList =
    !selectedConversation;

  return (
    <main className="bg-[#fbfcff] md:px-5 md:py-6 lg:px-8">
      <div className="mx-auto flex h-[calc(100vh-76px)] max-w-7xl overflow-hidden border-slate-200 bg-white md:h-[calc(100vh-124px)] md:rounded-[2rem] md:border md:shadow-[0_24px_80px_-55px_rgba(15,23,42,0.3)]">
        {/* CONVERSATION LIST */}
        <aside
          className={[
            "w-full shrink-0 border-r border-slate-200 bg-white md:block md:w-[340px]",
            showConversationList
              ? "block"
              : "hidden",
          ].join(" ")}
        >
          <div className="border-b border-slate-200 px-5 py-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-950"
            >
              <ArrowLeft />
              Dashboard
            </Link>

            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.025em] text-slate-950">
              Messages
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Your mentorship conversations
            </p>
          </div>

          <div className="h-[calc(100%-116px)] overflow-y-auto">
            {loadingConversations ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-20 animate-pulse rounded-2xl bg-slate-100"
                    />
                  ),
                )}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <MessageIcon />
                </div>

                <p className="mt-5 text-sm font-semibold text-slate-800">
                  No conversations yet
                </p>

                <p className="mt-2 text-xs leading-6 text-slate-500">
                  An accepted mentorship
                  connection will create a
                  private conversation here.
                </p>

                <Link
                  href="/mentorship"
                  className="mt-5 inline-flex text-xs font-semibold text-blue-700 hover:underline"
                >
                  View mentorship
                </Link>
              </div>
            ) : (
              <div className="p-2">
                {conversations.map(
                  (conversation) => {
                    const participant =
                      participants[
                        conversation.id
                      ];

                    const name =
                      participant?.name ||
                      "The Study connection";

                    return (
                      <button
                        key={
                          conversation.id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedConversation(
                            conversation,
                          )
                        }
                        className={[
                          "w-full rounded-2xl p-4 text-left transition",
                          selectedConversation?.id ===
                          conversation.id
                            ? "bg-blue-50"
                            : "hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 font-semibold text-blue-800 ring-1 ring-blue-100">
                            {name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {name}
                              </p>

                              {participant?.role && (
                                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                                  {
                                    participant.role
                                  }
                                </span>
                              )}
                            </div>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {conversation.lastMessage ||
                                "No messages yet"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </aside>

        {/* CHAT */}
        <section
          className={[
            "min-w-0 flex-1 flex-col bg-[#fbfcff] md:flex",
            selectedConversation
              ? "flex"
              : "hidden",
          ].join(" ")}
        >
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <MessageIcon />
                </div>

                <h2 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                  Your conversations
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-500">
                  Select a conversation to
                  continue an accepted
                  mentorship connection.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* CHAT HEADER */}
              <header className="relative border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedConversation(
                          null,
                        )
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 md:hidden"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft />
                    </button>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 font-semibold text-blue-800 ring-1 ring-blue-100">
                      {otherUser?.name
                        ?.charAt(0)
                        .toUpperCase() ||
                        "?"}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-slate-950 sm:text-base">
                        {otherUser?.name ||
                          "The Study connection"}
                      </h2>

                      <p className="mt-0.5 text-xs capitalize text-slate-500">
                        {otherUser?.role
                          ? `${otherUser.role} · The Study community`
                          : "The Study community"}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setShowSafetyMenu(
                          (current) =>
                            !current,
                        )
                      }
                      aria-label="Conversation safety options"
                      aria-expanded={
                        showSafetyMenu
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-600 transition hover:bg-slate-50"
                    >
                      •••
                    </button>

                    {showSafetyMenu && (
                      <div className="absolute right-0 top-12 z-30 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setShowReportForm(
                              true,
                            );
                            setShowSafetyMenu(
                              false,
                            );
                          }}
                          className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Report conversation
                        </button>

                        {blockedByMe ? (
                          <button
                            type="button"
                            onClick={
                              handleUnblock
                            }
                            disabled={
                              unblocking
                            }
                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            {unblocking
                              ? "Unblocking..."
                              : "Unblock user"}
                          </button>
                        ) : !blockedByOther ? (
                          <button
                            type="button"
                            onClick={
                              handleBlock
                            }
                            disabled={
                              blocking
                            }
                            className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {blocking
                              ? "Blocking..."
                              : "Block user"}
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {showReportForm && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Report this conversation
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      This is sent privately to
                      a school administrator, not
                      to{" "}
                      {otherUser?.name ||
                        "the other person"}.
                    </p>

                    <textarea
                      value={reportReason}
                      onChange={(event) =>
                        setReportReason(
                          event.target.value,
                        )
                      }
                      maxLength={2000}
                      placeholder="Describe what happened..."
                      className="mt-3 min-h-24 w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={
                          handleSubmitReport
                        }
                        disabled={
                          submittingReport
                        }
                        className="rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        {submittingReport
                          ? "Sending..."
                          : "Submit report"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowReportForm(
                            false,
                          );
                          setReportReason("");
                        }}
                        className="rounded-full px-4 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {reportSent && (
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                    Report submitted. A school
                    administrator can review it.
                  </div>
                )}
              </header>

              {/* MESSAGES */}
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-slate-400">
                      Loading conversation...
                    </p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-sm text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-200">
                        <MessageIcon />
                      </div>

                      <p className="mt-5 font-semibold text-slate-800">
                        Start the conversation
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Introduce yourself, be
                        respectful, and keep the
                        conversation focused on
                        mentorship.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl space-y-3">
                    {messages.map(
                      (message) => {
                        const isMine =
                          message.senderId ===
                          user.uid;

                        const time =
                          formatMessageTime(
                            message.createdAt,
                          );

                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              isMine
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={[
                                "max-w-[86%] rounded-[1.4rem] px-4 py-3 text-sm leading-6 sm:max-w-[75%]",
                                isMine
                                  ? "rounded-br-md bg-blue-700 text-white"
                                  : "rounded-bl-md border border-slate-200 bg-white text-slate-800",
                              ].join(" ")}
                            >
                              <p className="whitespace-pre-wrap break-words">
                                {
                                  message.text
                                }
                              </p>

                              {time && (
                                <p
                                  className={[
                                    "mt-1.5 text-[10px]",
                                    isMine
                                      ? "text-blue-100"
                                      : "text-slate-400",
                                  ].join(
                                    " ",
                                  )}
                                >
                                  {time}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      },
                    )}

                    <div
                      ref={
                        messagesEndRef
                      }
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="px-4 pb-3 sm:px-6">
                  <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              )}

              {/* COMPOSER */}
              {composerDisabled ? (
                <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
                  <div className="mx-auto max-w-3xl rounded-2xl bg-slate-100 p-4 text-center text-sm leading-6 text-slate-600">
                    {blockedByMe
                      ? "You blocked this user, so messaging is paused."
                      : "Messaging is unavailable for this conversation."}

                    {blockedByMe && (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={
                            handleUnblock
                          }
                          disabled={
                            unblocking
                          }
                          className="font-semibold text-slate-900 underline underline-offset-2"
                        >
                          {unblocking
                            ? "Unblocking..."
                            : "Unblock"}
                        </button>{" "}
                        to resume.
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
                  <div className="mx-auto flex max-w-3xl items-end gap-3">
                    <textarea
                      value={messageText}
                      onChange={(event) =>
                        setMessageText(
                          event.target.value,
                        )
                      }
                      onKeyDown={
                        handleKeyDown
                      }
                      maxLength={2000}
                      rows={1}
                      placeholder="Write a message..."
                      className="max-h-32 min-h-[48px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />

                    <button
                      type="button"
                      onClick={
                        handleSendMessage
                      }
                      disabled={
                        sending ||
                        !messageText.trim()
                      }
                      aria-label="Send message"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sending ? (
                        <span className="text-xs">
                          ...
                        </span>
                      ) : (
                        <SendIcon />
                      )}
                    </button>
                  </div>

                  <p className="mx-auto mt-2 hidden max-w-3xl text-xs text-slate-400 sm:block">
                    Enter to send · Shift +
                    Enter for a new line
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
