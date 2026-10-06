type GeminiPart =
  Record<
    string,
    unknown
  >;

export type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

export type GeminiFunctionCall = {
  id?: string;
  name: string;
  args:
    Record<
      string,
      unknown
    >;
};

export type GeminiPlannerResult = {
  content:
    GeminiContent | null;
  calls:
    GeminiFunctionCall[];
};

function apiKey():
  string {
  const key =
    process.env
      .GEMINI_API_KEY;

  if (!key) {
    throw new Error(
      "GEMINI_NOT_CONFIGURED"
    );
  }

  return key;
}

export function geminiModel():
  string {
  return (
    process.env
      .GEMINI_TSL_AI_MODEL ||
    "gemini-3.8-flash"
  );
}

function endpoint(
  method:
    "generateContent"
    | "streamGenerateContent"
): string {
  const model =
    encodeURIComponent(
      geminiModel()
    );

  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`;
}

function headers():
  Record<
    string,
    string
  > {
  return {
    "Content-Type":
      "application/json",
    "x-goog-api-key":
      apiKey(),
  };
}

export function friendlyGeminiFailure(
  status: number
): string {
  if (
    status === 429
  ) {
    return "The free Gemini quota is temporarily busy or exhausted. Try again a little later.";
  }

  if (
    status === 403
  ) {
    return "Gemini API access was denied for this project. Check the AI Studio key/project access without sharing the key.";
  }

  if (
    status === 400
  ) {
    return "Gemini rejected this request. Check the configured model name and API key setup.";
  }

  return "TSL Assist is temporarily unavailable.";
}

export async function planWithGemini({
  systemInstruction,
  contents,
  tools,
}: {
  systemInstruction: string;
  contents: GeminiContent[];
  tools: unknown[];
}): Promise<GeminiPlannerResult> {
  const response =
    await fetch(
      endpoint(
        "generateContent"
      ),
      {
        method:
          "POST",

        headers:
          headers(),

        body:
          JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    systemInstruction,
                },
              ],
            },

            contents,

            tools,

            generationConfig: {
              temperature:
                0.15,
              maxOutputTokens:
                700,
            },
          }),

        cache:
          "no-store",
      }
    );

  if (
    !response.ok
  ) {
    const error =
      new Error(
        friendlyGeminiFailure(
          response.status
        )
      );

    (
      error as
        Error & {
          status?: number;
        }
    ).status =
      response.status;

    throw error;
  }

  const payload =
    await response.json() as {
      candidates?: Array<{
        content?:
          GeminiContent;
      }>;
    };

  const content =
    payload.candidates?.[0]
      ?.content ||
    null;

  const calls:
    GeminiFunctionCall[] = [];

  for (
    const part of
    content?.parts || []
  ) {
    const value =
      part.functionCall;

    if (
      !value ||
      typeof value !==
        "object"
    ) {
      continue;
    }

    const call =
      value as {
        id?: unknown;
        name?: unknown;
        args?: unknown;
      };

    if (
      typeof call.name !==
      "string"
    ) {
      continue;
    }

    calls.push({
      id:
        typeof call.id ===
        "string"
          ? call.id
          : undefined,

      name:
        call.name,

      args:
        call.args &&
        typeof call.args ===
          "object"
          ? call.args as
              Record<
                string,
                unknown
              >
          : {},
    });
  }

  return {
    content,
    calls,
  };
}

export async function streamWithGemini({
  systemInstruction,
  contents,
}: {
  systemInstruction: string;
  contents: GeminiContent[];
}): Promise<Response> {
  const response =
    await fetch(
      `${endpoint(
        "streamGenerateContent"
      )}?alt=sse`,
      {
        method:
          "POST",

        headers:
          headers(),

        body:
          JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    systemInstruction,
                },
              ],
            },

            contents,

            generationConfig: {
              temperature:
                0.35,
              maxOutputTokens:
                1400,
            },
          }),

        cache:
          "no-store",
      }
    );

  if (
    !response.ok
  ) {
    const error =
      new Error(
        friendlyGeminiFailure(
          response.status
        )
      );

    (
      error as
        Error & {
          status?: number;
        }
    ).status =
      response.status;

    throw error;
  }

  return response;
}

export function textFromGeminiChunk(
  payload: unknown
): string {
  if (
    !payload ||
    typeof payload !==
      "object"
  ) {
    return "";
  }

  const record =
    payload as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: unknown;
          }>;
        };
      }>;
    };

  const parts =
    record.candidates?.[0]
      ?.content?.parts ||
    [];

  return parts
    .map(
      (part) =>
        typeof part.text ===
        "string"
          ? part.text
          : ""
    )
    .join("");
}
