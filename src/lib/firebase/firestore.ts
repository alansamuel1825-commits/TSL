import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "./client";


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

  const adminId =
    auth.currentUser?.uid;

  if (!adminId) {
    throw new Error(
      "Administrator session not available."
    );
  }

  const notificationType:
    NotificationType =
      status === "verified"
        ? "alumni_verified"
        : "alumni_rejected";

  const notificationRef =
    doc(
      collection(
        db,
        "notifications",
        uid,
        "items"
      )
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

  batch.set(
    notificationRef,
    notificationPayload(
      uid,
      adminId,
      notificationType,
      uid,
      uid
    )
  );

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
  const notificationRef =
    getNotificationReference(
      alumniId,
      `mentorship-requested-${requestRef.id}`
    );

  const batch =
    writeBatch(db);

  batch.set(requestRef, {
    studentId,
    alumniId,
    message: cleanMessage,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(
    notificationRef,
    notificationPayload(
      alumniId,
      studentId,
      "mentorship_requested",
      requestRef.id,
      requestRef.id
    )
  );

  await batch.commit();

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

      const notificationRef =
        getNotificationReference(
          studentId,
          `mentorship-accepted-${requestId}`
        );

      transaction.set(
        notificationRef,
        notificationPayload(
          studentId,
          alumniId,
          "mentorship_accepted",
          requestId,
          requestId
        )
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

  const requestSnapshot =
    await getDoc(requestRef);

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

  const recipientId =
    status === "declined"
      ? studentId
      : alumniId;

  const actorId =
    status === "declined"
      ? alumniId
      : studentId;

  const notificationType:
    NotificationType =
      status === "declined"
        ? "mentorship_declined"
        : "mentorship_cancelled";

  const notificationRef =
    getNotificationReference(
      recipientId,
      `mentorship-${status}-${requestId}`
    );

  const batch =
    writeBatch(db);

  batch.update(requestRef, {
    status,
    updatedAt:
      serverTimestamp(),
  });

  batch.set(
    notificationRef,
    notificationPayload(
      recipientId,
      actorId,
      notificationType,
      requestId,
      requestId
    )
  );

  await batch.commit();
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

  const conversationSnapshot =
    await getDoc(conversationRef);

  if (!conversationSnapshot.exists()) {
    throw new Error(
      "Conversation not found."
    );
  }

  const conversationData =
    conversationSnapshot.data();

  const studentId =
    conversationData.studentId;

  const alumniId =
    conversationData.alumniId;

  if (
    typeof studentId !== "string" ||
    typeof alumniId !== "string"
  ) {
    throw new Error(
      "Invalid conversation."
    );
  }

  let recipientId: string;

  if (senderId === studentId) {
    recipientId = alumniId;
  } else if (senderId === alumniId) {
    recipientId = studentId;
  } else {
    throw new Error(
      "You are not a participant in this conversation."
    );
  }

  /*
   * Pre-generate message ID so the message,
   * conversation preview and notification can
   * be committed together.
   */
  const messageRef =
    doc(messagesRef);

  const notificationRef =
    getNotificationReference(
      recipientId,
      `message-${messageRef.id}`
    );

  const batch =
    writeBatch(db);

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

  batch.set(
    notificationRef,
    notificationPayload(
      recipientId,
      senderId,
      "new_message",
      conversationId,
      messageRef.id
    )
  );

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

  const questionSnapshot =
    await getDoc(questionRef);

  if (!questionSnapshot.exists()) {
    throw new Error(
      "Question not found."
    );
  }

  const questionData =
    questionSnapshot.data();

  const studentId =
    questionData.studentId;

  if (
    typeof studentId !== "string"
  ) {
    throw new Error(
      "Invalid question."
    );
  }

  const notificationRef =
    getNotificationReference(
      studentId,
      `question-answered-${questionId}`
    );

  const batch =
    writeBatch(db);

  batch.update(questionRef, {
    status: "answered",
    answererId,
    answererName,
    answerText: cleanAnswer,
    answeredAt:
      serverTimestamp(),
  });

  batch.set(
    notificationRef,
    notificationPayload(
      studentId,
      answererId,
      "question_answered",
      questionId,
      questionId
    )
  );

  await batch.commit();
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




// ============================================================
// COMMUNITY HUB
// Resources, opportunities and events
// ============================================================

export const COMMUNITY_CONTENT_KINDS = [
  "resource",
  "opportunity",
  "event",
] as const;

export type CommunityContentKind =
  (typeof COMMUNITY_CONTENT_KINDS)[number];

export type CommunityContentStatus =
  | "draft"
  | "published";

export interface CommunityContentInput {
  kind: CommunityContentKind;
  title: string;
  summary: string;
  details: string;
  category: string;
  organization: string;
  location: string;
  eventMode:
    | ""
    | "in_person"
    | "online"
    | "hybrid";
  startAt: string;
  endAt: string;
  deadline: string;
  eligibility: string;
  url: string;
  status: CommunityContentStatus;
}

export interface CommunityContentItem {
  id: string;
  kind: CommunityContentKind;
  title: string;
  summary: string;
  details: string;
  category: string;
  organization: string;
  location: string;
  eventMode:
    | ""
    | "in_person"
    | "online"
    | "hybrid";
  startAt?: unknown | null;
  endAt?: unknown | null;
  deadline?: unknown | null;
  eligibility: string;
  url: string;
  status: CommunityContentStatus;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function cleanCommunityString(
  value: string,
  maxLength: number,
  label: string,
  required = false
): string {
  const clean =
    value.trim();

  if (
    required &&
    !clean
  ) {
    throw new Error(
      `${label} is required.`
    );
  }

  if (
    clean.length >
    maxLength
  ) {
    throw new Error(
      `${label} is too long.`
    );
  }

  return clean;
}

function cleanCommunityHttpsUrl(
  value: string,
  required: boolean
): string {
  const clean =
    value.trim();

  if (
    required &&
    !clean
  ) {
    throw new Error(
      "A source or registration link is required."
    );
  }

  if (!clean) {
    return "";
  }

  let parsed: URL;

  try {
    parsed =
      new URL(clean);
  } catch {
    throw new Error(
      "The link must be a valid HTTPS URL."
    );
  }

  if (
    parsed.protocol !==
    "https:"
  ) {
    throw new Error(
      "The link must start with https://"
    );
  }

  if (
    clean.length >
    2048
  ) {
    throw new Error(
      "The link is too long."
    );
  }

  return parsed.toString();
}

function parseDateTimeInput(
  value: string
): Timestamp | null {
  if (!value.trim()) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      "One of the dates or times is invalid."
    );
  }

  return Timestamp.fromDate(
    date
  );
}

function normalizeCommunityContentInput(
  input: CommunityContentInput
) {
  const title =
    cleanCommunityString(
      input.title,
      140,
      "Title",
      true
    );

  const summary =
    cleanCommunityString(
      input.summary,
      350,
      "Summary",
      true
    );

  const details =
    cleanCommunityString(
      input.details,
      4000,
      "Details"
    );

  const category =
    cleanCommunityString(
      input.category,
      80,
      "Category"
    );

  const organization =
    cleanCommunityString(
      input.organization,
      120,
      "Organization"
    );

  const location =
    cleanCommunityString(
      input.location,
      160,
      "Location"
    );

  const eligibility =
    cleanCommunityString(
      input.eligibility,
      700,
      "Eligibility"
    );

  const requiresUrl =
    input.kind !==
    "event";

  const url =
    cleanCommunityHttpsUrl(
      input.url,
      requiresUrl
    );

  const startAt =
    parseDateTimeInput(
      input.startAt
    );

  const endAt =
    parseDateTimeInput(
      input.endAt
    );

  const deadline =
    parseDateTimeInput(
      input.deadline
    );

  if (
    input.kind === "event" &&
    !startAt
  ) {
    throw new Error(
      "Events need a start date and time."
    );
  }

  if (
    startAt &&
    endAt &&
    endAt.toMillis() <
      startAt.toMillis()
  ) {
    throw new Error(
      "Event end time cannot be before its start time."
    );
  }

  if (
    input.kind !== "event" &&
    input.eventMode
  ) {
    throw new Error(
      "Event format can only be set for events."
    );
  }

  return {
    kind:
      input.kind,
    title,
    summary,
    details,
    category,
    organization,
    location,
    eventMode:
      input.kind === "event"
        ? input.eventMode
        : "",
    startAt:
      input.kind === "event"
        ? startAt
        : null,
    endAt:
      input.kind === "event"
        ? endAt
        : null,
    deadline:
      input.kind === "opportunity"
        ? deadline
        : null,
    eligibility:
      input.kind === "opportunity"
        ? eligibility
        : "",
    url,
    status:
      input.status,
  };
}

export async function getPublishedCommunityContent():
  Promise<CommunityContentItem[]> {
  const reference =
    collection(
      db,
      "communityContent"
    );

  const q =
    query(
      reference,
      where(
        "status",
        "==",
        "published"
      ),
      limit(150)
    );

  const snapshot =
    await getDocs(q);

  const items =
    snapshot.docs.map(
      (item) => ({
        id:
          item.id,
        ...item.data(),
      })
    ) as CommunityContentItem[];

  return items.sort(
    (a, b) =>
      timestampToMillis(
        b.updatedAt
      ) -
      timestampToMillis(
        a.updatedAt
      )
  );
}

export async function getCommunityContentForAdmin():
  Promise<CommunityContentItem[]> {
  const reference =
    collection(
      db,
      "communityContent"
    );

  const snapshot =
    await getDocs(
      query(
        reference,
        limit(200)
      )
    );

  const items =
    snapshot.docs.map(
      (item) => ({
        id:
          item.id,
        ...item.data(),
      })
    ) as CommunityContentItem[];

  return items.sort(
    (a, b) =>
      timestampToMillis(
        b.updatedAt
      ) -
      timestampToMillis(
        a.updatedAt
      )
  );
}

export async function createCommunityContent(
  input: CommunityContentInput
): Promise<string> {
  const user =
    auth.currentUser;

  if (!user) {
    throw new Error(
      "Administrator session not available."
    );
  }

  const clean =
    normalizeCommunityContentInput(
      input
    );

  const reference =
    doc(
      collection(
        db,
        "communityContent"
      )
    );

  await setDoc(
    reference,
    {
      ...clean,
      createdBy:
        user.uid,
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp(),
    }
  );

  return reference.id;
}

export async function updateCommunityContent(
  itemId: string,
  input: CommunityContentInput
): Promise<void> {
  const clean =
    normalizeCommunityContentInput(
      input
    );

  const reference =
    doc(
      db,
      "communityContent",
      itemId
    );

  await updateDoc(
    reference,
    {
      ...clean,
      updatedAt:
        serverTimestamp(),
    }
  );
}

export async function deleteCommunityContent(
  itemId: string
): Promise<void> {
  await deleteDoc(
    doc(
      db,
      "communityContent",
      itemId
    )
  );
}

export async function getSavedCommunityContentIds(
  userId: string
): Promise<Set<string>> {
  const reference =
    collection(
      db,
      "savedContent",
      userId,
      "items"
    );

  const snapshot =
    await getDocs(
      query(
        reference,
        limit(200)
      )
    );

  return new Set(
    snapshot.docs.map(
      (item) =>
        item.id
    )
  );
}

export async function saveCommunityContent(
  userId: string,
  contentId: string
): Promise<void> {
  if (
    auth.currentUser?.uid !==
    userId
  ) {
    throw new Error(
      "Your session does not match this account."
    );
  }

  await setDoc(
    doc(
      db,
      "savedContent",
      userId,
      "items",
      contentId
    ),
    {
      uid:
        userId,
      contentId,
      createdAt:
        serverTimestamp(),
    }
  );
}

export async function unsaveCommunityContent(
  userId: string,
  contentId: string
): Promise<void> {
  if (
    auth.currentUser?.uid !==
    userId
  ) {
    throw new Error(
      "Your session does not match this account."
    );
  }

  await deleteDoc(
    doc(
      db,
      "savedContent",
      userId,
      "items",
      contentId
    )
  );
}


// ============================================================
// ADMIN INSIGHTS / PRIVACY-PRESERVING PRODUCT METRICS
// ============================================================

export type AdminPlatformMetrics = {
  users: {
    total: number;
    active: number;
    students: number;
    alumni: number;
  };
  alumni: {
    verified: number;
    pending: number;
  };
  mentorship: {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    cancelled: number;
  };
  conversations: number;
  questions: {
    total: number;
    open: number;
    answered: number;
  };
  reports: {
    open: number;
  };
  projects: {
    published: number;
  };
  hub: {
    publishedTotal: number;
    resources: number;
    opportunities: number;
    events: number;
  };
};

async function countCollection(
  collectionName: string
): Promise<number> {
  const snapshot =
    await getCountFromServer(
      collection(
        db,
        collectionName
      )
    );

  return snapshot.data().count;
}

async function countWhere(
  collectionName: string,
  field: string,
  value: string
): Promise<number> {
  const snapshot =
    await getCountFromServer(
      query(
        collection(
          db,
          collectionName
        ),
        where(
          field,
          "==",
          value
        )
      )
    );

  return snapshot.data().count;
}

/*
 * This dashboard intentionally derives counts from the
 * existing product collections instead of adding user-level
 * tracking events.
 *
 * Benefits:
 * - no clickstream collection
 * - no message/search content captured
 * - no location or device fingerprinting
 * - no extra per-user analytics profile
 *
 * These are operational/product totals only. They are useful
 * for school governance and health checks, not surveillance.
 */
export async function getAdminPlatformMetrics():
  Promise<AdminPlatformMetrics> {
  const [
    totalUsers,
    activeUsers,
    students,
    alumni,
    verifiedAlumni,
    pendingAlumni,

    totalMentorship,
    pendingMentorship,
    acceptedMentorship,
    declinedMentorship,
    cancelledMentorship,

    conversations,

    totalQuestions,
    openQuestions,
    answeredQuestions,

    openReports,

    publishedProjects,

    publishedHubTotal,
    resources,
    opportunities,
    events,
  ] =
    await Promise.all([
      countCollection(
        "users"
      ),
      countWhere(
        "users",
        "status",
        "active"
      ),
      countWhere(
        "users",
        "role",
        "student"
      ),
      countWhere(
        "users",
        "role",
        "alumni"
      ),
      countWhere(
        "alumniProfiles",
        "verificationStatus",
        "verified"
      ),
      countWhere(
        "alumniProfiles",
        "verificationStatus",
        "pending"
      ),

      countCollection(
        "mentorshipRequests"
      ),
      countWhere(
        "mentorshipRequests",
        "status",
        "pending"
      ),
      countWhere(
        "mentorshipRequests",
        "status",
        "accepted"
      ),
      countWhere(
        "mentorshipRequests",
        "status",
        "declined"
      ),
      countWhere(
        "mentorshipRequests",
        "status",
        "cancelled"
      ),

      countCollection(
        "conversations"
      ),

      countCollection(
        "questions"
      ),
      countWhere(
        "questions",
        "status",
        "open"
      ),
      countWhere(
        "questions",
        "status",
        "answered"
      ),

      countWhere(
        "reports",
        "status",
        "open"
      ),

      countWhere(
        "projects",
        "status",
        "published"
      ),

      countWhere(
        "communityContent",
        "status",
        "published"
      ),
      getCountFromServer(
        query(
          collection(
            db,
            "communityContent"
          ),
          where(
            "status",
            "==",
            "published"
          ),
          where(
            "kind",
            "==",
            "resource"
          )
        )
      ).then(
        (snapshot) =>
          snapshot.data().count
      ),
      getCountFromServer(
        query(
          collection(
            db,
            "communityContent"
          ),
          where(
            "status",
            "==",
            "published"
          ),
          where(
            "kind",
            "==",
            "opportunity"
          )
        )
      ).then(
        (snapshot) =>
          snapshot.data().count
      ),
      getCountFromServer(
        query(
          collection(
            db,
            "communityContent"
          ),
          where(
            "status",
            "==",
            "published"
          ),
          where(
            "kind",
            "==",
            "event"
          )
        )
      ).then(
        (snapshot) =>
          snapshot.data().count
      ),
    ]);

  return {
    users: {
      total:
        totalUsers,
      active:
        activeUsers,
      students,
      alumni,
    },

    alumni: {
      verified:
        verifiedAlumni,
      pending:
        pendingAlumni,
    },

    mentorship: {
      total:
        totalMentorship,
      pending:
        pendingMentorship,
      accepted:
        acceptedMentorship,
      declined:
        declinedMentorship,
      cancelled:
        cancelledMentorship,
    },

    conversations,

    questions: {
      total:
        totalQuestions,
      open:
        openQuestions,
      answered:
        answeredQuestions,
    },

    reports: {
      open:
        openReports,
    },

    projects: {
      published:
        publishedProjects,
    },

    hub: {
      publishedTotal:
        publishedHubTotal,
      resources,
      opportunities,
      events,
    },
  };
}

// ============================================================
// PROJECTS / PORTFOLIO
// ============================================================

export const PROJECT_CATEGORIES = [
  "Engineering",
  "Software",
  "AI & Data",
  "Science & Research",
  "Design",
  "Entrepreneurship",
  "Social Impact",
  "Other",
] as const;

export type ProjectCategory =
  (typeof PROJECT_CATEGORIES)[number];

export type ProjectStatus =
  | "draft"
  | "published";

export interface ProjectInput {
  title: string;
  category: ProjectCategory;
  summary: string;
  description: string;
  role: string;
  outcome: string;
  technologies: string[];
  projectUrl: string;
  repositoryUrl: string;
  collaborationWanted: boolean;
  mentorshipWanted: boolean;
  status: ProjectStatus;
}

export interface Project
  extends ProjectInput {
  id: string;
  ownerId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function normalizeOptionalHttpsUrl(
  value: string,
  label: string
): string {
  const clean =
    value.trim();

  if (!clean) {
    return "";
  }

  let parsed: URL;

  try {
    parsed =
      new URL(clean);
  } catch {
    throw new Error(
      `${label} must be a valid HTTPS URL.`
    );
  }

  if (
    parsed.protocol !==
    "https:"
  ) {
    throw new Error(
      `${label} must start with https://`
    );
  }

  if (
    clean.length > 2048
  ) {
    throw new Error(
      `${label} is too long.`
    );
  }

  return parsed.toString();
}

function normalizeProjectInput(
  input: ProjectInput
): ProjectInput {
  const title =
    input.title.trim();

  const summary =
    input.summary.trim();

  const description =
    input.description.trim();

  const role =
    input.role.trim();

  const outcome =
    input.outcome.trim();

  if (
    !title ||
    title.length > 120
  ) {
    throw new Error(
      "Project title must be between 1 and 120 characters."
    );
  }

  if (
    !PROJECT_CATEGORIES.includes(
      input.category
    )
  ) {
    throw new Error(
      "Choose a valid project category."
    );
  }

  if (
    summary.length > 300
  ) {
    throw new Error(
      "Project summary must be 300 characters or fewer."
    );
  }

  if (
    description.length > 5000
  ) {
    throw new Error(
      "Project description must be 5,000 characters or fewer."
    );
  }

  if (
    role.length > 120
  ) {
    throw new Error(
      "Project role must be 120 characters or fewer."
    );
  }

  if (
    outcome.length > 600
  ) {
    throw new Error(
      "Project outcome must be 600 characters or fewer."
    );
  }

  if (
    input.status === "published" &&
    (
      !summary ||
      !description
    )
  ) {
    throw new Error(
      "Published projects need both a summary and a description."
    );
  }

  const technologies =
    Array.from(
      new Set(
        input.technologies
          .map((item) =>
            item.trim()
          )
          .filter(Boolean)
      )
    );

  if (
    technologies.length > 20
  ) {
    throw new Error(
      "Add no more than 20 technologies or skills."
    );
  }

  if (
    technologies.some(
      (item) =>
        item.length > 50
    )
  ) {
    throw new Error(
      "Each technology or skill must be 50 characters or fewer."
    );
  }

  return {
    title,
    category:
      input.category,
    summary,
    description,
    role,
    outcome,
    technologies,
    projectUrl:
      normalizeOptionalHttpsUrl(
        input.projectUrl,
        "Project link"
      ),
    repositoryUrl:
      normalizeOptionalHttpsUrl(
        input.repositoryUrl,
        "Repository link"
      ),
    collaborationWanted:
      input.collaborationWanted,
    mentorshipWanted:
      input.mentorshipWanted,
    status:
      input.status,
  };
}

export async function createProject(
  ownerId: string,
  input: ProjectInput
): Promise<string> {
  if (
    auth.currentUser?.uid !==
    ownerId
  ) {
    throw new Error(
      "Your session does not match the project owner."
    );
  }

  const clean =
    normalizeProjectInput(
      input
    );

  const reference =
    doc(
      collection(
        db,
        "projects"
      )
    );

  await setDoc(
    reference,
    {
      ownerId,
      ...clean,
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp(),
    }
  );

  return reference.id;
}

export async function updateProject(
  projectId: string,
  ownerId: string,
  input: ProjectInput
): Promise<void> {
  if (
    auth.currentUser?.uid !==
    ownerId
  ) {
    throw new Error(
      "Your session does not match the project owner."
    );
  }

  const reference =
    doc(
      db,
      "projects",
      projectId
    );

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    throw new Error(
      "Project not found."
    );
  }

  const current =
    snapshot.data();

  if (
    current.ownerId !==
    ownerId
  ) {
    throw new Error(
      "You can edit only your own projects."
    );
  }

  const clean =
    normalizeProjectInput(
      input
    );

  await updateDoc(
    reference,
    {
      ...clean,
      updatedAt:
        serverTimestamp(),
    }
  );
}

export async function deleteProject(
  projectId: string,
  ownerId: string
): Promise<void> {
  const reference =
    doc(
      db,
      "projects",
      projectId
    );

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    return;
  }

  const current =
    snapshot.data();

  if (
    current.ownerId !==
      ownerId ||
    auth.currentUser?.uid !==
      ownerId
  ) {
    throw new Error(
      "You can delete only your own projects."
    );
  }

  await deleteDoc(reference);
}

export async function getProject(
  projectId: string
): Promise<Project | null> {
  const reference =
    doc(
      db,
      "projects",
      projectId
    );

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Project;
}

export async function getPublishedProjects():
  Promise<Project[]> {
  const reference =
    collection(
      db,
      "projects"
    );

  const q =
    query(
      reference,
      where(
        "status",
        "==",
        "published"
      ),
      limit(100)
    );

  const snapshot =
    await getDocs(q);

  const projects =
    snapshot.docs.map(
      (item) => ({
        id: item.id,
        ...item.data(),
      })
    ) as Project[];

  return projects.sort(
    (a, b) =>
      timestampToMillis(
        b.updatedAt
      ) -
      timestampToMillis(
        a.updatedAt
      )
  );
}

export async function getMyProjects(
  ownerId: string
): Promise<Project[]> {
  const reference =
    collection(
      db,
      "projects"
    );

  const q =
    query(
      reference,
      where(
        "ownerId",
        "==",
        ownerId
      ),
      limit(100)
    );

  const snapshot =
    await getDocs(q);

  const projects =
    snapshot.docs.map(
      (item) => ({
        id: item.id,
        ...item.data(),
      })
    ) as Project[];

  return projects.sort(
    (a, b) =>
      timestampToMillis(
        b.updatedAt
      ) -
      timestampToMillis(
        a.updatedAt
      )
  );
}


// ============================================================
// NOTIFICATION PREFERENCES + HUB REMINDERS (PRIVATE)
// ============================================================

export type ReminderLeadHours =
  | 12
  | 24
  | 48
  | 72;

export interface NotificationPreferenceValues {
  mentorshipAlerts: boolean;
  messageAlerts: boolean;
  qnaAlerts: boolean;
  hubReminders: boolean;
  reminderLeadHours: ReminderLeadHours;
  timezone: string;
}

export interface NotificationPreferences
  extends NotificationPreferenceValues {
  uid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const DEFAULT_NOTIFICATION_PREFERENCES:
  NotificationPreferenceValues = {
  mentorshipAlerts: true,
  messageAlerts: true,
  qnaAlerts: true,
  hubReminders: true,
  reminderLeadHours: 24,
  timezone: "UTC",
};

function notificationPreferencesWithDefaults(
  data:
    Partial<NotificationPreferences> | null
): NotificationPreferenceValues {
  return {
    mentorshipAlerts:
      data?.mentorshipAlerts ??
      DEFAULT_NOTIFICATION_PREFERENCES
        .mentorshipAlerts,

    messageAlerts:
      data?.messageAlerts ??
      DEFAULT_NOTIFICATION_PREFERENCES
        .messageAlerts,

    qnaAlerts:
      data?.qnaAlerts ??
      DEFAULT_NOTIFICATION_PREFERENCES
        .qnaAlerts,

    hubReminders:
      data?.hubReminders ??
      DEFAULT_NOTIFICATION_PREFERENCES
        .hubReminders,

    reminderLeadHours:
      data?.reminderLeadHours === 12 ||
      data?.reminderLeadHours === 24 ||
      data?.reminderLeadHours === 48 ||
      data?.reminderLeadHours === 72
        ? data.reminderLeadHours
        : DEFAULT_NOTIFICATION_PREFERENCES
            .reminderLeadHours,

    timezone:
      typeof data?.timezone === "string" &&
      data.timezone.trim().length > 0
        ? data.timezone
        : DEFAULT_NOTIFICATION_PREFERENCES
            .timezone,
  };
}

export async function getNotificationPreferences(
  uid: string
): Promise<NotificationPreferenceValues> {
  const reference =
    doc(
      db,
      "notificationPreferences",
      uid
    );

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    };
  }

  return notificationPreferencesWithDefaults(
    snapshot.data() as
      Partial<NotificationPreferences>
  );
}

export async function saveNotificationPreferences(
  uid: string,
  values: NotificationPreferenceValues
): Promise<void> {
  if (
    auth.currentUser?.uid !==
    uid
  ) {
    throw new Error(
      "Your session does not match these notification preferences."
    );
  }

  if (
    ![12, 24, 48, 72].includes(
      values.reminderLeadHours
    )
  ) {
    throw new Error(
      "Choose a supported reminder time."
    );
  }

  const timezone =
    values.timezone.trim();

  if (
    !timezone ||
    timezone.length > 80
  ) {
    throw new Error(
      "Invalid timezone."
    );
  }

  const reference =
    doc(
      db,
      "notificationPreferences",
      uid
    );

  const snapshot =
    await getDoc(reference);

  const payload = {
    mentorshipAlerts:
      values.mentorshipAlerts,
    messageAlerts:
      values.messageAlerts,
    qnaAlerts:
      values.qnaAlerts,
    hubReminders:
      values.hubReminders,
    reminderLeadHours:
      values.reminderLeadHours,
    timezone,
    updatedAt:
      serverTimestamp(),
  };

  if (!snapshot.exists()) {
    await setDoc(
      reference,
      {
        uid,
        ...payload,
        createdAt:
          serverTimestamp(),
      }
    );

    return;
  }

  await updateDoc(
    reference,
    payload
  );
}

export function subscribeToNotificationPreferences(
  uid: string,
  callback: (
    preferences:
      NotificationPreferenceValues
  ) => void
) {
  const reference =
    doc(
      db,
      "notificationPreferences",
      uid
    );

  return onSnapshot(
    reference,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
        });

        return;
      }

      callback(
        notificationPreferencesWithDefaults(
          snapshot.data() as
            Partial<NotificationPreferences>
        )
      );
    }
  );
}

