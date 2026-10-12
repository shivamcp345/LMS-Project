import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { askBatchQuestion } from "../api/batches";

export default function BatchAssistant({ batchId }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  async function submitQuestion(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || asking) return;

    const history = messages.slice(-10);
    setMessages((current) => [...current, { role: "user", content: text }]);
    setQuestion("");
    setError("");
    setAsking(true);

    try {
      const response = await askBatchQuestion(batchId, text, history);
      setMessages((current) => [
        ...current,
        { role: "model", content: response.data.answer },
      ]);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not get an answer. Please try again.",
      );
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className="lesson-assistant card" aria-label="Batch AI questions and answers">
      <header className="lesson-assistant__header">
        <Bot size={20} aria-hidden="true" />
        <div>
          <h2>Ask AI</h2>
          <p>Ask questions about your course or anything you are studying.</p>
        </div>
      </header>
      <div className="lesson-assistant__messages" aria-live="polite">
        {messages.length === 0 && (
          <p className="lesson-assistant__empty">
            Ask a question to get started.
          </p>
        )}
        {messages.map((message, index) => (
          <div
            className={`lesson-assistant__message lesson-assistant__message--${message.role}`}
            key={`${index}-${message.role}`}
          >
            {message.content}
          </div>
        ))}
        {asking && <div className="lesson-assistant__pending">Thinking…</div>}
      </div>
      {error && (
        <p className="lesson-assistant__error" role="alert">
          {error}
        </p>
      )}
      <form className="lesson-assistant__form" onSubmit={submitQuestion}>
        <input
          aria-label="Ask AI a question"
          maxLength={1200}
          placeholder="Type your question…"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          disabled={asking}
        />
        <button
          type="submit"
          aria-label="Send question"
          title="Send question"
          disabled={asking || !question.trim()}
        >
          <Send size={17} aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}