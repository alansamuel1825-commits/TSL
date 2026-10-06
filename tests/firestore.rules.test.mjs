import fs from "node:fs";

import {
  after,
  beforeEach,
  test,
} from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";

import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";


const PROJECT_ID =
  "demo-tsl-alumni-rules-tests";

const testEnv =
  await initializeTestEnvironment({
    projectId: PROJECT_ID,

    firestore: {
      host: "127.0.0.1",
      port: 8080,

      rules: fs.readFileSync(
        "firestore.rules",
        "utf8",
      ),
    },
  });


after(async () => {
  await testEnv.cleanup();
});


beforeEach(async () => {
  await testEnv.clearFirestore();
});


// ============================================================
// AUTH CONTEXT HELPERS
// ============================================================

function verifiedDb(
  uid,
  email = `${uid}@example.com`,
) {
  return testEnv
    .authenticatedContext(
      uid,
      {
        email,
        email_verified: true,
      },
    )
    .firestore();
}

function unverifiedDb(
  uid,
  email = `${uid}@example.com`,
) {
  return testEnv
    .authenticatedContext(
      uid,
      {
        email,
        email_verified: false,
      },
    )
    .firestore();
}


// ============================================================
// TEST DATA HELPERS
// ============================================================

async function seedUser(
  uid,
  {
    role = "student",
    status = "active",
    isAdmin = false,
    displayName = uid,
  } = {},
) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      const db =
        context.firestore();

      await setDoc(
        doc(db, "users", uid),
        {
          uid,
          email:
            `${uid}@example.com`,
          displayName,
          role,
          status,
          photoURL: null,
          isAdmin,
        },
      );

      await setDoc(
        doc(
          db,
          "publicProfiles",
          uid,
        ),
        {
          uid,
          displayName,
          role,
          photoURL: null,
        },
      );
    },
  );
}

async function seedStudentProfile(
  uid = "student1",
) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      const db =
        context.firestore();

      await setDoc(
        doc(
          db,
          "studentProfiles",
          uid,
        ),
        {
          uid,
          name: uid,
          graduationYear: "2027",
          interests: ["Engineering"],
          bio: "Test student",
          profileCompleted: true,
        },
      );
    },
  );
}

async function seedAlumniProfile(
  uid,
  {
    verificationStatus =
      "verified",
    mentorshipAvailable = true,
  } = {},
) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      const db =
        context.firestore();

      await setDoc(
        doc(
          db,
          "alumniProfiles",
          uid,
        ),
        {
          uid,
          name: uid,
          graduationYear: "2020",
          university:
            "Example University",
          degree: "B.Tech",
          field: "Engineering",
          currentRole: "Engineer",
          company: "Example",
          expertise: ["Engineering"],
          bio: "Test alumni",
          mentorshipAvailable,
          verificationStatus,
        },
      );
    },
  );
}

async function seedStudent(
  uid = "student1",
) {
  await seedUser(uid, {
    role: "student",
    status: "active",
    displayName: "Student",
  });

  await seedStudentProfile(uid);
}

async function seedVerifiedAlumni(
  uid = "alumni1",
  {
    mentorshipAvailable = true,
  } = {},
) {
  await seedUser(uid, {
    role: "alumni",
    status: "active",
    displayName:
      uid === "alumni1"
        ? "Alumni"
        : uid,
  });

  await seedAlumniProfile(uid, {
    verificationStatus:
      "verified",
    mentorshipAvailable,
  });
}

async function seedPendingAlumni(
  uid = "pendingAlumni",
) {
  await seedUser(uid, {
    role: "alumni",
    status: "pending",
    displayName:
      "Pending Alumni",
  });

  await seedAlumniProfile(uid, {
    verificationStatus:
      "pending",
    mentorshipAvailable: true,
  });
}

async function seedAdmin(
  uid = "admin1",
) {
  await seedUser(uid, {
    role: "student",
    status: "active",
    isAdmin: true,
    displayName: "Admin",
  });
}

async function seedMentorshipRequest(
  requestId = "request1",
  {
    studentId = "student1",
    alumniId = "alumni1",
    status = "pending",
  } = {},
) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      const db =
        context.firestore();

      await setDoc(
        doc(
          db,
          "mentorshipRequests",
          requestId,
        ),
        {
          studentId,
          alumniId,
          message:
            "I would like mentorship.",
          status,
        },
      );
    },
  );
}

async function seedConversation(
  conversationId = "request1",
  {
    studentId = "student1",
    alumniId = "alumni1",
  } = {},
) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      const db =
        context.firestore();

      await setDoc(
        doc(
          db,
          "conversations",
          conversationId,
        ),
        {
          studentId,
          alumniId,
          mentorshipRequestId:
            conversationId,
          lastMessage: "",
        },
      );
    },
  );
}

async function seedQuestion(
  questionId = "question1",
) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      const db =
        context.firestore();

      await setDoc(
        doc(
          db,
          "questions",
          questionId,
        ),
        {
          studentId: "student1",
          studentName: "Student",
          questionText:
            "What is engineering like?",
          status: "open",
        },
      );
    },
  );
}

async function seedOpenReport(
  reportId = "report1",
) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      const db =
        context.firestore();

      await setDoc(
        doc(
          db,
          "reports",
          reportId,
        ),
        {
          conversationId:
            "request1",
          reporterId:
            "student1",
          reporterName:
            "Student",
          reportedUserId:
            "alumni1",
          reportedUserName:
            "Alumni",
          reason:
            "Test report",
          status: "open",
        },
      );
    },
  );
}


// ============================================================
// AUTHENTICATION / USERS
// ============================================================

test(
  "Unauthenticated users cannot read user documents",
  async () => {
    await seedStudent();

    const db =
      testEnv
        .unauthenticatedContext()
        .firestore();

    await assertFails(
      getDoc(
        doc(
          db,
          "users",
          "student1",
        ),
      ),
    );
  },
);

test(
  "Unverified-email users cannot read protected user documents",
  async () => {
    await seedStudent();

    const db =
      unverifiedDb("student1");

    await assertFails(
      getDoc(
        doc(
          db,
          "users",
          "student1",
        ),
      ),
    );
  },
);

test(
  "Verified user can read their own user document",
  async () => {
    await seedStudent();

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "users",
          "student1",
        ),
      ),
    );
  },
);

test(
  "Ordinary user cannot read another user's private account document",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    const db =
      verifiedDb("student1");

    await assertFails(
      getDoc(
        doc(
          db,
          "users",
          "alumni1",
        ),
      ),
    );
  },
);

test(
  "Platform member can read another user's safe public profile",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "publicProfiles",
          "alumni1",
        ),
      ),
    );
  },
);

