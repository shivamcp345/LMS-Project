import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import {
  createBatchTest,
  getBatchTestResults,
  gradeTestAttempt,
  getTestAnswer,
  getTestPaper,
} from "../api/tests";

const newQuestion = () => ({
  prompt: "",
  options: ["", "", "", ""],
  answerIndex: 0,
});

function parseQuestionBlocks(source) {
  const questionStart = /^(?:Q(?:uestion)?\s*\d*\s*[:.)-]\s*|\d+[.)]\s+)/i;
  const blocks = [];
  let currentBlock = [];

  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
    if (questionStart.test(line.trim()) && currentBlock.length) {
      blocks.push(currentBlock.join("\n"));
      currentBlock = [];
    }
    if (line.trim()) currentBlock.push(line.trim());
  }
  if (currentBlock.length) blocks.push(currentBlock.join("\n"));

  const questions = [];
  const errors = [];

  if (!blocks.length) {
    return { questions, errors: ["Paste at least one question block to import."] };
  }

  blocks.forEach((block, blockIndex) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    let prompt = "";
    const options = [];
    let answerLabel = "";
    let readingPrompt = true;

    for (const line of lines) {
      const answerMatch = line.match(
        /^(?:correct(?:\s+(?:answer|option))?|answer)\s*[:=\-]\s*(?:option\s*)?([A-H]|[1-8])\b/i,
      );
      if (answerMatch) {
        answerLabel = answerMatch[1].toUpperCase();
        readingPrompt = false;
        continue;
      }

      const optionMatch = line.match(
        /^(?:option\s+)?([A-H])[).:\-]\s*(.+)$/i,
      );
      if (optionMatch) {
        options.push({ label: optionMatch[1].toUpperCase(), text: optionMatch[2].trim() });
        readingPrompt = false;
        continue;
      }

      if (readingPrompt) {
        prompt += `${prompt ? " " : ""}${line.replace(/^(?:Q(?:uestion)?\s*\d*\s*[:.)-]\s*|\d+[.)]\s+)/i, "")}`;
      } else if (options.length) {
        options[options.length - 1].text += ` ${line}`;
      }
    }

    const answerIndex = /^\d$/.test(answerLabel)
      ? Number(answerLabel) - 1
      : options.findIndex((option) => option.label === answerLabel);
    const problem = !prompt
      ? "Add a question prompt."
      : options.length < 2
        ? "Add at least two options labelled A), B), and so on."
          : answerIndex < 0 || answerIndex >= options.length
          ? "Add a correct answer using Answer: A (or the matching option letter)."
          : "";

    if (problem) errors.push(`Question ${blockIndex + 1}: ${problem}`);
    else questions.push({ prompt, options: options.map((option) => option.text), answerIndex });
  });

  return { questions, errors };
}

