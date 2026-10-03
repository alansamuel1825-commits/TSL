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


const PROJECT_ID = "demo-tsl-alumni";


const testEnv =
  await initializeTestEnvironment({
    projectId: PROJECT_ID,

    firestore: {
      host: "127.0.0.1",
      port: 8080,

      rules: fs.readFileSync(
        "firestore.rules",
        "utf8"
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
// TEST DATA HELPERS
// ============================================================

async function seedUser(
  uid,
  {
    role = "student",
    status = "active",
    isAdmin = false,
    displayName = uid,
  } = {}
) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      const db = context.firestore();

      await setDoc(
        doc(db, "users", uid),
        {
          uid,
          email: `${uid}@example.com`,
          displayName,
          role,
          status,
          photoURL: null,
          isAdmin,
        }
      );
    }
  );
}


async function seedAlumniProfile(
  uid,
  {
    verificationStatus = "verified",
    mentorshipAvailable = true,
  } = {}
) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      const db = context.firestore();

      await setDoc(
        doc(
          db,
          "alumniProfiles",
          uid
        ),
        {
          uid,
          name: uid,
          graduationYear: "2020",
          university: "Example University",
          degree: "B.Tech",
          field: "Engineering",
          currentRole: "Engineer",
          company: "Example",
          expertise: ["Engineering"],
          bio: "Test alumni",
          mentorshipAvailable,
          verificationStatus,
        }
      );
    }
  );
}


async function seedStudent(
  uid = "student1"
) {
  await seedUser(uid, {
    role: "student",
    status: "active",
  });
}


async function seedVerifiedAlumni(
  uid = "alumni1"
) {
  await seedUser(uid, {
    role: "alumni",
    status: "active",
  });

  await seedAlumniProfile(uid, {
    verificationStatus:
      "verified",
    mentorshipAvailable: true,
  });
}


async function seedPendingAlumni(
  uid = "pendingAlumni"
) {
  await seedUser(uid, {
    role: "alumni",
    status: "pending",
  });

  await seedAlumniProfile(uid, {
    verificationStatus:
      "pending",
    mentorshipAvailable: true,
  });
}


async function seedMentorshipRequest(
  requestId = "request1",
  {
    studentId = "student1",
    alumniId = "alumni1",
    status = "pending",
  } = {}
) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      const db = context.firestore();

      await setDoc(
        doc(
          db,
          "mentorshipRequests",
          requestId
        ),
        {
          studentId,
          alumniId,
          message:
            "I would like mentorship.",
          status,
        }
      );
    }
  );
}


async function seedConversation(
  conversationId = "request1",
  {
    studentId = "student1",
    alumniId = "alumni1",
  } = {}
) {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      const db = context.firestore();

      await setDoc(
        doc(
          db,
          "conversations",
          conversationId
        ),
        {
          studentId,
          alumniId,
          mentorshipRequestId:
            conversationId,
          lastMessage: "",
        }
      );
    }
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
          "student1"
        )
      )
    );
  }
);


test(
  "A user cannot create themselves as admin",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          "evilUser"
        )
        .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          "users",
          "evilUser"
        ),
        {
          uid: "evilUser",
          email:
            "evil@example.com",
          displayName:
            "Evil User",
          role: "student",
          status: "active",
          photoURL: null,

          // Must be rejected.
          isAdmin: true,
        }
      )
    );
  }
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
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "mentorshipRequests",
          "newRequest"
        ),
        {
          studentId:
            "student1",
          alumniId:
            "alumni1",
          message:
            "Could you mentor me?",
          status:
            "pending",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);


test(
  "Student cannot request mentorship from pending alumni",
  async () => {
    await seedStudent();
    await seedPendingAlumni();

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          "mentorshipRequests",
          "badRequest"
        ),
        {
          studentId:
            "student1",
          alumniId:
            "pendingAlumni",
          message:
            "Please mentor me.",
          status:
            "pending",
        }
      )
    );
  }
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
      testEnv
        .authenticatedContext(
          "alumni1"
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "mentorshipRequests",
          "request1"
        ),
        {
          status:
            "accepted",
          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);


test(
  "Verified alumni can atomically accept mentorship and create matching conversation",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedMentorshipRequest();

    const db =
      testEnv
        .authenticatedContext(
          "alumni1"
        )
        .firestore();

    const batch =
      writeBatch(db);

    batch.update(
      doc(
        db,
        "mentorshipRequests",
        "request1"
      ),
      {
        status:
          "accepted",
        updatedAt:
          serverTimestamp(),
      }
    );

    batch.set(
      doc(
        db,
        "conversations",
        "request1"
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
      }
    );

    await assertSucceeds(
      batch.commit()
    );
  }
);