test(
  "Public profile cannot expose email or account metadata",
  async () => {
    const db =
      verifiedDb(
        "newStudent",
        "newStudent@example.com",
      );

    const batch =
      writeBatch(db);

    batch.set(
      doc(
        db,
        "users",
        "newStudent",
      ),
      {
        uid: "newStudent",
        email:
          "newStudent@example.com",
        displayName:
          "New Student",
        role: "student",
        status: "active",
        photoURL: null,
        isAdmin: false,
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      },
    );

    batch.set(
      doc(
        db,
        "publicProfiles",
        "newStudent",
      ),
      {
        uid: "newStudent",
        displayName:
          "New Student",
        role: "student",
        photoURL: null,
        email:
          "newStudent@example.com",
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      },
    );

    await assertFails(
      batch.commit(),
    );
  },
);

test(
  "Verified user can atomically create private and public account identity",
  async () => {
    const db =
      verifiedDb(
        "newStudent",
        "newStudent@example.com",
      );

    const batch =
      writeBatch(db);

    batch.set(
      doc(
        db,
        "users",
        "newStudent",
      ),
      {
        uid: "newStudent",
        email:
          "newStudent@example.com",
        displayName:
          "New Student",
        role: "student",
        status: "active",
        photoURL: null,
        isAdmin: false,
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      },
    );

    batch.set(
      doc(
        db,
        "publicProfiles",
        "newStudent",
      ),
      {
        uid: "newStudent",
        displayName:
          "New Student",
        role: "student",
        photoURL: null,
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      },
    );

    await assertSucceeds(
      batch.commit(),
    );
  },
);

