"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";

import {
  getConversationsForUser,
  getUserProfile,
  sendMessage,
  subscribeToMessages,
  submitReport,
  blockUser,
  unblockUser,
  getMyBlockOfUser,
  type Conversation,
  type ChatMessage,
} from "@/lib/firebase/firestore";

type OtherUser = {
  name?: string;
  role?: string;
};

export default function MessagesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [participants, setParticipants] = useState<
    Record<string, OtherUser>
  >({});

  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  const [loadingMessages, setLoadingMessages] = useState(false);

  const [messageText, setMessageText] = useState("");

  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  // Safety state
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedByOther, setBlockedByOther] = useState(false);
  const [myBlockId, setMyBlockId] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [unblocking, setUnblocking] = useState(false);

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const composerDisabled = blockedByMe || blockedByOther;

  // =========================================================
  // LOAD CONVERSATIONS + PARTICIPANT NAMES
  // =========================================================

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const currentUser = user;

    async function loadConversations() {
      try {
        const results = await getConversationsForUser(currentUser.uid);

        setConversations(results);

        const entries = await Promise.all(
          results.map(async (conversation) => {
            const otherId =
              conversation.studentId === currentUser.uid
                ? conversation.alumniId
                : conversation.studentId;

            try {
              const profile = await getUserProfile(otherId);

              return [
                conversation.id,
                profile
                  ? { name: profile.displayName, role: profile.role }
                  : {},
              ] as const;
            } catch (err) {
              console.error(err);
              return [conversation.id, {}] as const;
            }
          })
        );

        setParticipants(Object.fromEntries(entries));
      } catch (err) {
        console.error(err);
        setError("Unable to load your conversations.");
      }
    }

    loadConversations();
  }, [user, loading, router]);

  // =========================================================
  // LOAD SELECTED CONVERSATION (live)
  // =========================================================

  useEffect(() => {
    if (!selectedConversation || !user) {
      return;
    }

    const currentConversation = selectedConversation;
    const currentUser = user;

    setLoadingMessages(true);
    setError("");
    setShowReportForm(false);
    setReportReason("");
    setReportSent(false);

    const otherId =
      currentConversation.studentId === currentUser.uid
        ? currentConversation.alumniId
        : currentConversation.studentId;

    setOtherUserId(otherId);

    const unsubscribe = subscribeToMessages(
      currentConversation.id,
      (liveMessages) => {
        setMessages(liveMessages);
        setLoadingMessages(false);
      }
    );

    const cached = participants[currentConversation.id];

    if (cached?.name) {
      setOtherUser(cached);
    } else {
      getUserProfile(otherId)
        .then((profile) => {
          setOtherUser(
            profile
              ? { name: profile.displayName, role: profile.role }
              : null
          );
        })
        .catch((err) => console.error(err));
    }

    Promise.all([
      getMyBlockOfUser(currentUser.uid, otherId),
      getMyBlockOfUser(otherId, currentUser.uid),
    ])
      .then(([mine, theirs]) => {
        setMyBlockId(mine);
        setBlockedByMe(!!mine);
        setBlockedByOther(!!theirs);
      })
      .catch((err) => console.error(err));

    return () => unsubscribe();
  }, [selectedConversation, user, participants]);

  // =========================================================
  // SEND MESSAGE
  // =========================================================

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

    const text = messageText.trim();

    try {
      await sendMessage(selectedConversation.id, user.uid, text);

      setMessageText("");

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? { ...conversation, lastMessage: text }
            : conversation
        )
      );
    } catch (err) {
      console.error(err);
      setError("Unable to send your message.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  // =========================================================
  // BLOCK / UNBLOCK
  // =========================================================

  async function handleBlock() {
    if (!user || !otherUserId) return;

    const confirmed = window.confirm(
      `Block ${otherUser?.name || "this person"}? They won't be able to message you anymore.`
    );

    if (!confirmed) return;

    setBlocking(true);
    setError("");

    try {
      const id = await blockUser(user.uid, otherUserId);
      setMyBlockId(id);
      setBlockedByMe(true);
    } catch (err) {
      console.error(err);
      setError("Unable to block this user right now.");
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
    } catch (err) {
      console.error(err);
      setError("Unable to unblock this user right now.");
    } finally {
      setUnblocking(false);
    }
  }

  // =========================================================
  // REPORT
  // =========================================================

  async function handleSubmitReport() {
    if (!user || !selectedConversation || !otherUserId) return;

    if (!reportReason.trim()) {
      setError("Please describe the issue before submitting.");
      return;
    }

    setSubmittingReport(true);
    setError("");

    try {
      await submitReport(
        selectedConversation.id,
        user.uid,
        user.displayName || user.email || "TSL user",
        otherUserId,
        otherUser?.name || "TSL user",
        reportReason
      );

      setReportSent(true);
      setShowReportForm(false);
      setReportReason("");
    } catch (err) {
      console.error(err);
      setError("Unable to submit your report right now.");
    } finally {
      setSubmittingReport(false);
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading messages...</p>
      </main>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        {/* SIDEBAR */}

        <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-white md:block">
          <div className="border-b border-slate-200 p-6">
            <button
              onClick={() => router.push("/alumni")}
              className="text-sm font-semibold text-slate-500 hover:text-slate-950"
            >
              ← Alumni
            </button>

            <h1 className="mt-5 text-2xl font-bold text-slate-950">
              Messages
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Your TSL conversations
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No conversations yet
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Accepted mentorship connections will appear here.
                </p>
              </div>
            ) : (
              conversations.map((conversation) => {
                const participant = participants[conversation.id];
                const name = participant?.name || "TSL Connection";

                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`w-full p-5 text-left transition ${
                      selectedConversation?.id === conversation.id
                        ? "bg-slate-100"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 font-semibold text-white">
                        {name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {name}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {conversation.lastMessage || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* CHAT */}

        <section className="flex min-w-0 flex-1 flex-col">
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-2xl shadow-sm">
                  💬
                </div>

                <h2 className="mt-5 text-2xl font-bold text-slate-950">
                  Your conversations
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Select a conversation from the sidebar to start chatting
                  with a member of the TSL alumni community.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* CHAT HEADER */}

              <header className="border-b border-slate-200 bg-white px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 font-bold text-white">
                      {otherUser?.name?.charAt(0).toUpperCase() || "?"}
                    </div>

                    <div>
                      <h2 className="font-bold text-slate-950">
                        {otherUser?.name || "TSL Alumni"}
                      </h2>

                      <p className="text-xs text-slate-500">
                        {otherUser?.role || "TSL community member"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      onClick={() => setShowReportForm((current) => !current)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-950"
                    >
                      Report
                    </button>

                    {blockedByMe ? (
                      <button
                        onClick={handleUnblock}
                        disabled={unblocking}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-950 disabled:opacity-50"
                      >
                        {unblocking ? "Unblocking..." : "Unblock"}
                      </button>
                    ) : !blockedByOther ? (
                      <button
                        onClick={handleBlock}
                        disabled={blocking}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {blocking ? "Blocking..." : "Block"}
                      </button>
                    ) : null}
                  </div>
                </div>

                {showReportForm && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Report this conversation
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      This is sent privately to a TSL administrator, not
                      to {otherUser?.name || "the other person"}.
                    </p>

                    <textarea
                      value={reportReason}
                      onChange={(event) =>
                        setReportReason(event.target.value)
                      }
                      placeholder="What happened?"
                      className="mt-3 min-h-20 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-slate-500"
                    />

                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={handleSubmitReport}
                        disabled={submittingReport}
                        className="rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {submittingReport ? "Sending..." : "Submit report"}
                      </button>

                      <button
                        onClick={() => setShowReportForm(false)}
                        className="text-xs font-semibold text-slate-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {reportSent && (
                  <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                    Report submitted. A TSL administrator will review it.
                  </div>
                )}
              </header>

              {/* MESSAGES */}

              <div className="flex-1 overflow-y-auto px-6 py-8">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-slate-400">
                      Loading conversation...
                    </p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <p className="font-semibold text-slate-800">
                        Start the conversation
                      </p>

                      <p className="mt-2 text-sm text-slate-500">
                        Introduce yourself and say hello.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto max-w-3xl space-y-4">
                    {messages.map((message) => {
                      const isMine = message.senderId === user?.uid;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            isMine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-3xl px-5 py-3 text-sm leading-6 ${
                              isMine
                                ? "bg-slate-950 text-white"
                                : "bg-white text-slate-800 shadow-sm"
                            }`}
                          >
                            {message.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ERROR */}

              {error && (
                <div className="px-6">
                  <div className="mx-auto max-w-3xl rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              )}

              {/* COMPOSER */}

              {composerDisabled ? (
                <div className="border-t border-slate-200 bg-white p-5">
                  <div className="mx-auto max-w-3xl rounded-2xl bg-slate-100 p-4 text-center text-sm text-slate-600">
                    You can't message this conversation anymore.
                    {blockedByMe && (
                      <>
                        {" "}
                        <button
                          onClick={handleUnblock}
                          disabled={unblocking}
                          className="font-semibold text-slate-900 underline"
                        >
                          Unblock
                        </button>{" "}
                        to resume.
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-200 bg-white p-5">
                  <div className="mx-auto flex max-w-3xl items-end gap-3">
                    <textarea
                      value={messageText}
                      onChange={(event) =>
                        setMessageText(event.target.value)
                      }
                      onKeyDown={handleKeyDown}
                      maxLength={2000}
                      rows={1}
                      placeholder="Write a message..."
                      className="max-h-32 min-h-[48px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:bg-white"
                    />

                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !messageText.trim()}
                      className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sending ? "..." : "Send"}
                    </button>
                  </div>

                  <p className="mx-auto mt-2 max-w-3xl text-xs text-slate-400">
                    Enter to send · Shift + Enter for a new line
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