export type ContentReminderKind =
  | "event"
  | "opportunity";

export interface ContentReminder {
  id: string;
  uid: string;
  contentId: string;
  kind: ContentReminderKind;
  remindAt: unknown;
  targetAt: unknown;
  deliveredAt?: unknown | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function getReminderReference(
  uid: string,
  contentId: string
) {
  return doc(
    db,
    "contentReminders",
    uid,
    "items",
    contentId
  );
}

function getReminderNotificationReference(
  uid: string,
  contentId: string
) {
  return doc(
    db,
    "notifications",
    uid,
    "items",
    `hub-reminder-${contentId}`
  );
}

function reminderTargetMillis(
  item: CommunityContentItem
): number {
  if (
    item.kind === "event"
  ) {
    return timestampToMillis(
      item.startAt
    );
  }

  if (
    item.kind === "opportunity"
  ) {
    return timestampToMillis(
      item.deadline
    );
  }

  return 0;
}

export async function getContentReminders(
  uid: string
): Promise<ContentReminder[]> {
  const reference =
    collection(
      db,
      "contentReminders",
      uid,
      "items"
    );

  const snapshot =
    await getDocs(
      query(
        reference,
        limit(100)
      )
    );

  const reminders =
    snapshot.docs.map(
      (item) => ({
        id:
          item.id,
        ...item.data(),
      })
    ) as ContentReminder[];

  return reminders.sort(
    (a, b) =>
      timestampToMillis(
        a.targetAt
      ) -
      timestampToMillis(
        b.targetAt
      )
  );
}

export async function getContentReminderIds(
  uid: string
): Promise<Set<string>> {
  const reminders =
    await getContentReminders(
      uid
    );

  return new Set(
    reminders.map(
      (item) =>
        item.contentId
    )
  );
}

export async function scheduleContentReminder(
  uid: string,
  item: CommunityContentItem,
  leadHours: ReminderLeadHours
): Promise<void> {
  if (
    auth.currentUser?.uid !==
    uid
  ) {
    throw new Error(
      "Your session does not match this reminder."
    );
  }

  if (
    item.kind !== "event" &&
    item.kind !== "opportunity"
  ) {
    throw new Error(
      "Only events and opportunities can have reminders."
    );
  }

  const targetMillis =
    reminderTargetMillis(
      item
    );

  if (
    !targetMillis
  ) {
    throw new Error(
      "This item does not have a reminder date yet."
    );
  }

  if (
    targetMillis <=
    Date.now()
  ) {
    throw new Error(
      "This date has already passed."
    );
  }

  const reminderMillis =
    Math.max(
      Date.now(),
      targetMillis -
        leadHours *
          60 *
          60 *
          1000
    );

  const reminderRef =
    getReminderReference(
      uid,
      item.id
    );

  const notificationRef =
    getReminderNotificationReference(
      uid,
      item.id
    );

  const reminderSnapshot =
    await getDoc(
      reminderRef
    );

  const notificationSnapshot =
    await getDoc(
      notificationRef
    );

  const batch =
    writeBatch(db);

  if (
    notificationSnapshot.exists()
  ) {
    batch.delete(
      notificationRef
    );
  }

  const payload = {
    uid,
    contentId:
      item.id,
    kind:
      item.kind,
    remindAt:
      Timestamp.fromMillis(
        reminderMillis
      ),
    targetAt:
      Timestamp.fromMillis(
        targetMillis
      ),
    deliveredAt:
      null,
    updatedAt:
      serverTimestamp(),
  };

  if (
    reminderSnapshot.exists()
  ) {
    batch.update(
      reminderRef,
      payload
    );
  } else {
    batch.set(
      reminderRef,
      {
        ...payload,
        createdAt:
          serverTimestamp(),
      }
    );
  }

  await batch.commit();
}

export async function cancelContentReminder(
  uid: string,
  contentId: string
): Promise<void> {
  if (
    auth.currentUser?.uid !==
    uid
  ) {
    throw new Error(
      "Your session does not match this reminder."
    );
  }

  const reminderRef =
    getReminderReference(
      uid,
      contentId
    );

  const notificationRef =
    getReminderNotificationReference(
      uid,
      contentId
    );

  const [
    reminderSnapshot,
    notificationSnapshot,
  ] =
    await Promise.all([
      getDoc(
        reminderRef
      ),
      getDoc(
        notificationRef
      ),
    ]);

  if (
    !reminderSnapshot.exists() &&
    !notificationSnapshot.exists()
  ) {
    return;
  }

  const batch =
    writeBatch(db);

  if (
    reminderSnapshot.exists()
  ) {
    batch.delete(
      reminderRef
    );
  }

  if (
    notificationSnapshot.exists()
  ) {
    batch.delete(
      notificationRef
    );
  }

  await batch.commit();
}

/*
 * In-app reminder bridge:
 *
 * When the app is open, returns online, or is reopened,
 * due reminders are converted into normal private in-app
 * notifications.
 *
 * This is deliberately NOT described as background push.
 * Reliable closed-app push requires a trusted server-side
 * scheduler + FCM, which we will add only when that backend
 * is approved/configured.
 */
export async function materializeDueContentReminders(
  uid: string
): Promise<number> {
  if (
    auth.currentUser?.uid !==
    uid
  ) {
    return 0;
  }

  const preferences =
    await getNotificationPreferences(
      uid
    );

  if (
    !preferences.hubReminders
  ) {
    return 0;
  }

  const reminderRef =
    collection(
      db,
      "contentReminders",
      uid,
      "items"
    );

  const snapshot =
    await getDocs(
      query(
        reminderRef,
        where(
          "deliveredAt",
          "==",
          null
        ),
        limit(100)
      )
    );

  const now =
    Date.now();

  const due =
    snapshot.docs.filter(
      (item) => {
        const data =
          item.data();

        const remindMillis =
          timestampToMillis(
            data.remindAt
          );

        return (
          remindMillis > 0 &&
          remindMillis <= now
        );
      }
    );

  for (
    const item of due
  ) {
    const data =
      item.data();

    const contentId =
      typeof data.contentId ===
      "string"
        ? data.contentId
        : "";

    if (!contentId) {
      continue;
    }

    const batch =
      writeBatch(db);

    batch.set(
      getReminderNotificationReference(
        uid,
        contentId
      ),
      notificationPayload(
        uid,
        uid,
        "hub_reminder",
        contentId,
        contentId
      )
    );

    batch.update(
      item.ref,
      {
        deliveredAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      }
    );

    await batch.commit();
  }

  return due.length;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export type NotificationType =
  | "mentorship_requested"
  | "mentorship_accepted"
  | "mentorship_declined"
  | "mentorship_cancelled"
  | "new_message"
  | "question_answered"
  | "hub_reminder"
  | "alumni_verified"
  | "alumni_rejected";

export type AppNotification = {
  id: string;
  recipientId: string;
  actorId: string;
  type: NotificationType;
  entityId: string;
  eventId: string;
  createdAt?: unknown;
  readAt?: unknown | null;
};

function getNotificationReference(
  recipientId: string,
  notificationId: string
) {
  return doc(
    db,
    "notifications",
    recipientId,
    "items",
    notificationId
  );
}

function notificationPayload(
  recipientId: string,
  actorId: string,
  type: NotificationType,
  entityId: string,
  eventId: string
) {
  return {
    recipientId,
    actorId,
    type,
    entityId,
    eventId,
    createdAt: serverTimestamp(),
    readAt: null,
  };
}

function notificationTypeEnabled(
  type: NotificationType,
  preferences:
    NotificationPreferenceValues
): boolean {
  switch (type) {
    case "mentorship_requested":
    case "mentorship_accepted":
    case "mentorship_declined":
    case "mentorship_cancelled":
      return preferences
        .mentorshipAlerts;

    case "new_message":
      return preferences
        .messageAlerts;

    case "question_answered":
      return preferences
        .qnaAlerts;

    case "hub_reminder":
      return preferences
        .hubReminders;

    case "alumni_verified":
    case "alumni_rejected":
      /*
       * School verification/account-state notices remain
       * visible because they affect account capabilities.
       */
      return true;
  }
}

export function subscribeToNotifications(
  userId: string,
  callback: (
    notifications: AppNotification[]
  ) => void
) {
  const notificationsRef =
    collection(
      db,
      "notifications",
      userId,
      "items"
    );

  const notificationsQuery =
    query(
      notificationsRef,
      orderBy(
        "createdAt",
        "desc"
      ),
      limit(50)
    );

  let currentNotifications:
    AppNotification[] = [];

  let currentPreferences:
    NotificationPreferenceValues = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    };

  const emit =
    () => {
      callback(
        currentNotifications.filter(
          (item) =>
            notificationTypeEnabled(
              item.type,
              currentPreferences
            )
        )
      );
    };

  const unsubscribeNotifications =
    onSnapshot(
      notificationsQuery,
      (snapshot) => {
        currentNotifications =
          snapshot.docs.map(
            (item) => ({
              id:
                item.id,
              ...item.data(),
            })
          ) as AppNotification[];

        emit();
      }
    );

  const unsubscribePreferences =
    subscribeToNotificationPreferences(
      userId,
      (preferences) => {
        currentPreferences =
          preferences;

        emit();
      }
    );

  return () => {
    unsubscribeNotifications();
    unsubscribePreferences();
  };
}

export function subscribeToUnreadNotificationCount(
  userId: string,
  callback: (count: number) => void
) {
  const notificationsRef =
    collection(
      db,
      "notifications",
      userId,
      "items"
    );

  const unreadQuery =
    query(
      notificationsRef,
      where(
        "readAt",
        "==",
        null
      ),
      limit(100)
    );

  let unreadNotifications:
    AppNotification[] = [];

  let currentPreferences:
    NotificationPreferenceValues = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    };

