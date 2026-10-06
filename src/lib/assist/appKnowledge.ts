export type AppKnowledgeEntry = {
  id: string;
  title: string;
  route: string;
  keywords: string[];
  description: string;
  steps: string[];
};

export const APP_KNOWLEDGE:
  AppKnowledgeEntry[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    route: "/dashboard",
    keywords: [
      "dashboard",
      "home",
      "start",
      "overview",
    ],
    description:
      "The signed-in starting point for a TSL Alumni Connect account.",
    steps: [
      "Open Dashboard from the main navigation.",
      "Use it as the starting point for profile, mentorship and community features.",
    ],
  },
  {
    id: "alumni-directory",
    title: "Verified alumni directory",
    route: "/alumni",
    keywords: [
      "alumni",
      "find alumni",
      "directory",
      "career",
      "expertise",
      "mentor",
      "industry",
      "university",
    ],
    description:
      "Browse verified TSL alumni and open their community profiles.",
    steps: [
      "Open Alumni.",
      "Browse or search the directory.",
      "Open an alumnus profile to learn about their public experience and mentorship availability.",
    ],
  },
  {
    id: "mentorship",
    title: "Mentorship",
    route: "/mentorship",
    keywords: [
      "mentor",
      "mentorship",
      "request",
      "guidance",
      "connect",
    ],
    description:
      "Students can request mentorship from suitable verified alumni and manage request status.",
    steps: [
      "Find a relevant verified alumnus.",
      "Review the profile before requesting mentorship.",
      "Write a specific, respectful reason for reaching out.",
      "Use Mentorship to track pending, accepted, declined or cancelled requests.",
    ],
  },
  {
    id: "messages",
    title: "Messages",
    route: "/messages",
    keywords: [
      "message",
      "chat",
      "conversation",
      "dm",
      "contact",
    ],
    description:
      "On-platform messaging is available for accepted mentorship connections.",
    steps: [
      "A mentorship request must be accepted before its conversation is created.",
      "Keep communication professional and on-platform.",
      "Use reporting or blocking tools if a conversation becomes inappropriate.",
    ],
  },
  {
    id: "ask-alumni",
    title: "Ask an Alumni",
    route: "/ask",
    keywords: [
      "ask",
      "question",
      "q&a",
      "doubt",
      "alumni question",
    ],
    description:
      "Students can post a question for alumni to answer within the school community.",
    steps: [
      "Open Ask.",
      "Write a clear question without private contact information.",
      "An eligible alumnus can answer it.",
      "The student receives an in-app notification when it is answered.",
    ],
  },
  {
    id: "projects",
    title: "Community Projects",
    route: "/projects",
    keywords: [
      "project",
      "portfolio",
      "build",
      "research",
      "software",
      "engineering",
      "collaboration",
    ],
    description:
      "Browse published community projects and learn what students and alumni are building.",
    steps: [
      "Open Projects to browse published work.",
      "Use project details to understand the problem, role, technology and outcome.",
      "Use Manage Projects to create or edit your own draft or published project.",
    ],
  },
  {
    id: "manage-projects",
    title: "Manage Projects",
    route: "/projects/manage",
    keywords: [
      "create project",
      "edit project",
      "publish project",
      "draft project",
      "manage project",
    ],
    description:
      "Create, edit, publish or delete your own project portfolio entries.",
    steps: [
      "Open Projects and choose Manage.",
      "Create a draft first if the write-up is not ready.",
      "Add an accurate summary and description before publishing.",
      "Never invent users, results, awards or impact metrics.",
    ],
  },
  {
    id: "hub",
    title: "Community Hub",
    route: "/hub",
    keywords: [
      "hub",
      "resource",
      "opportunity",
      "scholarship",
      "event",
      "deadline",
      "eligibility",
    ],
    description:
      "The school-curated area for trusted resources, opportunities and events.",
    steps: [
      "Open Hub.",
      "Search or filter Resources, Opportunities and Events.",
      "Confirm important deadlines and eligibility using the original source.",
      "Save useful items or add a reminder when a future date is available.",
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    route: "/notifications",
    keywords: [
      "notification",
      "alert",
      "unread",
      "bell",
      "reminder",
    ],
    description:
      "In-app updates for mentorship, messages, Q&A, verification and Hub reminders.",
    steps: [
      "Use the bell or open Notifications.",
      "Open an item to follow its deep link.",
      "Use Mark all as read when appropriate.",
    ],
  },
  {
    id: "notification-settings",
    title: "Notification settings",
    route: "/settings/notifications",
    keywords: [
      "notification settings",
      "reminder settings",
      "alerts",
      "12 hours",
      "24 hours",
      "48 hours",
      "72 hours",
    ],
    description:
      "Control optional in-app alert categories and the default lead time for Hub reminders.",
    steps: [
      "Open Notification settings.",
      "Choose optional mentorship, message, Q&A and Hub reminder preferences.",
      "School verification/account-state notices remain visible because they affect account capabilities.",
    ],
  },
  {
    id: "settings",
    title: "Settings",
    route: "/settings",
    keywords: [
      "settings",
      "profile",
      "theme",
      "dark mode",
      "accessibility",
      "edit profile",
    ],
    description:
      "Manage profile details and accessibility preferences such as theme, text size, contrast and reduced motion.",
    steps: [
      "Open Settings.",
      "Change only information that belongs to your own account.",
      "Use accessibility controls according to your preference.",
    ],
  },
  {
    id: "email-verification",
    title: "Email verification",
    route: "/verify-email",
    keywords: [
      "verify",
      "verification email",
      "email verified",
      "resend",
    ],
    description:
      "Email verification confirms control of the sign-in email. It is separate from school alumni verification.",
    steps: [
      "Open the verification page after email signup.",
      "Use the resend option if necessary.",
      "Email verification does not make an alumni profile school-verified.",
    ],
  },
  {
    id: "alumni-verification",
    title: "School alumni verification",
    route: "/dashboard",
    keywords: [
      "alumni verification",
      "verified alumni",
      "pending alumni",
      "school verified",
    ],
    description:
      "Alumni status is reviewed by authorized school administrators before verified-alumni capabilities become active.",
    steps: [
      "Complete the alumni profile accurately.",
      "Wait for school review.",
      "A verification email or Google sign-in alone does not count as school alumni verification.",
    ],
  },
  {
    id: "safety",
    title: "Report and block",
    route: "/guidelines",
    keywords: [
      "report",
      "block",
      "unsafe",
      "harassment",
      "inappropriate",
      "guidelines",
      "safety",
    ],
    description:
      "Alumni Connect includes reporting and blocking tools to support professional, school-governed communication.",
    steps: [
      "Keep communication on-platform.",
      "Block a user when you no longer want contact.",
      "Submit a report when school moderation is needed.",
      "For an immediate real-world safety concern, contact a trusted adult or the school directly.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    route: "/privacy",
    keywords: [
      "privacy",
      "data",
      "personal information",
      "contact details",
    ],
    description:
      "The platform is designed to minimize unnecessary exposure of private student information and contact details.",
    steps: [
      "Do not post private phone numbers, home addresses, passwords or API keys.",
      "Use on-platform communication rather than publishing personal contact information.",
    ],
  },
  {
    id: "help",
    title: "Help",
    route: "/help",
    keywords: [
      "help",
      "support",
      "problem",
      "how to",
      "what can i do",
    ],
    description:
      "Use the Help area for product guidance and common workflows.",
    steps: [
      "Open Help for platform guidance.",
      "If the problem concerns account verification or moderation, contact the authorized school administrator.",
    ],
  },
];
