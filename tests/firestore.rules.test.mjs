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
