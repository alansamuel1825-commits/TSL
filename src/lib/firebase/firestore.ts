import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "./client";


// ============================================================
// SMALL INTERNAL HELPERS
// ============================================================

function timestampToMillis(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return 0;
}

function getBlockReference(
  blockerId: string,
  blockedId: string
) {
  return doc(
    db,
    "blocks",
    blockerId,
    "blockedUsers",
    blockedId
  );
}


// ============================================================
// USERS
// ============================================================

export type UserRole = "student" | "alumni";

export type UserStatus =
  | "active"
  | "pending";

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

export interface PublicUserProfile {
  uid: string;
  displayName: string;
  role: UserRole;
  photoURL: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const reference = doc(db, "users", uid);

  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
}

export async function getPublicUserProfile(
  uid: string
): Promise<PublicUserProfile | null> {
  const reference = doc(
    db,
    "publicProfiles",
    uid
  );

  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as PublicUserProfile;
}

export async function ensureOwnPublicProfile(
  profile: UserProfile
): Promise<void> {
  const reference = doc(
    db,
    "publicProfiles",
    profile.uid
  );

  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    await setDoc(reference, {
      uid: profile.uid,
      displayName: profile.displayName,
      role: profile.role,
      photoURL: profile.photoURL,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return;
  }

  const current =
    snapshot.data() as PublicUserProfile;

  if (
    current.displayName === profile.displayName &&
    current.role === profile.role &&
    current.photoURL === profile.photoURL
  ) {
    return;
  }

  await updateDoc(reference, {
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    updatedAt: serverTimestamp(),
  });
}

export async function createUserProfile(
  uid: string,
  data: {
    email: string;
    displayName: string;
    role: UserRole;
    photoURL?: string | null;
  }
): Promise<UserProfile> {
  const userRef = doc(
    db,
    "users",
    uid
  );

  const publicRef = doc(
    db,
    "publicProfiles",
    uid
  );

  const profile: UserProfile = {
    uid,
    email: data.email.trim(),
    displayName: data.displayName.trim(),
    role: data.role,
    status:
      data.role === "alumni"
        ? "pending"
        : "active",
    photoURL: data.photoURL ?? null,
    isAdmin: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);

  batch.set(userRef, profile);

  batch.set(publicRef, {
    uid,
    displayName: profile.displayName,
    role: profile.role,
    photoURL: profile.photoURL,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  return profile;
}

export async function completeStudentOnboarding(
  uid: string,
  account: {
    email: string;
    displayName: string;
    photoURL?: string | null;
  },
  data: {
    graduationYear: string;
    interests: string[];
    bio: string;
  }
): Promise<void> {
  const name = account.displayName.trim();

  const userRef = doc(db, "users", uid);
  const publicRef = doc(db, "publicProfiles", uid);
  const studentRef = doc(db, "studentProfiles", uid);

  const batch = writeBatch(db);

  batch.set(userRef, {
    uid,
    email: account.email.trim(),
    displayName: name,
    role: "student",
    status: "active",
    photoURL: account.photoURL ?? null,
    isAdmin: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(publicRef, {
    uid,
    displayName: name,
    role: "student",
    photoURL: account.photoURL ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(studentRef, {
    uid,
    name,
    graduationYear: data.graduationYear.trim(),
    interests: data.interests,
    bio: data.bio.trim(),
    profileCompleted: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function completeAlumniOnboarding(
  uid: string,
  account: {
    email: string;
    displayName: string;
    photoURL?: string | null;
  },
  data: {
    graduationYear: string;
    university: string;
    degree: string;
    field: string;
    currentRole: string;
    company: string;
    expertise: string[];
    bio: string;
    mentorshipAvailable: boolean;
  }
): Promise<void> {
  const name = account.displayName.trim();

  const userRef = doc(db, "users", uid);
  const publicRef = doc(db, "publicProfiles", uid);
  const alumniRef = doc(db, "alumniProfiles", uid);

  const batch = writeBatch(db);

  batch.set(userRef, {
    uid,
    email: account.email.trim(),
    displayName: name,
    role: "alumni",
    status: "pending",
    photoURL: account.photoURL ?? null,
    isAdmin: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(publicRef, {
    uid,
    displayName: name,
    role: "alumni",
    photoURL: account.photoURL ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(alumniRef, {
    uid,
    name,
    graduationYear: data.graduationYear.trim(),
    university: data.university.trim(),
    degree: data.degree.trim(),
    field: data.field.trim(),
    currentRole: data.currentRole.trim(),
    company: data.company.trim(),
    expertise: data.expertise,
    bio: data.bio.trim(),
    mentorshipAvailable: data.mentorshipAvailable,
    verificationStatus: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}


// ============================================================
// STUDENT PROFILES
// ============================================================

export type StudentProfile = {
  uid: string;
  name: string;
  graduationYear: string;
  interests: string[];
  bio: string;
  profileCompleted: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function createStudentProfile(
  uid: string,
  data: {
    name: string;
    graduationYear: string;
    interests: string[];
    bio: string;
  }
): Promise<void> {
  const reference = doc(
    db,
    "studentProfiles",
    uid
  );

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

export async function getStudentProfile(
  uid: string
): Promise<StudentProfile | null> {
  const reference = doc(
    db,
    "studentProfiles",
    uid
  );

  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as StudentProfile;
}

export async function updateStudentProfile(
  uid: string,
  data: {
    name: string;
    graduationYear: string;
    interests: string[];
    bio: string;
  }
): Promise<void> {
  const name = data.name.trim();
  const graduationYear =
    data.graduationYear.trim();
  const bio = data.bio.trim();

  const interests = Array.from(
    new Set(
      data.interests
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

  if (!name) {
    throw new Error(
      "Please enter your name."
    );
  }

  if (name.length > 100) {
    throw new Error(
      "Name is too long."
    );
  }

  if (!graduationYear) {
    throw new Error(
      "Please enter your graduation year."
    );
  }

  if (graduationYear.length > 20) {
    throw new Error(
      "Graduation year is too long."
    );
  }

  if (bio.length > 2000) {
    throw new Error(
      "Bio is too long."
    );
  }

  if (interests.length > 20) {
    throw new Error(
      "Please keep interests to 20 or fewer."
    );
  }

  if (
    interests.some(
      (item) => item.length > 80
    )
  ) {
    throw new Error(
      "One or more interests are too long."
    );
  }

  const userRef = doc(
    db,
    "users",
    uid
  );

  const studentRef = doc(
    db,
    "studentProfiles",
    uid
  );

  const publicRef = doc(
    db,
    "publicProfiles",
    uid
  );

  const batch = writeBatch(db);

  batch.update(userRef, {
    displayName: name,
    updatedAt: serverTimestamp(),
  });

  batch.update(publicRef, {
    displayName: name,
    updatedAt: serverTimestamp(),
  });

  batch.update(studentRef, {
    name,
    graduationYear,
    interests,
    bio,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}


// ============================================================
// ALUMNI PROFILES
// ============================================================

export type AlumniVerificationStatus =
  | "pending"
  | "verified"
  | "rejected";

export type AlumniProfile = {
  id: string;
  uid: string;
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
  verificationStatus:
    AlumniVerificationStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

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
  }
) {
  const reference = doc(
    db,
    "alumniProfiles",
    uid
  );

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
    mentorshipAvailable:
      data.mentorshipAvailable,
    verificationStatus: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getPendingAlumni():
  Promise<AlumniProfile[]> {
  const alumniRef = collection(
    db,
    "alumniProfiles"
  );

  const q = query(
    alumniRef,
    where(
      "verificationStatus",
      "==",
      "pending"
    )
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as AlumniProfile[];
}

export async function updateAlumniVerification(
  uid: string,
  status: "verified" | "rejected"
): Promise<void> {
  const alumniRef = doc(
    db,
    "alumniProfiles",
    uid
  );

  const userRef = doc(
    db,
    "users",
    uid
  );

  const batch = writeBatch(db);

  batch.update(alumniRef, {
    verificationStatus: status,
    updatedAt: serverTimestamp(),
  });

  /*
   * Keep users.status and alumni verification aligned.
   *
   * Verified alumni become active.
   * Rejected alumni remain pending until reviewed again.
   */
  batch.update(userRef, {
    status:
      status === "verified"
        ? "active"
        : "pending",
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function getVerifiedAlumni():
  Promise<AlumniProfile[]> {
  const alumniRef = collection(
    db,
    "alumniProfiles"
  );

  const q = query(
    alumniRef,
    where(
      "verificationStatus",
      "==",
      "verified"
    )
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as AlumniProfile[];
}

export async function getAlumniProfile(
  uid: string
): Promise<AlumniProfile | null> {
  const reference = doc(
    db,
    "alumniProfiles",
    uid
  );

  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as AlumniProfile;
}

export async function updateAlumniProfile(
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
  }
): Promise<void> {
  const name = data.name.trim();
  const graduationYear =
    data.graduationYear.trim();
  const university =
    data.university.trim();
  const degree = data.degree.trim();
  const field = data.field.trim();
  const currentRole =
    data.currentRole.trim();
  const company = data.company.trim();
  const bio = data.bio.trim();

  const expertise = Array.from(
    new Set(
      data.expertise
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

  if (!name) {
    throw new Error(
      "Please enter your name."
    );
  }

  if (name.length > 100) {
    throw new Error(
      "Name is too long."
    );
  }

  if (!graduationYear) {
    throw new Error(
      "Please enter your graduation year."
    );
  }

  const shortFields = [
    graduationYear,
    university,
    degree,
    field,
    currentRole,
    company,
  ];

  if (
    shortFields.some(
      (value) => value.length > 150
    )
  ) {
    throw new Error(
      "One or more profile fields are too long."
    );
  }

  if (bio.length > 3000) {
    throw new Error(
      "Bio is too long."
    );
  }

  if (expertise.length > 20) {
    throw new Error(
      "Please keep expertise to 20 or fewer items."
    );
  }

  if (
    expertise.some(
      (item) => item.length > 80
    )
  ) {
    throw new Error(
      "One or more expertise items are too long."
    );
  }

  const userRef = doc(
    db,
    "users",
    uid
  );

  const alumniRef = doc(
    db,
    "alumniProfiles",
    uid
  );

  const publicRef = doc(
    db,
    "publicProfiles",
    uid
  );

  const batch = writeBatch(db);

  batch.update(userRef, {
    displayName: name,
    updatedAt: serverTimestamp(),
  });

  batch.update(publicRef, {
    displayName: name,
    updatedAt: serverTimestamp(),
  });

  batch.update(alumniRef, {
    name,
    graduationYear,
    university,
    degree,
    field,
    currentRole,
    company,
    expertise,
    bio,
    mentorshipAvailable:
      data.mentorshipAvailable,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}


// ============================================================
// MENTORSHIP REQUESTS
// ============================================================

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
  status: MentorshipRequestStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function createMentorshipRequest(
  studentId: string,
  alumniId: string,
  message: string
): Promise<string> {
  const cleanMessage = message.trim();

  if (!cleanMessage) {
    throw new Error(
      "Mentorship request message cannot be empty."
    );
  }

  if (cleanMessage.length > 2000) {
    throw new Error(
      "Mentorship request message is too long."
    );
  }

  if (studentId === alumniId) {
    throw new Error(
      "You cannot request mentorship from yourself."
    );
  }

  const requestRef = doc(
    collection(
      db,
      "mentorshipRequests"
    )
  );

  /*
   * We deliberately DO NOT store an extra `id`
   * field anymore.
   *
   * Firestore already gives the document its ID.
   */
  await setDoc(requestRef, {
    studentId,
    alumniId,
    message: cleanMessage,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return requestRef.id;
}

export async function getMentorshipRequestsForStudent(
  studentId: string
): Promise<MentorshipRequest[]> {
  const requestsRef = collection(
    db,
    "mentorshipRequests"
  );

  const q = query(
    requestsRef,
    where(
      "studentId",
      "==",
      studentId
    )
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
  const requestsRef = collection(
    db,
    "mentorshipRequests"
  );

  const q = query(
    requestsRef,
    where(
      "alumniId",
      "==",
      alumniId
    )
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as MentorshipRequest[];
}


// ============================================================
// CONVERSATIONS
// ============================================================

export type Conversation = {
  id: string;
  studentId: string;
  alumniId: string;

  /*
   * New secure architecture:
   * every new conversation points back to the
   * mentorship request that created it.
   */
  mentorshipRequestId?: string;

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


/*
 * Secure deterministic conversation creation.
 *
 * Conversation document ID =
 * mentorship request document ID.
 *
 * Therefore the same mentorship acceptance cannot
 * accidentally create multiple conversations.
 */
export async function createConversation(
  studentId: string,
  alumniId: string,
  mentorshipRequestId: string
): Promise<string> {
  if (!mentorshipRequestId) {
    throw new Error(
      "A mentorship request is required to create a conversation."
    );
  }

  const requestRef = doc(
    db,
    "mentorshipRequests",
    mentorshipRequestId
  );

  const requestSnapshot =
    await getDoc(requestRef);

  if (!requestSnapshot.exists()) {
    throw new Error(
      "Mentorship request not found."
    );
  }

  const requestData =
    requestSnapshot.data();

  if (
    requestData.studentId !== studentId ||
    requestData.alumniId !== alumniId
  ) {
    throw new Error(
      "Conversation participants do not match the mentorship request."
    );
  }

  if (
    requestData.status !== "accepted"
  ) {
    throw new Error(
      "A conversation can only be created for an accepted mentorship request."
    );
  }

  const conversationRef = doc(
    db,
    "conversations",
    mentorshipRequestId
  );

  const existing =
    await getDoc(conversationRef);

  if (existing.exists()) {
    const data = existing.data();

    if (
      data.studentId !== studentId ||
      data.alumniId !== alumniId
    ) {
      throw new Error(
        "Existing conversation participants do not match."
      );
    }

    return conversationRef.id;
  }

  await setDoc(conversationRef, {
    studentId,
    alumniId,
    mentorshipRequestId,
    createdAt: serverTimestamp(),
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
  });

  return conversationRef.id;
}


/*
 * IMPORTANT:
 *
 * Accepting mentorship and creating the conversation
 * now happen inside ONE Firestore transaction.
 *
 * Either both succeed or neither succeeds.
 */
export async function acceptMentorshipRequest(
  requestId: string
): Promise<string> {
  const requestRef = doc(
    db,
    "mentorshipRequests",
    requestId
  );

  /*
   * Deterministic:
   *
   * conversations/{requestId}
   */
  const conversationRef = doc(
    db,
    "conversations",
    requestId
  );

  await runTransaction(
    db,
    async (transaction) => {
      /*
       * Read ONLY the mentorship request here.
       *
       * A pending request does not have a conversation yet,
       * so attempting to read conversations/{requestId}
       * before creation can fail against the hardened
       * Firestore read rule.
       */
      const requestSnapshot =
        await transaction.get(requestRef);

      if (!requestSnapshot.exists()) {
        throw new Error(
          "Mentorship request not found."
        );
      }

      const requestData =
        requestSnapshot.data();

      const studentId =
        requestData.studentId;

      const alumniId =
        requestData.alumniId;

      if (
        typeof studentId !== "string" ||
        typeof alumniId !== "string"
      ) {
        throw new Error(
          "Invalid mentorship request."
        );
      }

      /*
       * Idempotent retry:
       *
       * A successful acceptance writes the request and
       * conversation atomically. Therefore, if the request
       * is already accepted, the original transaction has
       * already completed successfully.
       */
      if (
        requestData.status === "accepted"
      ) {
        return;
      }

      if (
        requestData.status !== "pending"
      ) {
        throw new Error(
          "This mentorship request is no longer pending."
        );
      }

      /*
       * Atomic operation:
       *
       * pending -> accepted
       *
       * AND
       *
       * deterministic conversation creation
       *
       * Either both writes succeed or neither does.
       */
      transaction.update(
        requestRef,
        {
          status: "accepted",
          updatedAt:
            serverTimestamp(),
        }
      );

      transaction.set(
        conversationRef,
        {
          studentId,
          alumniId,
          mentorshipRequestId:
            requestId,
          createdAt:
            serverTimestamp(),
          lastMessage: "",
          lastMessageAt:
            serverTimestamp(),
        }
      );
    }
  );

  return requestId;
}


/*
 * Compatibility helper used by existing pages.
 *
 * "accepted" routes through the secure transaction.
 * decline/cancel remain simple state transitions.
 */
export async function updateMentorshipRequest(
  requestId: string,
  status:
    | "accepted"
    | "declined"
    | "cancelled"
): Promise<void> {
  if (status === "accepted") {
    await acceptMentorshipRequest(
      requestId
    );

    return;
  }

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


export async function getConversationsForUser(
  userId: string
): Promise<Conversation[]> {
  const conversationsRef =
    collection(
      db,
      "conversations"
    );

  const studentQuery = query(
    conversationsRef,
    where(
      "studentId",
      "==",
      userId
    )
  );

  const alumniQuery = query(
    conversationsRef,
    where(
      "alumniId",
      "==",
      userId
    )
  );

  const [
    studentSnapshot,
    alumniSnapshot,
  ] = await Promise.all([
    getDocs(studentQuery),
    getDocs(alumniQuery),
  ]);

  const conversations = [
    ...studentSnapshot.docs,
    ...alumniSnapshot.docs,
  ];

  return conversations.map(
    (item) => ({
      id: item.id,
      ...item.data(),
    })
  ) as Conversation[];
}


// ============================================================
// MESSAGES
// ============================================================

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<void> {
  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error(
      "Message cannot be empty."
    );
  }

  if (cleanText.length > 2000) {
    throw new Error(
      "Message is too long."
    );
  }

  const conversationRef = doc(
    db,
    "conversations",
    conversationId
  );

  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  /*
   * Pre-generate message ID so the message and
   * conversation preview can be committed together.
   */
  const messageRef =
    doc(messagesRef);

  const batch = writeBatch(db);

  batch.set(messageRef, {
    senderId,
    text: cleanText,
    createdAt: serverTimestamp(),
  });

  batch.update(
    conversationRef,
    {
      lastMessage: cleanText,
      lastMessageAt:
        serverTimestamp(),
    }
  );

  /*
   * Atomic:
   * no message without preview update,
   * no preview update without message.
   */
  await batch.commit();
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

  const snapshot =
    await getDocs(messagesRef);

  const messages: ChatMessage[] =
    snapshot.docs.map((item) => {
      const data = item.data();

      return {
        id: item.id,
        senderId:
          data.senderId as string,
        text:
          data.text as string,
        createdAt:
          data.createdAt,
      };
    });

  return messages.sort(
    (a, b) =>
      timestampToMillis(
        a.createdAt
      ) -
      timestampToMillis(
        b.createdAt
      )
  );
}

export function subscribeToMessages(
  conversationId: string,
  callback:
    (messages: ChatMessage[]) => void
) {
  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  return onSnapshot(
    messagesRef,
    (snapshot) => {
      const messages: ChatMessage[] =
        snapshot.docs.map((item) => {
          const data = item.data();

          return {
            id: item.id,
            senderId:
              data.senderId as string,
            text:
              data.text as string,
            createdAt:
              data.createdAt,
          };
        });

      messages.sort(
        (a, b) =>
          timestampToMillis(
            a.createdAt
          ) -
          timestampToMillis(
            b.createdAt
          )
      );

      callback(messages);
    }
  );
}


// ============================================================
// ASK AN ALUMNI
// ============================================================

export type QuestionStatus =
  | "open"
  | "answered";

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
  const cleanText =
    questionText.trim();

  if (!cleanText) {
    throw new Error(
      "Question cannot be empty."
    );
  }

  if (cleanText.length > 3000) {
    throw new Error(
      "Question is too long."
    );
  }

  const questionsRef =
    collection(
      db,
      "questions"
    );

  const question =
    await addDoc(
      questionsRef,
      {
        studentId,
        studentName,
        questionText:
          cleanText,
        status: "open",
        createdAt:
          serverTimestamp(),
      }
    );

  return question.id;
}

export async function getQuestionsForStudent(
  studentId: string
): Promise<Question[]> {
  const questionsRef =
    collection(
      db,
      "questions"
    );

  const q = query(
    questionsRef,
    where(
      "studentId",
      "==",
      studentId
    )
  );

  const snapshot =
    await getDocs(q);

  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data(),
    })
  ) as Question[];
}

export async function getOpenQuestions():
  Promise<Question[]> {
  const questionsRef =
    collection(
      db,
      "questions"
    );

  const q = query(
    questionsRef,
    where(
      "status",
      "==",
      "open"
    )
  );

  const snapshot =
    await getDocs(q);

  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data(),
    })
  ) as Question[];
}

export async function answerQuestion(
  questionId: string,
  answererId: string,
  answererName: string,
  answerText: string
): Promise<void> {
  const cleanAnswer =
    answerText.trim();

  if (!cleanAnswer) {
    throw new Error(
      "Answer cannot be empty."
    );
  }

  if (
    cleanAnswer.length > 5000
  ) {
    throw new Error(
      "Answer is too long."
    );
  }

  const questionRef = doc(
    db,
    "questions",
    questionId
  );

  await updateDoc(questionRef, {
    status: "answered",
    answererId,
    answererName,
    answerText: cleanAnswer,
    answeredAt:
      serverTimestamp(),
  });
}


// ============================================================
// REPORTS
// ============================================================

export type ReportStatus =
  | "open"
  | "resolved";

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
  resolvedAt?: unknown;
};

export async function submitReport(
  conversationId: string,
  reporterId: string,
  reporterName: string,
  reportedUserId: string,
  reportedUserName: string,
  reason: string
): Promise<void> {
  const cleanReason =
    reason.trim();

  if (!cleanReason) {
    throw new Error(
      "Please describe the issue before submitting."
    );
  }

  if (
    cleanReason.length > 2000
  ) {
    throw new Error(
      "Report description is too long."
    );
  }

  if (
    reporterId ===
    reportedUserId
  ) {
    throw new Error(
      "You cannot report yourself."
    );
  }

  const reportsRef =
    collection(
      db,
      "reports"
    );

  await addDoc(
    reportsRef,
    {
      conversationId,
      reporterId,
      reporterName,
      reportedUserId,
      reportedUserName,
      reason: cleanReason,
      status: "open",
      createdAt:
        serverTimestamp(),
    }
  );
}

export async function getOpenReports():
  Promise<Report[]> {
  const reportsRef =
    collection(
      db,
      "reports"
    );

  const q = query(
    reportsRef,
    where(
      "status",
      "==",
      "open"
    )
  );

  const snapshot =
    await getDocs(q);

  return snapshot.docs.map(
    (item) => ({
      id: item.id,
      ...item.data(),
    })
  ) as Report[];
}

export async function resolveReport(
  reportId: string
): Promise<void> {
  const reportRef = doc(
    db,
    "reports",
    reportId
  );

  await updateDoc(reportRef, {
    status: "resolved",
    resolvedAt:
      serverTimestamp(),
  });
}


// ============================================================
// BLOCKING
// ============================================================

/*
 * OLD architecture:
 *
 * blocks/{randomId}
 *
 *
 * NEW architecture:
 *
 * blocks/{blockerId}/blockedUsers/{blockedId}
 *
 *
 * Benefits:
 *
 * - deterministic
 * - duplicate blocks impossible
 * - no query required
 * - Firestore Rules can directly test whether
 *   either person blocked the other
 * - no concatenated UID collision problem
 */
export async function blockUser(
  blockerId: string,
  blockedId: string
): Promise<string> {
  if (!blockerId || !blockedId) {
    throw new Error(
      "Invalid block request."
    );
  }

  if (blockerId === blockedId) {
    throw new Error(
      "You cannot block yourself."
    );
  }

  const blockRef =
    getBlockReference(
      blockerId,
      blockedId
    );

  await setDoc(blockRef, {
    blockerId,
    blockedId,
    createdAt:
      serverTimestamp(),
  });

  /*
   * Return the full Firestore path.
   * Existing UI can still treat this as an opaque string.
   */
  return blockRef.path;
}

export async function getMyBlockOfUser(
  userId: string,
  otherUserId: string
): Promise<string | null> {
  const blockRef =
    getBlockReference(
      userId,
      otherUserId
    );

  const snapshot =
    await getDoc(blockRef);

  if (!snapshot.exists()) {
    return null;
  }

  return blockRef.path;
}

export async function unblockUser(
  blockDocumentPath: string
): Promise<void> {
  /*
   * New block functions return a full path such as:
   *
   * blocks/UID_A/blockedUsers/UID_B
   *
   * The fallback also keeps this helper tolerant of an
   * old random block document ID during development.
   */
  const blockRef =
    blockDocumentPath.includes("/")
      ? doc(
          db,
          blockDocumentPath
        )
      : doc(
          db,
          "blocks",
          blockDocumentPath
        );

  await deleteDoc(blockRef);
}

export async function isBlockedEitherWay(
  userId: string,
  otherUserId: string
): Promise<boolean> {
  const firstDirection =
    getBlockReference(
      userId,
      otherUserId
    );

  const secondDirection =
    getBlockReference(
      otherUserId,
      userId
    );

  const [
    firstSnapshot,
    secondSnapshot,
  ] = await Promise.all([
    getDoc(firstDirection),
    getDoc(secondDirection),
  ]);

  return (
    firstSnapshot.exists() ||
    secondSnapshot.exists()
  );
}