  const emit =
    () => {
      callback(
        unreadNotifications.filter(
          (item) =>
            notificationTypeEnabled(
              item.type,
              currentPreferences
            )
        ).length
      );
    };

  const unsubscribeNotifications =
    onSnapshot(
      unreadQuery,
      (snapshot) => {
        unreadNotifications =
          snapshot.docs.map(
            (item) => ({
              id:
                item.id,
              ...item.data(),
            })
          ) as AppNotification[];

        emit();
      }
    );

  const unsubscribePreferences =
    subscribeToNotificationPreferences(
      userId,
      (preferences) => {
        currentPreferences =
          preferences;

        emit();
      }
    );

  return () => {
    unsubscribeNotifications();
    unsubscribePreferences();
  };
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<void> {
  const reference =
    getNotificationReference(
      userId,
      notificationId
    );

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    return;
  }

  const data =
    snapshot.data() as AppNotification;

  if (data.readAt) {
    return;
  }

  await updateDoc(reference, {
    readAt: serverTimestamp(),
  });
}

export async function markAllNotificationsRead(
  userId: string
): Promise<void> {
  const notificationsRef = collection(
    db,
    "notifications",
    userId,
    "items"
  );

  const unreadQuery = query(
    notificationsRef,
    where("readAt", "==", null),
    limit(100)
  );

  const snapshot =
    await getDocs(unreadQuery);

  if (snapshot.empty) {
    return;
  }

  const batch =
    writeBatch(db);

  snapshot.docs.forEach((item) => {
    batch.update(item.ref, {
      readAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

// ============================================================
// USER PREFERENCES (PRIVATE)
// ============================================================

export type ThemePreference =
  | "system"
  | "light"
  | "dark";

export type TextSizePreference =
  | "default"
  | "large";

export interface UserPreferenceValues {
  theme: ThemePreference;
  textSize: TextSizePreference;
  highContrast: boolean;
  reduceMotion: boolean;
}

export interface UserPreferences
  extends UserPreferenceValues {
  uid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export const DEFAULT_USER_PREFERENCES:
  UserPreferenceValues = {
  theme: "system",
  textSize: "default",
  highContrast: false,
  reduceMotion: false,
};

export async function getUserPreferences(
  uid: string
): Promise<UserPreferences | null> {
  const reference = doc(
    db,
    "userPreferences",
    uid
  );

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserPreferences;
}

export async function saveUserPreferences(
  uid: string,
  values: UserPreferenceValues
): Promise<void> {
  const reference = doc(
    db,
    "userPreferences",
    uid
  );

  const snapshot =
    await getDoc(reference);

  const payload = {
    theme: values.theme,
    textSize: values.textSize,
    highContrast:
      values.highContrast,
    reduceMotion:
      values.reduceMotion,
    updatedAt:
      serverTimestamp(),
  };

  if (!snapshot.exists()) {
    await setDoc(reference, {
      uid,
      ...payload,
      createdAt:
        serverTimestamp(),
    });

    return;
  }

  await updateDoc(
    reference,
    payload
  );
}