function downloadFile(file, name) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name || "submission.pdf";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TrainerTests() {
  const { batchId } = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("mcq");
  const [totalMarks, setTotalMarks] = useState(100);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [paper, setPaper] = useState(null);
  const [questions, setQuestions] = useState([newQuestion()]);
  const [bulkQuestions, setBulkQuestions] = useState("");
  const [questionsImported, setQuestionsImported] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importErrors, setImportErrors] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState({ tests: [], attempts: [] });
  const [grades, setGrades] = useState({});
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const response = await getBatchTestResults(batchId);
      setResults(response.data || { tests: [], attempts: [] });
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not load test results",
      );
    }
  }

  useEffect(() => {
    load();
  }, [batchId]);

  async function publish(event) {
    event.preventDefault();
    setPublishing(true);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("description", description);
      form.append("format", format);
      form.append("durationMinutes", durationMinutes);
      if (format === "mcq") form.append("questions", JSON.stringify(questions));
      if (format === "pdf") {
        form.append("totalMarks", totalMarks);
        if (paper) form.append("paper", paper);
      }
      await createBatchTest(batchId, form);
      setTitle("");
      setDescription("");
      setPaper(null);
      setQuestions([newQuestion()]);
      setBulkQuestions("");
      setQuestionsImported(false);
      setImportMessage("");
      setImportErrors([]);
      setMessage("Test published for this batch.");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not publish test");
    } finally {
      setPublishing(false);
    }
  }

  function importQuestions() {
    const result = parseQuestionBlocks(bulkQuestions);
    setImportErrors(result.errors);
    setImportMessage("");
    if (!result.questions.length || result.errors.length) return;
    setQuestions(result.questions);
    setQuestionsImported(true);
    setImportMessage(`${result.questions.length} questions ready to publish.`);
  }

  async function readQuestionFile(file) {
    if (!file) return;
    setBulkQuestions(await file.text());
    setQuestionsImported(false);
    setImportMessage(`${file.name} loaded. Review it, then select Import questions.`);
    setImportErrors([]);
  }

  async function grade(attempt) {
    try {
      const value = grades[attempt._id] || {};
      await gradeTestAttempt(
        attempt.test._id,
        attempt._id,
        value.score,
        value.feedback,
      );
      setMessage("Student marks saved.");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not save marks");
    }
  }

  return (
    <AppShell>
      <main className="page">
        <Link className="back-link" to={`/trainer/batches/${batchId}`}>
          ← Back to batch
        </Link>
        <header className="page__head">
          <div>
            <span className="eyebrow">ASSESSMENTS</span>
            <h1>Batch tests</h1>
            <p>
              Create MCQ tests or upload a PDF paper, then review student
              results.
            </p>
          </div>
        </header>
        {message && <div className="banner">{message}</div>}
        <form className="card trainer-test-form" onSubmit={publish}>
          <div className="trainer-test-form__header">
            <div>
              <span className="eyebrow">NEW ASSESSMENT</span>
              <h2>Create a test</h2>
              <p>Set the test details, then add questions in one batch.</p>
            </div>
            <span className="trainer-test-form__format-tag">
              {format === "mcq" ? "Multiple choice" : "PDF paper"}
            </span>
          </div>

          <div className="trainer-test-form__details">
            <label>
              Test name
              <input
                required
                placeholder="e.g. HTML & CSS — Module 2"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              Assessment format
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              >
                <option value="mcq">Multiple choice</option>
                <option value="pdf">PDF paper (trainer grades it)</option>
              </select>
            </label>
            <label className="trainer-test-form__instructions">
              Instructions <span>Optional</span>
              <textarea
                placeholder="Add timing, attempt rules, or guidance for students"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
              />
            </label>
            {format === "mcq" && (
              <label>
                Time limit (minutes)
                <input
                  type="number"
                  min="1"
                  max="720"
                  required
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                />
              </label>
            )}
          </div>

          {format === "mcq" ? (
            <section className="trainer-test-import" aria-labelledby="question-import-title">
              <div className="trainer-test-import__heading">
                <div>
                  <h3 id="question-import-title">Bulk question import</h3>
                  <p>Paste a formatted question set or load a plain text file.</p>
                </div>
                {questionsImported && (
                  <span className="trainer-test-import__count">
                    {questions.length} questions ready
                  </span>
                )}
              </div>

              <div className="trainer-test-import__tools">
                <label className="trainer-test-file-button">
                  Load .txt file
                  <input
                    type="file"
                    accept=".txt,text/plain"
                    onChange={(event) => readQuestionFile(event.target.files?.[0])}
                  />
                </label>
                <span>Start each question on a new line with 1. or Q1:. Blank lines are optional.</span>
              </div>

              <textarea
                className="trainer-test-bulk-input"
                aria-label="Paste multiple-choice questions"
                placeholder={"Q1: What does HTML stand for?\nA) HyperText Markup Language\nB) HighText Machine Language\nC) Hyperlink and Text Markup Language\nD) Home Tool Markup Language\nAnswer: A\n\nQ2: Which tag creates a hyperlink?\nA) <link>\nB) <a>\nC) <href>\nD) <url>\nAnswer: B"}
                value={bulkQuestions}
                onChange={(event) => {
                  setBulkQuestions(event.target.value);
                  setQuestionsImported(false);
                  setImportMessage("");
                  setImportErrors([]);
                }}
                rows={10}
                spellCheck="false"
              />

              <div className="trainer-test-import__footer">
                <div aria-live="polite">
                  {importMessage && <span className="trainer-test-import__success">{importMessage}</span>}
                  {importErrors.length > 0 && (
                    <ul className="trainer-test-import__errors">
                      {importErrors.map((error) => <li key={error}>{error}</li>)}
                    </ul>
                  )}
                </div>
                <button className="hero-btn" type="button" onClick={importQuestions}>
                  Import questions
                </button>
              </div>

              {questionsImported && (
                <div className="trainer-test-question-preview">
                  {questions.map((question, index) => (
                    <article key={`${index}-${question.prompt}`}>
                      <span>Q{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{question.prompt}</strong>
                        <ul>
                          {question.options.map((option, optionIndex) => (
                            <li className={optionIndex === question.answerIndex ? "is-correct" : ""} key={optionIndex}>
                              <b>{String.fromCharCode(65 + optionIndex)}</b>{option}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <div className="trainer-test-form__pdf-fields">
              <label>
                Total marks
                <input
                  type="number"
                  min="1"
                  required
                  value={totalMarks}
                  onChange={(event) => setTotalMarks(event.target.value)}
                />
              </label>
              <label>
                Question paper PDF
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                  onChange={(event) => setPaper(event.target.files?.[0] || null)}
                />
              </label>
            </div>
          )}

          <div className="trainer-test-form__actions">
            <span>{format === "mcq" ? "Review imported questions before publishing." : "PDF submissions will be graded manually."}</span>
            <button className="hero-btn" disabled={publishing || (format === "mcq" && !questionsImported)}>
              {publishing ? "Publishing…" : "Publish test"}
            </button>
          </div>
        </form>
        <section className="trainer-test-results">
          <div className="section-heading">
            <div>
              <h2>Student submissions and marks</h2>
              <p>
                MCQ is marked automatically. PDF answers need manual grading.
              </p>
            </div>
          </div>
          {results.tests.map((test) => (
            <article
              className="card card__pad trainer-test-result"
              key={test._id}
            >
              <h3>
                {test.title}{" "}
                <span className="pill">
                  {test.format === "mcq" ? "MCQ" : "PDF"}
                </span>
              </h3>
              <p>
                {test.format === "mcq"
                  ? `${test.totalMarks} marks · ${test.durationMinutes || 60} min`
                  : `${test.totalMarks} marks · ${results.attempts.filter((attempt) => attempt.test?._id === test._id).length} submissions`}
              </p>
              {test.format === "pdf" && (
                <Link
                  to="#"
                  onClick={async (event) => {
                    event.preventDefault();
                    downloadFile(
                      await getTestPaper(test._id),
                      `${test.title}.pdf`,
                    );
                  }}
                >
                  Open question paper
                </Link>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Score</th>
                      <th>Percent</th>
                      <th>Evaluation</th>
                      <th>Attempt status</th>
                      <th>Submission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.attempts
                      .filter((attempt) => attempt.test?._id === test._id)
                      .map((attempt) => (
                        <tr key={attempt._id}>
                          <td>
                            {attempt.student?.name}
                            <small>{attempt.student?.email}</small>
                          </td>
                          <td>
                            {attempt.isGraded
                              ? `${attempt.score}/${attempt.total}`
                              : "Pending"}
                          </td>
                          <td>
                            {attempt.percentage == null
                              ? "—"
                              : `${attempt.percentage}%`}
                          </td>
                          <td>
                            {attempt.isGraded
                              ? attempt.evaluation
                              : "Needs grading"}
                          </td>
                          <td>
                            {attempt.status === "in-progress"
                              ? "In progress"
                              : attempt.status === "eliminated"
                              ? "Eliminated"
                              : attempt.status === "time-expired"
                                ? "Time expired"
                                : "Submitted"}
                            {test.format === "mcq" && (
                              <small>
                                {attempt.warningCount || 0}/3 warnings · {attempt.unansweredCount || 0} unanswered
                              </small>
                            )}
                          </td>
                          <td>
                            {test.format === "pdf" && (
                              <>
                                <button
                                  type="button"
                                  className="chip"
                                  onClick={async () =>
                                    downloadFile(
                                      await getTestAnswer(attempt._id),
                                      attempt.responseName,
                                    )
                                  }
                                >
                                  Open answer
                                </button>
                                {!attempt.isGraded && (
                                  <div className="trainer-grade-form">
                                    <input
                                      type="number"
                                      min="0"
                                      max={test.totalMarks}
                                      placeholder={`/${test.totalMarks}`}
                                      value={grades[attempt._id]?.score ?? ""}
                                      onChange={(event) =>
                                        setGrades((current) => ({
                                          ...current,
                                          [attempt._id]: {
                                            ...current[attempt._id],
                                            score: event.target.value,
                                          },
                                        }))
                                      }
                                    />
                                    <input
                                      placeholder="Feedback"
                                      value={
                                        grades[attempt._id]?.feedback || ""
                                      }
                                      onChange={(event) =>
                                        setGrades((current) => ({
                                          ...current,
                                          [attempt._id]: {
                                            ...current[attempt._id],
                                            feedback: event.target.value,
                                          },
                                        }))
                                      }
                                    />
                                    <button
                                      type="button"
                                      className="chip"
                                      onClick={() => grade(attempt)}
                                    >
                                      Save grade
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