test(
  "Student cannot forge a conversation",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          "conversations",
          "fakeConversation"
        ),
        {
          studentId:
            "student1",

          alumniId:
            "alumni1",

          mentorshipRequestId:
            "fakeConversation",

          lastMessage: "",
        }
      )
    );
  }
);


// ============================================================
// QUESTIONS
// ============================================================

test(
  "Pending alumni cannot answer questions",
  async () => {
    await seedStudent();
    await seedPendingAlumni();

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "questions",
            "question1"
          ),
          {
            studentId:
              "student1",
            studentName:
              "Student",
            questionText:
              "What is engineering like?",
            status:
              "open",
          }
        );
      }
    );

    const db =
      testEnv
        .authenticatedContext(
          "pendingAlumni"
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "questions",
          "question1"
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
        }
      )
    );
  }
);


test(
  "Verified alumni can answer questions",
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
            "questions",
            "question1"
          ),
          {
            studentId:
              "student1",
            studentName:
              "Student",
            questionText:
              "What is engineering like?",
            status:
              "open",
          }
        );
      }
    );

    const db =
      testEnv
        .authenticatedContext(
          "alumni1"
        )
        .firestore();

    await assertSucceeds(
      updateDoc(
        doc(
          db,
          "questions",
          "question1"
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
        }
      )
    );
  }
);


// ============================================================
// BLOCKING
// ============================================================

test(
  "Blocking prevents new messages at database level",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    await seedMentorshipRequest(
      "request1",
      {
        status:
          "accepted",
      }
    );

    await seedConversation(
      "request1"
    );

    /*
     * Alumni blocks student.
     */
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
            "student1"
          ),
          {
            blockerId:
              "alumni1",

            blockedId:
              "student1",
          }
        );
      }
    );

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          "conversations",
          "request1",
          "messages",
          "message1"
        ),
        {
          senderId:
            "student1",

          text:
            "This must be denied.",

          createdAt:
            serverTimestamp(),
        }
      )
    );
  }
);


test(
  "Unblocked conversation participant can send message",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    await seedMentorshipRequest(
      "request1",
      {
        status:
          "accepted",
      }
    );

    await seedConversation(
      "request1"
    );

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "conversations",
          "request1",
          "messages",
          "message1"
        ),
        {
          senderId:
            "student1",

          text:
            "Hello mentor!",

          createdAt:
            serverTimestamp(),
        }
      )
    );
  }
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
      }
    );

    await seedConversation();

    const db =
      testEnv
        .authenticatedContext(
          "outsider"
        )
        .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          "reports",
          "fakeReport"
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

          status:
            "open",

          createdAt:
            serverTimestamp(),
        }
      )
    );
  }
);


test(
  "Conversation participant can submit legitimate report",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedConversation();

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "reports",
          "report1"
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

          status:
            "open",

          createdAt:
            serverTimestamp(),
        }
      )
    );
  }
);
// ============================================================
// ADVERSARIAL / PRIVILEGE ESCALATION TESTS
// ============================================================

test(
  "User cannot change their own role to alumni",
  async () => {
    await seedStudent();

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "users",
          "student1"
        ),
        {
          role: "alumni",
        }
      )
    );
  }
);


test(
  "User cannot make themselves admin after account creation",
  async () => {
    await seedStudent();

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "users",
          "student1"
        ),
        {
          isAdmin: true,
        }
      )
    );
  }
);


test(
  "User cannot activate their own pending alumni account",
  async () => {
    await seedPendingAlumni();

    const db =
      testEnv
        .authenticatedContext(
          "pendingAlumni"
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "users",
          "pendingAlumni"
        ),
        {
          status: "active",
        }
      )
    );
  }
);


test(
  "Pending alumni cannot verify their own alumni profile",
  async () => {
    await seedPendingAlumni();

    const db =
      testEnv
        .authenticatedContext(
          "pendingAlumni"
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "alumniProfiles",
          "pendingAlumni"
        ),
        {
          verificationStatus:
            "verified",
        }
      )
    );
  }
);


test(
  "Student cannot answer an alumni question",
  async () => {
    await seedStudent();

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db =
          context.firestore();

        await setDoc(
          doc(
            db,
            "questions",
            "studentAnswerTest"
          ),
          {
            studentId:
              "student1",

            studentName:
              "Student",

            questionText:
              "Test question",

            status:
              "open",
          }
        );
      }
    );

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "questions",
          "studentAnswerTest"
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
        }
      )
    );
  }
);


