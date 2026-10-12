const env = require("../config/env");

async function answerBatchQuestion({ question, history, context }) {
  if (!env.geminiApiKey) {
    const error = new Error("AI provider is not configured");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  const batchContext = [
    `Batch: ${context.batchName}`,
    `Course: ${context.courseTitle}`,
    `Category: ${context.category || "General"}`,
    `Level: ${context.level || "Not specified"}`,
    `Course description: ${context.courseDescription || "No course description was provided."}`,
    `Curriculum topics: ${context.curriculum.join(", ") || "No topics were provided."}`,
  ].join("\n");

  const contents = history.map(({ role, content }) => ({
    role,
    parts: [{ text: content }],
  }));
  contents.push({ role: "user", parts: [{ text: question }] });

  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.geminiApiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `You are a concise, friendly study assistant inside an LMS. Answer the student's question helpfully using reliable general knowledge and the batch/course context below. For course-specific facts, do not invent details that are absent from the context; say when you are unsure.\n\nBatch/course context:\n${batchContext}`,
            }],
          },
          contents,
          generationConfig: { maxOutputTokens: 700, temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
  } catch {
    const error = new Error("AI assistant is temporarily unavailable. Please try again.");
    error.status = 503;
    throw error;
  }

  if (!response.ok) {
    const error = new Error("AI assistant could not answer right now. Please try again.");
    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }

  const result = await response.json();
  const answer = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!answer) {
    const error = new Error("AI assistant returned an empty answer. Please try again.");
    error.status = 502;
    throw error;
  }

  return answer;
}

module.exports = { answerBatchQuestion };