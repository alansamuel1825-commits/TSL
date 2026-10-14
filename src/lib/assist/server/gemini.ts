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

export function geminiFallbackModel():
  string {
  return (
    process.env
      .GEMINI_TSL_AI_FALLBACK_MODEL ||
    "gemini-3.5-flash-lite"
  );
}

function endpoint(
  method:
    "generateContent"
    | "streamGenerateContent",
  model:
    string =
      geminiModel()
): string {
  const encodedModel =
    encodeURIComponent(
      model
    );

  return `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:${method}`;
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

  if (
    status === 503 ||
    status === 502 ||
    status === 504
  ) {
    return "Gemini is currently under high demand. Please try again in a moment.";
  }

  return "TSL Assist is temporarily unavailable.";
}

async function logGeminiHttpFailure(
  phase: "planner" | "stream",
  response: Response
): Promise<void> {
  let providerStatus =
    "";

  let providerMessage =
    "";

  try {
    const payload =
      await response.clone().json() as {
        error?: {
          status?: unknown;
          message?: unknown;
        };
      };

    if (
      typeof payload.error?.status ===
      "string"
    ) {
      providerStatus =
        payload.error.status;
    }

    if (
      typeof payload.error?.message ===
      "string"
    ) {
      providerMessage =
        payload.error.message.slice(
          0,
          500
        );
    }
  } catch {
    /*
     * Provider errors are normally JSON. If not, the HTTP status
     * below is still enough for diagnosis. Do not log prompts,
     * auth tokens, API keys, or request bodies.
     */
  }

  console.error(
    "[TSL Assist] Gemini HTTP failure:",
    {
      phase,
      httpStatus:
        response.status,
      statusText:
        response.statusText,
      providerStatus:
        providerStatus ||
        undefined,
      providerMessage:
        providerMessage ||
        undefined,
    }
  );
}

function retryableGeminiStatus(
  status: number
): boolean {
  return (
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function providerUnavailableStatus(
  status: number
): boolean {
  return (
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function wait(
  milliseconds: number
): Promise<void> {
  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

async function fetchGeminiWithRetry({
  phase,
  url,
  init,
  retryDelays = [
    1000,
    2500,
  ],
}: {
  phase: "planner" | "stream";
  url: string;
  init: RequestInit;
  retryDelays?: number[];
}): Promise<Response> {

  for (
    let attempt = 0;
    attempt <=
      retryDelays.length;
    attempt += 1
  ) {
    const response =
      await fetch(
        url,
        init
      );

    if (
      response.ok ||
      !retryableGeminiStatus(
        response.status
      ) ||
      attempt ===
        retryDelays.length
    ) {
      return response;
    }

    await logGeminiHttpFailure(
      phase,
      response
    );

    console.warn(
      "[TSL Assist] Retrying Gemini after transient provider failure:",
      {
        phase,
        attempt:
          attempt + 1,
        httpStatus:
          response.status,
      }
    );

    await wait(
      retryDelays[
        attempt
      ]
    );
  }

  throw new Error(
    "Gemini retry loop ended unexpectedly."
  );
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
    await fetchGeminiWithRetry({
      phase:
        "planner",

      url:
        endpoint(
          "generateContent"
        ),

      init: {
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
      },
    });

  if (
    !response.ok
  ) {
    await logGeminiHttpFailure(
      "planner",
      response
    );

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
  const primaryBody =
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
    });

  let response =
    await fetchGeminiWithRetry({
      phase:
        "stream",

      url:
        `${endpoint(
          "streamGenerateContent"
        )}?alt=sse`,

      init: {
        method:
          "POST",

        headers:
          headers(),

        body:
          primaryBody,

        cache:
          "no-store",
      },

      /*
       * Exponential backoff for transient provider pressure.
       * Three primary attempts total:
       * immediate, +1s, +2.5s.
       */
      retryDelays: [
        1000,
        2500,
      ],
    });

  /*
   * Emergency stream-only fallback.
   *
   * We deliberately do NOT move tool planning to the fallback
   * model. Gemini 3.8 Flash remains the planner/primary model.
   *
   * If the final answer stream repeatedly hits provider-side
   * 502/503/504 capacity errors, make one attempt with the
   * lower-latency production Flash-Lite model.
   *
   * The fallback body omits temperature because current Gemini
   * 3.5 Flash-Lite guidance deprecates sampling parameters.
   */
  if (
    !response.ok &&
    providerUnavailableStatus(
      response.status
    )
  ) {
    await logGeminiHttpFailure(
      "stream",
      response
    );

    const fallbackModel =
      geminiFallbackModel();

    console.warn(
      "[TSL Assist] Primary Gemini stream unavailable; trying emergency fallback:",
      {
        primaryModel:
          geminiModel(),
        fallbackModel,
        httpStatus:
          response.status,
      }
    );

    const fallbackBody =
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
          maxOutputTokens:
            1400,
        },
      });

    response =
      await fetchGeminiWithRetry({
        phase:
          "stream",

        url:
          `${endpoint(
            "streamGenerateContent",
            fallbackModel
          )}?alt=sse`,

        init: {
          method:
            "POST",

          headers:
            headers(),

          body:
            fallbackBody,

          cache:
            "no-store",
        },

        /*
         * One retry for the emergency fallback:
         * immediate, then +1s.
         */
        retryDelays: [
          1000,
        ],
      });

    if (response.ok) {
      console.warn(
        "[TSL Assist] Emergency Gemini fallback succeeded.",
        {
          fallbackModel,
        }
      );
    }
  }

  if (
    !response.ok
  ) {
    await logGeminiHttpFailure(
      "stream",
      response
    );

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
