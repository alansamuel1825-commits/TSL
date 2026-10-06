import {
  geminiModel,
  planWithGemini,
  streamWithGemini,
  textFromGeminiChunk,
  type GeminiContent,
  type GeminiFunctionCall,
} from "./gemini";

export type ProviderContent =
  GeminiContent;

export type ProviderFunctionCall =
  GeminiFunctionCall;

export const providerName =
  "Gemini";

export function providerModel():
  string {
  return geminiModel();
}

export async function planWithTools(
  input: Parameters<
    typeof planWithGemini
  >[0]
) {
  /*
   * Provider boundary:
   * Gemini is the current free-tier implementation.
   * A future Llama/local provider can implement this same
   * surface without rewriting the TSL Assist UI/tool layer.
   */
  return planWithGemini(
    input
  );
}

export async function streamAnswer(
  input: Parameters<
    typeof streamWithGemini
  >[0]
) {
  return streamWithGemini(
    input
  );
}

export function providerTextFromChunk(
  payload: unknown
): string {
  return textFromGeminiChunk(
    payload
  );
}