test(
  "Verified alumni cannot accept another alumnus's mentorship request",
  async () => {
    await seedStudent();

    await seedVerifiedAlumni(
      "alumni1"
    );

    await seedVerifiedAlumni(
      "alumni2"
    );

    await seedMentorshipRequest(
      "request1",
      {
        studentId:
          "student1",

        alumniId:
          "alumni1",

        status:
          "pending",
      }
    );

    const db =
      testEnv
        .authenticatedContext(
          "alumni2"
        )
        .firestore();

    const batch =
      writeBatch(db);

    batch.update(
      doc(
        db,
        "mentorshipRequests",
        "request1"
      ),
      {
        status:
          "accepted",

        updatedAt:
          serverTimestamp(),
      }
    );

    batch.set(
      doc(
        db,
        "conversations",
        "request1"
      ),
      {
        studentId:
          "student1",

        alumniId:
          "alumni2",

        mentorshipRequestId:
          "request1",

        lastMessage: "",
      }
    );

    await assertFails(
      batch.commit()
    );
  }
);


test(
  "Conversation cannot be created with mismatched mentorship participants",
  async () => {
    await seedStudent(
      "student1"
    );

    await seedStudent(
      "student2"
    );

    await seedVerifiedAlumni();

    await seedMentorshipRequest(
      "request1",
      {
        studentId:
          "student1",

        alumniId:
          "alumni1",

        status:
          "pending",
      }
    );

    const db =
      testEnv
        .authenticatedContext(
          "alumni1"
        )
        .firestore();

    const batch =
      writeBatch(db);

    batch.update(
      doc(
        db,
        "mentorshipRequests",
        "request1"
      ),
      {
        status:
          "accepted",

        updatedAt:
          serverTimestamp(),
      }
    );

    batch.set(
      doc(
        db,
        "conversations",
        "request1"
      ),
      {
        // Intentionally wrong student.
        studentId:
          "student2",

        alumniId:
          "alumni1",

        mentorshipRequestId:
          "request1",

        lastMessage: "",
      }
    );

    await assertFails(
      batch.commit()
    );
  }
);


test(
  "Conversation participant cannot change studentId",
  async () => {
    await seedStudent(
      "student1"
    );

    await seedStudent(
      "student2"
    );

    await seedVerifiedAlumni();

    await seedConversation(
      "request1"
    );

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "conversations",
          "request1"
        ),
        {
          studentId:
            "student2",
        }
      )
    );
  }
);


test(
  "Conversation participant cannot change alumniId",
  async () => {
    await seedStudent();

    await seedVerifiedAlumni(
      "alumni1"
    );

    await seedVerifiedAlumni(
      "alumni2"
    );

    await seedConversation(
      "request1"
    );

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "conversations",
          "request1"
        ),
        {
          alumniId:
            "alumni2",
        }
      )
    );
  }
);


test(
  "Outsider cannot read a private conversation",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    await seedUser(
      "outsider",
      {
        role:
          "student",

        status:
          "active",
      }
    );

    await seedConversation();

    const db =
      testEnv
        .authenticatedContext(
          "outsider"
        )
        .firestore();

    await assertFails(
      getDoc(
        doc(
          db,
          "conversations",
          "request1"
        )
      )
    );
  }
);


test(
  "User can create their own block",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "blocks",
          "student1",
          "blockedUsers",
          "alumni1"
        ),
        {
          blockerId:
            "student1",

          blockedId:
            "alumni1",

          createdAt:
            serverTimestamp(),
        }
      )
    );
  }
);


test(
  "User cannot create a block pretending another user created it",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          "blocks",
          "alumni1",
          "blockedUsers",
          "student1"
        ),
        {
          blockerId:
            "alumni1",

          blockedId:
            "student1",
        }
      )
    );
  }
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
            "student1"
          ),
          {
            blockerId:
              "alumni1",

            blockedId:
              "student1",
          }
        );
      }
    );

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertFails(
      deleteDoc(
        doc(
          db,
          "blocks",
          "alumni1",
          "blockedUsers",
          "student1"
        )
      )
    );
  }
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
            "alumni1"
          ),
          {
            blockerId:
              "student1",

            blockedId:
              "alumni1",
          }
        );
      }
    );

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertSucceeds(
      deleteDoc(
        doc(
          db,
          "blocks",
          "student1",
          "blockedUsers",
          "alumni1"
        )
      )
    );
  }
);


test(
  "Reporter cannot impersonate another user",
  async () => {
    await seedStudent();
    await seedVerifiedAlumni();
    await seedConversation();

    const db =
      testEnv
        .authenticatedContext(
          "student1"
        )
        .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          "reports",
          "spoofedReport"
        ),
        {
          conversationId:
            "request1",

          // Spoofed reporter ID.
          reporterId:
            "alumni1",

          reporterName:
            "Fake Reporter",

          reportedUserId:
            "student1",

          reportedUserName:
            "Student",

          reason:
            "Spoofed report",

          status:
            "open",

          createdAt:
            serverTimestamp(),
        }
      )
    );
  }
);