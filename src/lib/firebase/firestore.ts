import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./client";

export type UserRole = "student" | "alumni";
export type UserStatus = "active" | "pending";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  photoURL: string | null;
  isAdmin?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function getUserProfile(uid: string) {
  const reference = doc(db, "users", uid);

  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
}

export async function createUserProfile(
  uid: string,
  data: {
    email: string;
    displayName: string;
    role: UserRole;
    photoURL?: string | null;
  },
) {
  const reference = doc(db, "users", uid);

  const profile: UserProfile = {
  uid,
  email: data.email,
  displayName: data.displayName,
  role: data.role,
  status: data.role === "alumni" ? "pending" : "active",
  photoURL: data.photoURL ?? null,
  isAdmin: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
};

  await setDoc(reference, profile);

  return profile;
}

export async function createStudentProfile(
  uid: string,
  data: {
    name: string;
    graduationYear: string;
    interests: string[];
    bio: string;
  },
) {
  const reference = doc(db, "studentProfiles", uid);

  await setDoc(reference, {
    uid,
    name: data.name,
    graduationYear: data.graduationYear,
    interests: data.interests,
    bio: data.bio,
    profileCompleted: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createAlumniProfile(
  uid: string,
  data: {
    name: string;
    graduationYear: string;
    university: string;
    degree: string;
    field: string;
    currentRole: string;
    company: string;
    expertise: string[];
    bio: string;
    mentorshipAvailable: boolean;
  },
) {
  const reference = doc(db, "alumniProfiles", uid);

  await setDoc(reference, {
    uid,
    name: data.name,
    graduationYear: data.graduationYear,
    university: data.university,
    degree: data.degree,
    field: data.field,
    currentRole: data.currentRole,
    company: data.company,
    expertise: data.expertise,
    bio: data.bio,
    mentorshipAvailable: data.mentorshipAvailable,
    verificationStatus: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function getPendingAlumni() {
  const alumniRef = collection(db, "alumniProfiles");

  const q = query(
    alumniRef,
    where("verificationStatus", "==", "pending")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function updateAlumniVerification(
  uid: string,
  status: "verified" | "rejected"
) {
  const alumniRef = doc(db, "alumniProfiles", uid);

  await updateDoc(alumniRef, {
    verificationStatus: status,
    updatedAt: serverTimestamp(),
  });
}
export async function getVerifiedAlumni() {
  const alumniRef = collection(db, "alumniProfiles");

  const q = query(
    alumniRef,
    where("verificationStatus", "==", "verified")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}
export async function getAlumniProfile(uid: string) {
  const reference = doc(db, "alumniProfiles", uid);

  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}
export type MentorshipRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

export type MentorshipRequest = {
  id: string;
  studentId: string;
  alumniId: string;
  message: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt?: unknown;
  updatedAt?: unknown;
};
export async function createMentorshipRequest(
  studentId: string,
  alumniId: string,
  message: string
) {
  const requestRef = doc(collection(db, "mentorshipRequests"));

  await setDoc(requestRef, {
    id: requestRef.id,
    studentId,
    alumniId,
    message: message.trim(),
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return requestRef.id;
}

export async function getMentorshipRequestsForStudent(
  studentId: string
): Promise<MentorshipRequest[]> {
  const requestsRef = collection(db, "mentorshipRequests");

  const q = query(
    requestsRef,
    where("studentId", "==", studentId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as MentorshipRequest[];
}

export async function getMentorshipRequestsForAlumni(
  alumniId: string
): Promise<MentorshipRequest[]> {
  const requestsRef = collection(db, "mentorshipRequests");

  const q = query(
    requestsRef,
    where("alumniId", "==", alumniId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as MentorshipRequest[];
}

export async function updateMentorshipRequest(
  requestId: string,
  status: "accepted" | "declined" | "cancelled"
) {
  const requestRef = doc(
    db,
    "mentorshipRequests",
    requestId
  );

  await updateDoc(requestRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}
export type Conversation = {
  id: string;
  studentId: string;
  alumniId: string;
  createdAt?: unknown;
  lastMessage?: string;
  lastMessageAt?: unknown;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt?: unknown;
};
export async function createConversation(
  studentId: string,
  alumniId: string
): Promise<string> {
  const conversationsRef = collection(db, "conversations");

  const existingQuery = query(
    conversationsRef,
    where("studentId", "==", studentId),
    where("alumniId", "==", alumniId)
  );

  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    return existingSnapshot.docs[0].id;
  }

  const conversation = await addDoc(conversationsRef, {
    studentId,
    alumniId,
    createdAt: serverTimestamp(),
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
  });

  return conversation.id;
}
export async function getConversationsForUser(
  userId: string
): Promise<Conversation[]> {
  const conversationsRef = collection(db, "conversations");

  const studentQuery = query(
    conversationsRef,
    where("studentId", "==", userId)
  );

  const alumniQuery = query(
    conversationsRef,
    where("alumniId", "==", userId)
  );

  const [studentSnapshot, alumniSnapshot] =
    await Promise.all([
      getDocs(studentQuery),
      getDocs(alumniQuery),
    ]);

  const conversations = [
    ...studentSnapshot.docs,
    ...alumniSnapshot.docs,
  ];

  return conversations.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Conversation[];
}
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<void> {
  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error("Message cannot be empty.");
  }

  if (cleanText.length > 2000) {
    throw new Error("Message is too long.");
  }

  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  await addDoc(messagesRef, {
    senderId,
    text: cleanText,
    createdAt: serverTimestamp(),
  });

  await updateDoc(
    doc(db, "conversations", conversationId),
    {
      lastMessage: cleanText,
      lastMessageAt: serverTimestamp(),
    }
  );
}
export async function getConversationMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  const snapshot = await getDocs(messagesRef);

  const messages: ChatMessage[] = snapshot.docs.map((item) => {
    const data = item.data();

    return {
      id: item.id,
      senderId: data.senderId as string,
      text: data.text as string,
      createdAt: data.createdAt,
    };
  });

  return messages.sort((a, b) => {
    const aTime =
      typeof (a.createdAt as any)?.toMillis === "function"
        ? (a.createdAt as any).toMillis()
        : 0;

    const bTime =
      typeof (b.createdAt as any)?.toMillis === "function"
        ? (b.createdAt as any).toMillis()
        : 0;

    return aTime - bTime;
  });
}
export async function acceptMentorshipRequest(
  requestId: string
): Promise<string> {
  const requestRef = doc(
    db,
    "mentorshipRequests",
    requestId
  );

  const requestSnapshot = await getDoc(requestRef);

  if (!requestSnapshot.exists()) {
    throw new Error("Mentorship request not found.");
  }

  const requestData = requestSnapshot.data();

  if (
    !requestData.studentId ||
    !requestData.alumniId
  ) {
    throw new Error("Invalid mentorship request.");
  }

  if (requestData.status !== "pending") {
    throw new Error(
      "This mentorship request is no longer pending."
    );
  }

  await updateDoc(requestRef, {
    status: "accepted",
    updatedAt: serverTimestamp(),
  });

  const conversationId = await createConversation(
    requestData.studentId,
    requestData.alumniId
  );

  return conversationId;
}
export type QuestionStatus = "open" | "answered";

export type Question = {
  id: string;
  studentId: string;
  studentName: string;
  questionText: string;
  status: QuestionStatus;
  answererId?: string;
  answererName?: string;
  answerText?: string;
  createdAt?: unknown;
  answeredAt?: unknown;
};

export async function createQuestion(
  studentId: string,
  studentName: string,
  questionText: string
): Promise<string> {
  const cleanText = questionText.trim();

  if (!cleanText) {
    throw new Error("Question cannot be empty.");
  }

  const questionsRef = collection(db, "questions");

  const question = await addDoc(questionsRef, {
    studentId,
    studentName,
    questionText: cleanText,
    status: "open",
    createdAt: serverTimestamp(),
  });

  return question.id;
}

export async function getQuestionsForStudent(
  studentId: string
): Promise<Question[]> {
  const questionsRef = collection(db, "questions");

  const q = query(questionsRef, where("studentId", "==", studentId));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Question[];
}

export async function getOpenQuestions(): Promise<Question[]> {
  const questionsRef = collection(db, "questions");

  const q = query(questionsRef, where("status", "==", "open"));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Question[];
}

export async function answerQuestion(
  questionId: string,
  answererId: string,
  answererName: string,
  answerText: string
): Promise<void> {
  const cleanAnswer = answerText.trim();

  if (!cleanAnswer) {
    throw new Error("Answer cannot be empty.");
  }

  const questionRef = doc(db, "questions", questionId);

  await updateDoc(questionRef, {
    status: "answered",
    answererId,
    answererName,
    answerText: cleanAnswer,
    answeredAt: serverTimestamp(),
  });
}


export function subscribeToMessages(
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
) {
  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  return onSnapshot(messagesRef, (snapshot) => {
    const messages: ChatMessage[] = snapshot.docs.map((item) => {
      const data = item.data();

      return {
        id: item.id,
        senderId: data.senderId as string,
        text: data.text as string,
        createdAt: data.createdAt,
      };
    });

    messages.sort((a, b) => {
      const aTime =
        typeof (a.createdAt as any)?.toMillis === "function"
          ? (a.createdAt as any).toMillis()
          : 0;

      const bTime =
        typeof (b.createdAt as any)?.toMillis === "function"
          ? (b.createdAt as any).toMillis()
          : 0;

      return aTime - bTime;
    });

    callback(messages);
  });
}
export type ReportStatus = "open" | "resolved";

export type Report = {
  id: string;
  conversationId: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  status: ReportStatus;
  createdAt?: unknown;
};

export async function submitReport(
  conversationId: string,
  reporterId: string,
  reporterName: string,
  reportedUserId: string,
  reportedUserName: string,
  reason: string
): Promise<void> {
  const cleanReason = reason.trim();

  if (!cleanReason) {
    throw new Error("Please describe the issue before submitting.");
  }

  const reportsRef = collection(db, "reports");

  await addDoc(reportsRef, {
    conversationId,
    reporterId,
    reporterName,
    reportedUserId,
    reportedUserName,
    reason: cleanReason,
    status: "open",
    createdAt: serverTimestamp(),
  });
}

export async function getOpenReports(): Promise<Report[]> {
  const reportsRef = collection(db, "reports");

  const q = query(reportsRef, where("status", "==", "open"));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Report[];
}

export async function resolveReport(reportId: string): Promise<void> {
  const reportRef = doc(db, "reports", reportId);

  await updateDoc(reportRef, {
    status: "resolved",
    resolvedAt: serverTimestamp(),
  });
}

export async function blockUser(
  blockerId: string,
  blockedId: string
): Promise<string> {
  const blocksRef = collection(db, "blocks");

  const ref = await addDoc(blocksRef, {
    blockerId,
    blockedId,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function getMyBlockOfUser(
  userId: string,
  otherUserId: string
): Promise<string | null> {
  const blocksRef = collection(db, "blocks");

  const q = query(
    blocksRef,
    where("blockerId", "==", userId),
    where("blockedId", "==", otherUserId)
  );

  const snapshot = await getDocs(q);

  return snapshot.empty ? null : snapshot.docs[0].id;
}

export async function unblockUser(blockDocId: string): Promise<void> {
  const blockRef = doc(db, "blocks", blockDocId);
  await deleteDoc(blockRef);
}

export async function isBlockedEitherWay(
  userId: string,
  otherUserId: string
): Promise<boolean> {
  const blocksRef = collection(db, "blocks");

  const [asBlocker, asBlocked] = await Promise.all([
    getDocs(
      query(
        blocksRef,
        where("blockerId", "==", userId),
        where("blockedId", "==", otherUserId)
      )
    ),
    getDocs(
      query(
        blocksRef,
        where("blockerId", "==", otherUserId),
        where("blockedId", "==", userId)
      )
    ),
  ]);

  return !asBlocker.empty || !asBlocked.empty;
}