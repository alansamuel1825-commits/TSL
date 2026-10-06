export type AssistRole =
  | "user"
  | "assistant";

export type AssistClientMessage = {
  id: string;
  role: AssistRole;
  content: string;
  createdAt: number;
  meta?: AssistResponseMeta;
};

export type AssistHubCard = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  organization: string;
  url: string;
};

export type AssistAlumniCard = {
  uid: string;
  name: string;
  graduationYear: string;
  university: string;
  degree: string;
  field: string;
  currentRole: string;
  company: string;
  expertise: string[];
  mentorshipAvailable: boolean;
  matchedTerms: string[];
  profileHref: string;
};

export type AssistAppAction = {
  id: string;
  title: string;
  description: string;
  href: string;
};

export type AssistResponseMeta = {
  grounding: (
    | "hub"
    | "verified_alumni"
    | "app_help"
    | "general_ai"
  )[];
  hub: AssistHubCard[];
  alumni: AssistAlumniCard[];
  actions: AssistAppAction[];
  privacyRedacted: boolean;
  model: string;
};