test(
  "Unverified user cannot create platform account document",
  async () => {
    const db =
      unverifiedDb(
        "newStudent",
        "newStudent@example.com",
      );

    await assertFails(
      setDoc(
        doc(
          db,
          "users",
          "newStudent",
        ),
        {
          uid: "newStudent",
          email:
            "newStudent@example.com",
          displayName:
            "New Student",
          role: "student",
          status: "active",
          photoURL: null,
          isAdmin: false,
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "User cannot create account document with a different email",
  async () => {
    const db =
      verifiedDb(
        "newStudent",
        "real@example.com",
      );

    await assertFails(
      setDoc(
        doc(
          db,
          "users",
          "newStudent",
        ),
        {
          uid: "newStudent",
          email:
            "spoofed@example.com",
          displayName:
            "New Student",
          role: "student",
          status: "active",
          photoURL: null,
          isAdmin: false,
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "A user cannot create themselves as admin",
  async () => {
    const db =
      verifiedDb(
        "evilUser",
        "evilUser@example.com",
      );

    await assertFails(
      setDoc(
        doc(
          db,
          "users",
          "evilUser",
        ),
        {
          uid: "evilUser",
          email:
            "evilUser@example.com",
          displayName:
            "Evil User",
          role: "student",
          status: "active",
          photoURL: null,
          isAdmin: true,
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "User cannot change private display name without matching public profile update",
  async () => {
    await seedStudent();

    const db =
      verifiedDb("student1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "users",
          "student1",
        ),
        {
          displayName:
            "Changed Name",
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "User can atomically keep private and public display identity synchronized",
  async () => {
    await seedStudent();

    const db =
      verifiedDb("student1");

    const batch =
      writeBatch(db);

    batch.update(
      doc(
        db,
        "users",
        "student1",
      ),
      {
        displayName:
          "Changed Name",
        updatedAt:
          serverTimestamp(),
      },
    );

    batch.update(
      doc(
        db,
        "publicProfiles",
        "student1",
      ),
      {
        displayName:
          "Changed Name",
        updatedAt:
          serverTimestamp(),
      },
    );

    await assertSucceeds(
      batch.commit(),
    );
  },
);

test(
  "User cannot change their own role",
  async () => {
    await seedStudent();

    const db =
      verifiedDb("student1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "users",
          "student1",
        ),
        {
          role: "alumni",
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "User cannot make themselves admin after account creation",
  async () => {
    await seedStudent();

    const db =
      verifiedDb("student1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "users",
          "student1",
        ),
        {
          isAdmin: true,
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "User cannot activate their own pending alumni account",
  async () => {
    await seedPendingAlumni();

    const db =
      verifiedDb(
        "pendingAlumni",
      );

    await assertFails(
      updateDoc(
        doc(
          db,
          "users",
          "pendingAlumni",
        ),
        {
          status: "active",
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);


// ============================================================
// ATOMIC ONBOARDING
// ============================================================

test(
  "Student onboarding can atomically create account, public identity and student profile",
  async () => {
    const db =
      verifiedDb(
        "brandNewStudent",
        "brandNewStudent@example.com",
      );

    const batch =
      writeBatch(db);

    batch.set(
      doc(
        db,
        "users",
        "brandNewStudent",
      ),
      {
        uid:
          "brandNewStudent",
        email:
          "brandNewStudent@example.com",
        displayName:
          "Brand New Student",
        role: "student",
        status: "active",
        photoURL: null,
        isAdmin: false,
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      },
    );

    batch.set(
      doc(
        db,
        "publicProfiles",
        "brandNewStudent",
      ),
      {
        uid:
          "brandNewStudent",
        displayName:
          "Brand New Student",
        role: "student",
        photoURL: null,
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      },
    );

    batch.set(
      doc(
        db,
        "studentProfiles",
        "brandNewStudent",
      ),
      {
        uid:
          "brandNewStudent",
        name:
          "Brand New Student",
        graduationYear:
          "2027",
        interests:
          ["Engineering"],
        bio:
          "New student",
        profileCompleted:
          true,
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      },
    );

    await assertSucceeds(
      batch.commit(),
    );
  },
);

test(
  "Alumni onboarding can atomically create pending account and alumni profile",
  async () => {
    const db =
      verifiedDb(
        "brandNewAlumni",
        "brandNewAlumni@example.com",
      );

    const batch =
      writeBatch(db);

    batch.set(
      doc(
        db,
        "users",
        "brandNewAlumni",
      ),
      {
        uid:
          "brandNewAlumni",
        email:
          "brandNewAlumni@example.com",
        displayName:
          "Brand New Alumni",
        role: "alumni",
        status: "pending",
        photoURL: null,
        isAdmin: false,
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      },
    );

    batch.set(
      doc(
        db,
        "publicProfiles",
        "brandNewAlumni",
      ),
      {
        uid:
          "brandNewAlumni",
        displayName:
          "Brand New Alumni",
        role: "alumni",
        photoURL: null,
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      },
    );

    batch.set(
      doc(
        db,
        "alumniProfiles",
        "brandNewAlumni",
      ),
      {
        uid:
          "brandNewAlumni",
        name:
          "Brand New Alumni",
        graduationYear:
          "2020",
        university:
          "Example University",
        degree:
          "B.Tech",
        field:
          "Engineering",
        currentRole:
          "Engineer",
        company:
          "Example",
        expertise:
          ["Engineering"],
        bio:
          "New alumnus",
        mentorshipAvailable:
          true,
        verificationStatus:
          "pending",
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      },
    );

    await assertSucceeds(
      batch.commit(),
    );
  },
);


// ============================================================
// STUDENT PROFILE SECURITY
// ============================================================

test(
  "Student can update allowed profile fields",
  async () => {
    await seedStudent();

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      updateDoc(
        doc(
          db,
          "studentProfiles",
          "student1",
        ),
        {
          name: "Updated Student",
          bio: "Updated bio",
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Student cannot change profile UID",
  async () => {
    await seedStudent();

    const db =
      verifiedDb("student1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "studentProfiles",
          "student1",
        ),
        {
          uid: "someoneElse",
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Student cannot change profileCompleted",
  async () => {
    await seedStudent();

    const db =
      verifiedDb("student1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "studentProfiles",
          "student1",
        ),
        {
          profileCompleted: false,
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Student cannot read another student's private profile",
  async () => {
    await seedStudent(
      "student1",
    );
    await seedStudent(
      "student2",
    );

    const db =
      verifiedDb("student1");

    await assertFails(
      getDoc(
        doc(
          db,
          "studentProfiles",
          "student2",
        ),
      ),
    );
  },
);


// ============================================================
// ALUMNI VERIFICATION / PROFILE SECURITY
// ============================================================

test(
  "Pending alumni can read their own pending profile",
  async () => {
    await seedPendingAlumni();

    const db =
      verifiedDb(
        "pendingAlumni",
      );

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "alumniProfiles",
          "pendingAlumni",
        ),
      ),
    );
  },
);

test(
  "Active student cannot read a pending alumni profile",
  async () => {
    await seedStudent();
    await seedPendingAlumni();

    const db =
      verifiedDb("student1");

    await assertFails(
      getDoc(
        doc(
          db,
          "alumniProfiles",
          "pendingAlumni",
        ),
      ),
    );
  },
);

test(
  "Active student can read a verified alumni profile",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "alumniProfiles",
          "alumni1",
        ),
      ),
    );
  },
);

test(
  "Pending alumni cannot verify their own alumni profile",
  async () => {
    await seedPendingAlumni();

    const db =
      verifiedDb(
        "pendingAlumni",
      );

    await assertFails(
      updateDoc(
        doc(
          db,
          "alumniProfiles",
          "pendingAlumni",
        ),
        {
          verificationStatus:
            "verified",
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Admin cannot verify alumni profile without matching account activation",
  async () => {
    await seedAdmin();
    await seedPendingAlumni();

    const db =
      verifiedDb("admin1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "alumniProfiles",
          "pendingAlumni",
        ),
        {
          verificationStatus:
            "verified",
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Admin can atomically verify alumni and activate account",
  async () => {
    await seedAdmin();
    await seedPendingAlumni();

    const db =
      verifiedDb("admin1");

    const batch =
      writeBatch(db);

    batch.update(
      doc(
        db,
        "alumniProfiles",
        "pendingAlumni",
      ),
      {
        verificationStatus:
          "verified",
        updatedAt:
          serverTimestamp(),
      },
    );

    batch.update(
      doc(
        db,
        "users",
        "pendingAlumni",
      ),
      {
        status: "active",
        updatedAt:
          serverTimestamp(),
      },
    );

    await assertSucceeds(
      batch.commit(),
    );
  },
);

test(
  "Admin cannot activate pending alumni without matching verification",
  async () => {
    await seedAdmin();
    await seedPendingAlumni();

    const db =
      verifiedDb("admin1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "users",
          "pendingAlumni",
        ),
        {
          status: "active",
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);


test(
  "Admin can backfill a safe public profile for a legacy account",
  async () => {
    await seedAdmin();

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "users",
            "legacyUser",
          ),
          {
            uid:
              "legacyUser",
            email:
              "legacyUser@example.com",
            displayName:
              "Legacy User",
            role: "student",
            status: "active",
            photoURL: null,
            isAdmin: false,
          },
        );
      },
    );

    const db =
      verifiedDb("admin1");

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "publicProfiles",
          "legacyUser",
        ),
        {
          uid:
            "legacyUser",
          displayName:
            "Legacy User",
          role: "student",
          photoURL: null,
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);


// ============================================================
// MENTORSHIP
// ============================================================

test(
  "Student can request mentorship from verified available alumni",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "mentorshipRequests",
          "newRequest",
        ),
        {
          studentId:
            "student1",
          alumniId:
            "alumni1",
          message:
            "Could you mentor me?",
          status: "pending",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Unverified-email student cannot create mentorship request",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    const db =
      unverifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "mentorshipRequests",
          "newRequest",
        ),
        {
          studentId:
            "student1",
          alumniId:
            "alumni1",
          message:
            "Could you mentor me?",
          status: "pending",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Student cannot request mentorship from pending alumni",
  async () => {
    await seedStudent();
    await seedPendingAlumni();

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "mentorshipRequests",
          "badRequest",
        ),
        {
          studentId:
            "student1",
          alumniId:
            "pendingAlumni",
          message:
            "Please mentor me.",
          status: "pending",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Student cannot request mentorship from unavailable alumni",
  async () => {
    await seedStudent();

    await seedVerifiedAlumni(
      "alumni1",
      {
        mentorshipAvailable: false,
      },
    );

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "mentorshipRequests",
          "badRequest",
        ),
        {
          studentId:
            "student1",
          alumniId:
            "alumni1",
          message:
            "Please mentor me.",
          status: "pending",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Student cannot create oversized mentorship message",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "mentorshipRequests",
          "oversized",
        ),
        {
          studentId:
            "student1",
          alumniId:
            "alumni1",
          message:
            "x".repeat(2001),
          status: "pending",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);


// ============================================================
// ATOMIC ACCEPTANCE + CONVERSATIONS
// ============================================================

test(
  "Alumni cannot accept mentorship without creating matching conversation",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedMentorshipRequest();

    const db =
      verifiedDb("alumni1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "mentorshipRequests",
          "request1",
        ),
        {
          status: "accepted",
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Verified alumni can atomically accept mentorship and create matching conversation",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedMentorshipRequest();

    const db =
      verifiedDb("alumni1");

    const batch =
      writeBatch(db);

    batch.update(
      doc(
        db,
        "mentorshipRequests",
        "request1",
      ),
      {
        status: "accepted",
        updatedAt:
          serverTimestamp(),
      },
    );

    batch.set(
      doc(
        db,
        "conversations",
        "request1",
      ),
      {
        studentId:
          "student1",
        alumniId:
          "alumni1",
        mentorshipRequestId:
          "request1",
        createdAt:
          serverTimestamp(),
        lastMessage: "",
        lastMessageAt:
          serverTimestamp(),
      },
    );

    await assertSucceeds(
      batch.commit(),
    );
  },
);

test(
  "Student cannot forge a conversation",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "conversations",
          "fakeConversation",
        ),
        {
          studentId:
            "student1",
          alumniId:
            "alumni1",
          mentorshipRequestId:
            "fakeConversation",
          createdAt:
            serverTimestamp(),
          lastMessage: "",
          lastMessageAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Verified alumni cannot accept another alumnus's mentorship request",
  async () => {
    await seedStudent();

    await seedVerifiedAlumni(
      "alumni1",
    );

    await seedVerifiedAlumni(
      "alumni2",
    );

    await seedMentorshipRequest(
      "request1",
      {
        studentId:
          "student1",
        alumniId:
          "alumni1",
        status: "pending",
      },
    );

    const db =
      verifiedDb("alumni2");

    const batch =
      writeBatch(db);

    batch.update(
      doc(
        db,
        "mentorshipRequests",
        "request1",
      ),
      {
        status: "accepted",
        updatedAt:
          serverTimestamp(),
      },
    );

    batch.set(
      doc(
        db,
        "conversations",
        "request1",
      ),
      {
        studentId:
          "student1",
        alumniId:
          "alumni2",
        mentorshipRequestId:
          "request1",
        createdAt:
          serverTimestamp(),
        lastMessage: "",
        lastMessageAt:
          serverTimestamp(),
      },
    );

    await assertFails(
      batch.commit(),
    );
  },
);

test(
  "Conversation cannot be created with mismatched mentorship participants",
  async () => {
    await seedStudent(
      "student1",
    );

    await seedStudent(
      "student2",
    );

    await seedVerifiedAlumni();

    await seedMentorshipRequest(
      "request1",
      {
        studentId:
          "student1",
        alumniId:
          "alumni1",
        status: "pending",
      },
    );

    const db =
      verifiedDb("alumni1");

    const batch =
      writeBatch(db);

    batch.update(
      doc(
        db,
        "mentorshipRequests",
        "request1",
      ),
      {
        status: "accepted",
        updatedAt:
          serverTimestamp(),
      },
    );

    batch.set(
      doc(
        db,
        "conversations",
        "request1",
      ),
      {
        studentId:
          "student2",
        alumniId:
          "alumni1",
        mentorshipRequestId:
          "request1",
        createdAt:
          serverTimestamp(),
        lastMessage: "",
        lastMessageAt:
          serverTimestamp(),
      },
    );

    await assertFails(
      batch.commit(),
    );
  },
);

test(
  "Conversation participant cannot change studentId",
  async () => {
    await seedStudent(
      "student1",
    );
    await seedStudent(
      "student2",
    );
    await seedVerifiedAlumni();
    await seedConversation();

    const db =
      verifiedDb("student1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "conversations",
          "request1",
        ),
        {
          studentId:
            "student2",
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Conversation participant cannot change alumniId",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni(
      "alumni1",
    );
    await seedVerifiedAlumni(
      "alumni2",
    );
    await seedConversation();

    const db =
      verifiedDb("student1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "conversations",
          "request1",
        ),
        {
          alumniId:
            "alumni2",
        },
      ),
    );
  },
);

test(
  "Outsider cannot read a private conversation",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    await seedUser(
      "outsider",
      {
        role: "student",
        status: "active",
      },
    );

    await seedConversation();

    const db =
      verifiedDb("outsider");

    await assertFails(
      getDoc(
        doc(
          db,
          "conversations",
          "request1",
        ),
      ),
    );
  },
);

test(
  "Unverified participant cannot read existing conversation",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedConversation();

    const db =
      unverifiedDb("student1");

    await assertFails(
      getDoc(
        doc(
          db,
          "conversations",
          "request1",
        ),
      ),
    );
  },
);


// ============================================================
// MESSAGES
// ============================================================

test(
  "Blocking prevents new messages at database level",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    await seedMentorshipRequest(
      "request1",
      {
        status: "accepted",
      },
    );

    await seedConversation(
      "request1",
    );

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "blocks",
            "alumni1",
            "blockedUsers",
            "student1",
          ),
          {
            blockerId:
              "alumni1",
            blockedId:
              "student1",
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "conversations",
          "request1",
          "messages",
          "message1",
        ),
        {
          senderId:
            "student1",
          text:
            "This must be denied.",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Unblocked conversation participant can send message",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedConversation();

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "conversations",
          "request1",
          "messages",
          "message1",
        ),
        {
          senderId:
            "student1",
          text:
            "Hello mentor!",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Message sender cannot spoof another participant ID",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedConversation();

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "conversations",
          "request1",
          "messages",
          "message1",
        ),
        {
          senderId:
            "alumni1",
          text:
            "Spoofed sender",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Message cannot exceed 2000 characters",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedConversation();

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "conversations",
          "request1",
          "messages",
          "message1",
        ),
        {
          senderId:
            "student1",
          text:
            "x".repeat(2001),
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Ordinary participant cannot edit sent message",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedConversation();

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "conversations",
            "request1",
            "messages",
            "message1",
          ),
          {
            senderId:
              "student1",
            text: "Original",
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "conversations",
          "request1",
          "messages",
          "message1",
        ),
        {
          text: "Edited",
        },
      ),
    );
  },
);


// ============================================================
// ASK AN ALUMNI
// ============================================================

test(
  "Pending alumni cannot read Q&A",
  async () => {
    await seedStudent();
    await seedPendingAlumni();
    await seedQuestion();

    const db =
      verifiedDb(
        "pendingAlumni",
      );

    await assertFails(
      getDoc(
        doc(
          db,
          "questions",
          "question1",
        ),
      ),
    );
  },
);

test(
  "Pending alumni cannot answer questions",
  async () => {
    await seedStudent();
    await seedPendingAlumni();
    await seedQuestion();

    const db =
      verifiedDb(
        "pendingAlumni",
      );

    await assertFails(
      updateDoc(
        doc(
          db,
          "questions",
          "question1",
        ),
        {
          status:
            "answered",
          answererId:
            "pendingAlumni",
          answererName:
            "Pending Alumni",
          answerText:
            "Test answer",
          answeredAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Verified alumni can answer questions",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedQuestion();

    const db =
      verifiedDb("alumni1");

    await assertSucceeds(
      updateDoc(
        doc(
          db,
          "questions",
          "question1",
        ),
        {
          status:
            "answered",
          answererId:
            "alumni1",
          answererName:
            "Alumni",
          answerText:
            "Test answer",
          answeredAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Student cannot answer an alumni question",
  async () => {
    await seedStudent();
    await seedQuestion();

    const db =
      verifiedDb("student1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "questions",
          "question1",
        ),
        {
          status:
            "answered",
          answererId:
            "student1",
          answererName:
            "Student",
          answerText:
            "Fake alumni answer",
          answeredAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Student cannot spoof displayed name when creating question",
  async () => {
    await seedStudent();

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "questions",
          "spoofedNameQuestion",
        ),
        {
          studentId:
            "student1",
          studentName:
            "Someone Else",
          questionText:
            "Test question",
          status: "open",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Verified alumni cannot spoof answerer display name",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedQuestion();

    const db =
      verifiedDb("alumni1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "questions",
          "question1",
        ),
        {
          status:
            "answered",
          answererId:
            "alumni1",
          answererName:
            "Fake Name",
          answerText:
            "Test answer",
          answeredAt:
            serverTimestamp(),
        },
      ),
    );
  },
);


// ============================================================
// REPORTING
// ============================================================

test(
  "Non-participant cannot report a conversation",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    await seedUser(
      "outsider",
      {
        role: "student",
        status: "active",
        displayName:
          "Outsider",
      },
    );

    await seedConversation();

    const db =
      verifiedDb("outsider");

    await assertFails(
      setDoc(
        doc(
          db,
          "reports",
          "fakeReport",
        ),
        {
          conversationId:
            "request1",
          reporterId:
            "outsider",
          reporterName:
            "Outsider",
          reportedUserId:
            "alumni1",
          reportedUserName:
            "Alumni",
          reason:
            "Test report",
          status: "open",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Conversation participant can submit legitimate report",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedConversation();

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "reports",
          "report1",
        ),
        {
          conversationId:
            "request1",
          reporterId:
            "student1",
          reporterName:
            "Student",
          reportedUserId:
            "alumni1",
          reportedUserName:
            "Alumni",
          reason:
            "Inappropriate conversation.",
          status: "open",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Reporter cannot impersonate another user",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedConversation();

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "reports",
          "spoofedReport",
        ),
        {
          conversationId:
            "request1",
          reporterId:
            "alumni1",
          reporterName:
            "Alumni",
          reportedUserId:
            "student1",
          reportedUserName:
            "Student",
          reason:
            "Spoofed report",
          status: "open",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Reporter cannot spoof their display name",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedConversation();

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "reports",
          "spoofedName",
        ),
        {
          conversationId:
            "request1",
          reporterId:
            "student1",
          reporterName:
            "Fake Student",
          reportedUserId:
            "alumni1",
          reportedUserName:
            "Alumni",
          reason:
            "Test report",
          status: "open",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Reporter cannot spoof reported user's display name",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedConversation();

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "reports",
          "spoofedTargetName",
        ),
        {
          conversationId:
            "request1",
          reporterId:
            "student1",
          reporterName:
            "Student",
          reportedUserId:
            "alumni1",
          reportedUserName:
            "Fake Alumni",
          reason:
            "Test report",
          status: "open",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Non-admin cannot resolve a report",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedConversation();
    await seedOpenReport();

    const db =
      verifiedDb("student1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "reports",
          "report1",
        ),
        {
          status:
            "resolved",
          resolvedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Admin can resolve an open report",
  async () => {
    await seedAdmin();
    await seedStudent();
    await seedVerifiedAlumni();
    await seedConversation();
    await seedOpenReport();

    const db =
      verifiedDb("admin1");

    await assertSucceeds(
      updateDoc(
        doc(
          db,
          "reports",
          "report1",
        ),
        {
          status:
            "resolved",
          resolvedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);


// ============================================================
// BLOCKING
// ============================================================

test(
  "User can create their own block",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "blocks",
          "student1",
          "blockedUsers",
          "alumni1",
        ),
        {
          blockerId:
            "student1",
          blockedId:
            "alumni1",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "User cannot create a block pretending another user created it",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "blocks",
          "alumni1",
          "blockedUsers",
          "student1",
        ),
        {
          blockerId:
            "alumni1",
          blockedId:
            "student1",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "User cannot block themselves",
  async () => {
    await seedStudent();

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "blocks",
          "student1",
          "blockedUsers",
          "student1",
        ),
        {
          blockerId:
            "student1",
          blockedId:
            "student1",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Blocked user cannot remove someone else's block",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "blocks",
            "alumni1",
            "blockedUsers",
            "student1",
          ),
          {
            blockerId:
              "alumni1",
            blockedId:
              "student1",
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertFails(
      deleteDoc(
        doc(
          db,
          "blocks",
          "alumni1",
          "blockedUsers",
          "student1",
        ),
      ),
    );
  },
);

test(
  "Block owner can unblock user",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "blocks",
            "student1",
            "blockedUsers",
            "alumni1",
          ),
          {
            blockerId:
              "student1",
            blockedId:
              "alumni1",
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      deleteDoc(
        doc(
          db,
          "blocks",
          "student1",
          "blockedUsers",
          "alumni1",
        ),
      ),
    );
  },
);


// ============================================================
// DEFAULT-DENY / UNKNOWN COLLECTION
// ============================================================

test(
  "Unknown collections are denied by default",
  async () => {
    await seedStudent();

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "totallyUnknown",
          "doc1",
        ),
        {
          hello: "world",
        },
      ),
    );
  },
);

// ============================================================
// PRIVATE USER PREFERENCES
// ============================================================

test(
  "Verified user can create their own preferences",
  async () => {
    await seedStudent();

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "userPreferences",
          "student1",
        ),
        {
          uid: "student1",
          theme: "system",
          textSize: "default",
          highContrast: false,
          reduceMotion: false,
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Unverified user cannot create preferences",
  async () => {
    await seedStudent();

    const db =
      unverifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "userPreferences",
          "student1",
        ),
        {
          uid: "student1",
          theme: "system",
          textSize: "default",
          highContrast: false,
          reduceMotion: false,
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "User cannot read another member's private preferences",
  async () => {
    await seedStudent("student1");
    await seedStudent("student2");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "userPreferences",
            "student2",
          ),
          {
            uid: "student2",
            theme: "dark",
            textSize: "large",
            highContrast: true,
            reduceMotion: true,
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertFails(
      getDoc(
        doc(
          db,
          "userPreferences",
          "student2",
        ),
      ),
    );
  },
);

test(
  "User cannot write preferences into another user's document",
  async () => {
    await seedStudent("student1");
    await seedStudent("student2");

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "userPreferences",
          "student2",
        ),
        {
          uid: "student2",
          theme: "dark",
          textSize: "large",
          highContrast: true,
          reduceMotion: true,
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "User cannot save an unsupported theme value",
  async () => {
    await seedStudent();

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "userPreferences",
          "student1",
        ),
        {
          uid: "student1",
          theme: "neon",
          textSize: "default",
          highContrast: false,
          reduceMotion: false,
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

// ============================================================
// NOTIFICATIONS
// ============================================================

test(
  "Student can atomically create a legitimate mentorship-request notification",
  async () => {
    await seedStudent("student1");
    await seedVerifiedAlumni("alumni1");

    const db =
      verifiedDb("student1");

    const batch =
      writeBatch(db);

    batch.set(
      doc(
        db,
        "mentorshipRequests",
        "request1",
      ),
      {
        studentId: "student1",
        alumniId: "alumni1",
        message:
          "Could you mentor me?",
        status: "pending",
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      },
    );

    batch.set(
      doc(
        db,
        "notifications",
        "alumni1",
        "items",
        "mentorship-requested-request1",
      ),
      {
        recipientId: "alumni1",
        actorId: "student1",
        type:
          "mentorship_requested",
        entityId: "request1",
        eventId: "request1",
        createdAt:
          serverTimestamp(),
        readAt: null,
      },
    );

    await assertSucceeds(
      batch.commit(),
    );
  },
);

test(
  "Student cannot spoof a mentorship notification to another member",
  async () => {
    await seedStudent("student1");
    await seedStudent("student2");
    await seedVerifiedAlumni("alumni1");

    const db =
      verifiedDb("student1");

    const batch =
      writeBatch(db);

    batch.set(
      doc(
        db,
        "mentorshipRequests",
        "request1",
      ),
      {
        studentId: "student1",
        alumniId: "alumni1",
        message:
          "Could you mentor me?",
        status: "pending",
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      },
    );

    batch.set(
      doc(
        db,
        "notifications",
        "student2",
        "items",
        "mentorship-requested-request1",
      ),
      {
        recipientId: "student2",
        actorId: "student1",
        type:
          "mentorship_requested",
        entityId: "request1",
        eventId: "request1",
        createdAt:
          serverTimestamp(),
        readAt: null,
      },
    );

    await assertFails(
      batch.commit(),
    );
  },
);

test(
  "Notification recipient can read their own notification",
  async () => {
    await seedStudent("student1");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "notifications",
            "student1",
            "items",
            "notice1",
          ),
          {
            recipientId:
              "student1",
            actorId:
              "alumni1",
            type:
              "question_answered",
            entityId:
              "question1",
            eventId:
              "question1",
            readAt: null,
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "notifications",
          "student1",
          "items",
          "notice1",
        ),
      ),
    );
  },
);

test(
  "Another member cannot read someone else's notification",
  async () => {
    await seedStudent("student1");
    await seedStudent("student2");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "notifications",
            "student1",
            "items",
            "notice1",
          ),
          {
            recipientId:
              "student1",
            actorId:
              "student2",
            type:
              "new_message",
            entityId:
              "conversation1",
            eventId:
              "message1",
            readAt: null,
          },
        );
      },
    );

    const db =
      verifiedDb("student2");

    await assertFails(
      getDoc(
        doc(
          db,
          "notifications",
          "student1",
          "items",
          "notice1",
        ),
      ),
    );
  },
);

test(
  "Recipient can mark their notification read",
  async () => {
    await seedStudent("student1");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "notifications",
            "student1",
            "items",
            "notice1",
          ),
          {
            recipientId:
              "student1",
            actorId:
              "alumni1",
            type:
              "question_answered",
            entityId:
              "question1",
            eventId:
              "question1",
            readAt: null,
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      updateDoc(
        doc(
          db,
          "notifications",
          "student1",
          "items",
          "notice1",
        ),
        {
          readAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Another member cannot mark the recipient's notification read",
  async () => {
    await seedStudent("student1");
    await seedVerifiedAlumni("alumni1");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "notifications",
            "student1",
            "items",
            "notice1",
          ),
          {
            recipientId:
              "student1",
            actorId:
              "alumni1",
            type:
              "question_answered",
            entityId:
              "question1",
            eventId:
              "question1",
            readAt: null,
          },
        );
      },
    );

    const db =
      verifiedDb("alumni1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "notifications",
          "student1",
          "items",
          "notice1",
        ),
        {
          readAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Member cannot forge a system verification notification",
  async () => {
    await seedStudent("student1");
    await seedStudent("student2");

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "notifications",
          "student2",
          "items",
          "alumni_verified-student2",
        ),
        {
          recipientId:
            "student2",
          actorId:
            "student1",
          type:
            "alumni_verified",
          entityId:
            "student2",
          eventId:
            "student2",
          createdAt:
            serverTimestamp(),
          readAt: null,
        },
      ),
    );
  },
);

// ============================================================
// PROJECTS / PORTFOLIO
// ============================================================

function validProjectPayload(
  ownerId,
  {
    status = "draft",
    projectUrl = "",
  } = {},
) {
  return {
    ownerId,
    title: "Autonomous Garden Monitor",
    category: "Engineering",
    summary:
      status === "published"
        ? "A sensor-based system that monitors plant conditions."
        : "",
    description:
      status === "published"
        ? "This project combines sensors, embedded software and a simple dashboard."
        : "",
    role: "Builder",
    outcome: "",
    technologies: [
      "TypeScript",
      "Embedded systems",
    ],
    projectUrl,
    repositoryUrl: "",
    collaborationWanted: true,
    mentorshipWanted: false,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

test(
  "Active student can create a private project draft",
  async () => {
    await seedStudent("student1");

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "projects",
          "project1",
        ),
        validProjectPayload(
          "student1",
        ),
      ),
    );
  },
);

test(
  "Pending alumni cannot create a project",
  async () => {
    await seedPendingAlumni(
      "alumni1",
    );

    const db =
      verifiedDb("alumni1");

    await assertFails(
      setDoc(
        doc(
          db,
          "projects",
          "project1",
        ),
        validProjectPayload(
          "alumni1",
        ),
      ),
    );
  },
);

test(
  "Owner can read their own project draft",
  async () => {
    await seedStudent("student1");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "projects",
            "project1",
          ),
          {
            ...validProjectPayload(
              "student1",
            ),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "projects",
          "project1",
        ),
      ),
    );
  },
);

test(
  "Another member cannot read someone else's draft",
  async () => {
    await seedStudent("student1");
    await seedStudent("student2");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "projects",
            "project1",
          ),
          {
            ...validProjectPayload(
              "student1",
            ),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("student2");

    await assertFails(
      getDoc(
        doc(
          db,
          "projects",
          "project1",
        ),
      ),
    );
  },
);

test(
  "Active member can read a published community project",
  async () => {
    await seedStudent("student1");
    await seedVerifiedAlumni(
      "alumni1",
    );

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "projects",
            "project1",
          ),
          {
            ...validProjectPayload(
              "student1",
              {
                status:
                  "published",
              },
            ),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("alumni1");

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "projects",
          "project1",
        ),
      ),
    );
  },
);

test(
  "Unverified email account cannot read a published project",
  async () => {
    await seedStudent("student1");
    await seedStudent("student2");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "projects",
            "project1",
          ),
          {
            ...validProjectPayload(
              "student1",
              {
                status:
                  "published",
              },
            ),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        );
      },
    );

    const db =
      unverifiedDb("student2");

    await assertFails(
      getDoc(
        doc(
          db,
          "projects",
          "project1",
        ),
      ),
    );
  },
);

test(
  "Project owner can publish a valid draft",
  async () => {
    await seedStudent("student1");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "projects",
            "project1",
          ),
          {
            ownerId:
              "student1",
            title:
              "Autonomous Garden Monitor",
            category:
              "Engineering",
            summary: "",
            description: "",
            role: "Builder",
            outcome: "",
            technologies: [],
            projectUrl: "",
            repositoryUrl: "",
            collaborationWanted:
              false,
            mentorshipWanted:
              false,
            status: "draft",
            createdAt:
              new Date(),
            updatedAt:
              new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      updateDoc(
        doc(
          db,
          "projects",
          "project1",
        ),
        {
          summary:
            "A sensor-based system that monitors plant conditions.",
          description:
            "This project combines sensors, embedded software and a simple dashboard.",
          status:
            "published",
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Project owner cannot change project ownership",
  async () => {
    await seedStudent("student1");
    await seedStudent("student2");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "projects",
            "project1",
          ),
          {
            ...validProjectPayload(
              "student1",
            ),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertFails(
      updateDoc(
        doc(
          db,
          "projects",
          "project1",
        ),
        {
          ownerId:
            "student2",
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Another member cannot edit someone else's project",
  async () => {
    await seedStudent("student1");
    await seedStudent("student2");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "projects",
            "project1",
          ),
          {
            ...validProjectPayload(
              "student1",
              {
                status:
                  "published",
              },
            ),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("student2");

    await assertFails(
      updateDoc(
        doc(
          db,
          "projects",
          "project1",
        ),
        {
          title:
            "Hijacked title",
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Published project cannot use a non-HTTPS project link",
  async () => {
    await seedStudent("student1");

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "projects",
          "project1",
        ),
        validProjectPayload(
          "student1",
          {
            status:
              "published",
            projectUrl:
              "http://example.com",
          },
        ),
      ),
    );
  },
);

test(
  "Owner can delete their project",
  async () => {
    await seedStudent("student1");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "projects",
            "project1",
          ),
          {
            ...validProjectPayload(
              "student1",
            ),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      deleteDoc(
        doc(
          db,
          "projects",
          "project1",
        ),
      ),
    );
  },
);

// ============================================================
// COMMUNITY HUB
// ============================================================

function validResourcePayload(
  adminId,
  {
    status = "published",
  } = {},
) {
  return {
    kind: "resource",
    title:
      "University application guide",
    summary:
      "A school-curated guide for planning university applications.",
    details:
      "Use this guide as a starting point and confirm deadlines with each institution.",
    category:
      "University planning",
    organization:
      "The Study",
    location: "",
    eventMode: "",
    startAt: null,
    endAt: null,
    deadline: null,
    eligibility: "",
    url:
      "https://example.com/resource",
    status,
    createdBy:
      adminId,
    createdAt:
      serverTimestamp(),
    updatedAt:
      serverTimestamp(),
  };
}

test(
  "Admin can publish a community resource",
  async () => {
    await seedAdmin("admin1");

    const db =
      verifiedDb("admin1");

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "communityContent",
          "resource1",
        ),
        validResourcePayload(
          "admin1",
        ),
      ),
    );
  },
);

test(
  "Ordinary student cannot publish community content",
  async () => {
    await seedStudent("student1");

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "communityContent",
          "resource1",
        ),
        validResourcePayload(
          "student1",
        ),
      ),
    );
  },
);

test(
  "Active member can read published community content",
  async () => {
    await seedAdmin("admin1");
    await seedStudent("student1");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "communityContent",
            "resource1",
          ),
          {
            ...validResourcePayload(
              "admin1",
            ),
            createdAt:
              new Date(),
            updatedAt:
              new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "communityContent",
          "resource1",
        ),
      ),
    );
  },
);

test(
  "Ordinary member cannot read admin draft content",
  async () => {
    await seedAdmin("admin1");
    await seedStudent("student1");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "communityContent",
            "resource1",
          ),
          {
            ...validResourcePayload(
              "admin1",
              {
                status:
                  "draft",
              },
            ),
            createdAt:
              new Date(),
            updatedAt:
              new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertFails(
      getDoc(
        doc(
          db,
          "communityContent",
          "resource1",
        ),
      ),
    );
  },
);

test(
  "Unverified email account cannot read published hub content",
  async () => {
    await seedAdmin("admin1");
    await seedStudent("student1");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "communityContent",
            "resource1",
          ),
          {
            ...validResourcePayload(
              "admin1",
            ),
            createdAt:
              new Date(),
            updatedAt:
              new Date(),
          },
        );
      },
    );

    const db =
      unverifiedDb("student1");

    await assertFails(
      getDoc(
        doc(
          db,
          "communityContent",
          "resource1",
        ),
      ),
    );
  },
);

test(
  "Active user can save a published hub item",
  async () => {
    await seedAdmin("admin1");
    await seedStudent("student1");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "communityContent",
            "resource1",
          ),
          {
            ...validResourcePayload(
              "admin1",
            ),
            createdAt:
              new Date(),
            updatedAt:
              new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "savedContent",
          "student1",
          "items",
          "resource1",
        ),
        {
          uid:
            "student1",
          contentId:
            "resource1",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "User cannot save unpublished hub content",
  async () => {
    await seedAdmin("admin1");
    await seedStudent("student1");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "communityContent",
            "resource1",
          ),
          {
            ...validResourcePayload(
              "admin1",
              {
                status:
                  "draft",
              },
            ),
            createdAt:
              new Date(),
            updatedAt:
              new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "savedContent",
          "student1",
          "items",
          "resource1",
        ),
        {
          uid:
            "student1",
          contentId:
            "resource1",
          createdAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "User cannot read another member's saved hub items",
  async () => {
    await seedStudent("student1");
    await seedStudent("student2");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "savedContent",
            "student1",
            "items",
            "resource1",
          ),
          {
            uid:
              "student1",
            contentId:
              "resource1",
          },
        );
      },
    );

    const db =
      verifiedDb("student2");

    await assertFails(
      getDoc(
        doc(
          db,
          "savedContent",
          "student1",
          "items",
          "resource1",
        ),
      ),
    );
  },
);

test(
  "Admin cannot create an event whose end is before its start",
  async () => {
    await seedAdmin("admin1");

    const db =
      verifiedDb("admin1");

    await assertFails(
      setDoc(
        doc(
          db,
          "communityContent",
          "event1",
        ),
        {
          kind:
            "event",
          title:
            "Alumni careers panel",
          summary:
            "A panel with verified alumni.",
          details: "",
          category:
            "Career",
          organization:
            "The Study",
          location:
            "School auditorium",
          eventMode:
            "in_person",
          startAt:
            new Date(
              "2030-05-01T15:00:00Z",
            ),
          endAt:
            new Date(
              "2030-05-01T14:00:00Z",
            ),
          deadline: null,
          eligibility: "",
          url: "",
          status:
            "published",
          createdBy:
            "admin1",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

// ============================================================
// NOTIFICATION PREFERENCES + HUB REMINDERS
// ============================================================

test(
  "User can create their own notification preferences",
  async () => {
    await seedStudent("student1");

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "notificationPreferences",
          "student1",
        ),
        {
          uid:
            "student1",
          mentorshipAlerts:
            true,
          messageAlerts:
            true,
          qnaAlerts:
            true,
          hubReminders:
            true,
          reminderLeadHours:
            24,
          timezone:
            "Asia/Kolkata",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Another user cannot read notification preferences",
  async () => {
    await seedStudent("student1");
    await seedStudent("student2");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "notificationPreferences",
            "student1",
          ),
          {
            uid:
              "student1",
            mentorshipAlerts:
              true,
            messageAlerts:
              true,
            qnaAlerts:
              true,
            hubReminders:
              true,
            reminderLeadHours:
              24,
            timezone:
              "Asia/Kolkata",
          },
        );
      },
    );

    const db =
      verifiedDb("student2");

    await assertFails(
      getDoc(
        doc(
          db,
          "notificationPreferences",
          "student1",
        ),
      ),
    );
  },
);

test(
  "Unsupported reminder lead time is rejected",
  async () => {
    await seedStudent("student1");

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "notificationPreferences",
          "student1",
        ),
        {
          uid:
            "student1",
          mentorshipAlerts:
            true,
          messageAlerts:
            true,
          qnaAlerts:
            true,
          hubReminders:
            true,
          reminderLeadHours:
            7,
          timezone:
            "Asia/Kolkata",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Active student can create a reminder for a published event",
  async () => {
    await seedAdmin("admin1");
    await seedStudent("student1");

    const target =
      new Date(
        "2030-05-01T15:00:00Z",
      );

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "communityContent",
            "event1",
          ),
          {
            kind:
              "event",
            title:
              "Alumni careers panel",
            summary:
              "A panel with verified alumni.",
            details: "",
            category:
              "Career",
            organization:
              "The Study",
            location:
              "School auditorium",
            eventMode:
              "in_person",
            startAt:
              target,
            endAt: null,
            deadline: null,
            eligibility: "",
            url: "",
            status:
              "published",
            createdBy:
              "admin1",
            createdAt:
              new Date(),
            updatedAt:
              new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "contentReminders",
          "student1",
          "items",
          "event1",
        ),
        {
          uid:
            "student1",
          contentId:
            "event1",
          kind:
            "event",
          remindAt:
            new Date(
              "2030-04-30T15:00:00Z",
            ),
          targetAt:
            target,
          deliveredAt:
            null,
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "User cannot create a reminder for an unpublished event",
  async () => {
    await seedAdmin("admin1");
    await seedStudent("student1");

    const target =
      new Date(
        "2030-05-01T15:00:00Z",
      );

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "communityContent",
            "event1",
          ),
          {
            kind:
              "event",
            title:
              "Draft event",
            summary:
              "Not published.",
            details: "",
            category:
              "Career",
            organization:
              "The Study",
            location:
              "School auditorium",
            eventMode:
              "in_person",
            startAt:
              target,
            endAt: null,
            deadline: null,
            eligibility: "",
            url: "",
            status:
              "draft",
            createdBy:
              "admin1",
            createdAt:
              new Date(),
            updatedAt:
              new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "contentReminders",
          "student1",
          "items",
          "event1",
        ),
        {
          uid:
            "student1",
          contentId:
            "event1",
          kind:
            "event",
          remindAt:
            new Date(
              "2030-04-30T15:00:00Z",
            ),
          targetAt:
            target,
          deliveredAt:
            null,
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        },
      ),
    );
  },
);

test(
  "Another user cannot read a private content reminder",
  async () => {
    await seedStudent("student1");
    await seedStudent("student2");

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "contentReminders",
            "student1",
            "items",
            "event1",
          ),
          {
            uid:
              "student1",
            contentId:
              "event1",
            kind:
              "event",
            remindAt:
              new Date(),
            targetAt:
              new Date(),
            deliveredAt:
              null,
          },
        );
      },
    );

    const db =
      verifiedDb("student2");

    await assertFails(
      getDoc(
        doc(
          db,
          "contentReminders",
          "student1",
          "items",
          "event1",
        ),
      ),
    );
  },
);

test(
  "Due reminder can atomically create its own in-app notification",
  async () => {
    await seedAdmin("admin1");
    await seedStudent("student1");

    const target =
      new Date(
        "2030-05-01T15:00:00Z",
      );

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "communityContent",
            "event1",
          ),
          {
            kind:
              "event",
            title:
              "Alumni careers panel",
            summary:
              "A panel with verified alumni.",
            details: "",
            category:
              "Career",
            organization:
              "The Study",
            location:
              "School auditorium",
            eventMode:
              "in_person",
            startAt:
              target,
            endAt: null,
            deadline: null,
            eligibility: "",
            url: "",
            status:
              "published",
            createdBy:
              "admin1",
            createdAt:
              new Date(),
            updatedAt:
              new Date(),
          },
        );

        await setDoc(
          doc(
            db,
            "contentReminders",
            "student1",
            "items",
            "event1",
          ),
          {
            uid:
              "student1",
            contentId:
              "event1",
            kind:
              "event",
            remindAt:
              new Date(
                Date.now() -
                60_000,
              ),
            targetAt:
              target,
            deliveredAt:
              null,
            createdAt:
              new Date(),
            updatedAt:
              new Date(),
          },
        );
      },
    );

    const db =
      verifiedDb("student1");

    const batch =
      writeBatch(db);

    batch.set(
      doc(
        db,
        "notifications",
        "student1",
        "items",
        "hub-reminder-event1",
      ),
      {
        recipientId:
          "student1",
        actorId:
          "student1",
        type:
          "hub_reminder",
        entityId:
          "event1",
        eventId:
          "event1",
        createdAt:
          serverTimestamp(),
        readAt: null,
      },
    );

    batch.update(
      doc(
        db,
        "contentReminders",
        "student1",
        "items",
        "event1",
      ),
      {
        deliveredAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      },
    );

    await assertSucceeds(
      batch.commit(),
    );
  },
);

test(
  "User cannot forge a hub reminder without a due reminder record",
  async () => {
    await seedStudent("student1");

    const db =
      verifiedDb("student1");

    await assertFails(
      setDoc(
        doc(
          db,
          "notifications",
          "student1",
          "items",
          "hub-reminder-fake",
        ),
        {
          recipientId:
            "student1",
          actorId:
            "student1",
          type:
            "hub_reminder",
          entityId:
            "fake",
          eventId:
            "fake",
          createdAt:
            serverTimestamp(),
          readAt: null,
        },
      ),
    );
  },
);

