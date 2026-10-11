import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Download } from "lucide-react";
import AppShell from "../components/AppShell";
import {
  getBatchTests,
  getTestPaper,
  saveTestAttemptProgress,
  startTestAttempt,
  submitTestAttempt,
} from "../api/tests";

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return [
    hours ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "",
    remainingMinutes ? `${remainingMinutes} min` : "",
  ].filter(Boolean).join(" ");
}

function formatCountdown(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const clock = `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  return hours ? `${hours}:${clock}` : clock;
}

function saveBlob(file, filename) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function BatchTests() {
  const { batchId } = useParams();
  const [tests, setTests] = useState([]);
  const [answers, setAnswers] = useState({});
  const [answerFiles, setAnswerFiles] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingTestId, setSubmittingTestId] = useState(null);
  const [activeTestId, setActiveTestIdState] = useState(null);
  const [clockNow, setClockNow] = useState(0);
  const answersRef = useRef({});
  const testsRef = useRef([]);
  const activeTestIdRef = useRef(null);
  const progressQueueRef = useRef(Promise.resolve());


  function changeActiveTest(testId) {
    activeTestIdRef.current = testId;
    setActiveTestIdState(testId);
  }

  async function load() {
    try {
      const response = await getBatchTests(batchId);
      const nextTests = response.data || [];
      testsRef.current = nextTests;
      setTests(nextTests);
      const activeTest = nextTests.find((test) => test.attempt?.status === "in-progress");
      if (activeTest) {
        const nextAnswers = {
          ...answersRef.current,
          [activeTest._id]: activeTest.attempt.answers || [],
        };
        answersRef.current = nextAnswers;
        setAnswers(nextAnswers);
        changeActiveTest(activeTest._id);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not load tests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [batchId]);

  function updateAttempt(testId, attempt) {
    const nextTests = testsRef.current.map((test) =>
      test._id === testId ? { ...test, attempt } : test,
    );
    testsRef.current = nextTests;
    setTests(nextTests);
  }

  function closeActiveAttempt(testId, attempt, resultMessage) {
    updateAttempt(testId, attempt);
    if (activeTestIdRef.current === testId) {
      changeActiveTest(null);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }
    setMessage(resultMessage);
  }

  function queueProgress(testId, nextAnswers, warning = false) {
    const operation = progressQueueRef.current
      .catch(() => {})
      .then(async () => {
        const test = testsRef.current.find((item) => item._id === testId);
        const attempt = test?.attempt;
        if (!attempt || attempt.status !== "in-progress") return null;
        const response = await saveTestAttemptProgress(
          testId,
          attempt._id,
          nextAnswers,
          warning,
        );
        const updatedAttempt = response.data;
        updateAttempt(testId, updatedAttempt);
        if (updatedAttempt.status === "eliminated") {
          closeActiveAttempt(testId, updatedAttempt, "Eliminated after 3 warnings. Your answers so far have been scored.");
        } else if (updatedAttempt.status === "time-expired") {
          closeActiveAttempt(testId, updatedAttempt, "Time is up. Your answers so far have been submitted and scored.");
        } else if (warning) {
          setMessage(`Warning ${updatedAttempt.warningCount} of 3: stay on the exam screen.`);
        }
        return updatedAttempt;
      });
    progressQueueRef.current = operation;
    return operation;
  }

  async function beginAttempt(test) {
    setSubmittingTestId(test._id);
    setMessage("");
    const fullscreenRequest = document.documentElement.requestFullscreen?.().catch(() => null);
    try {
      const response = await startTestAttempt(test._id);
      const attempt = response.data;
      updateAttempt(test._id, attempt);
      const nextAnswers = { ...answersRef.current, [test._id]: attempt.answers || [] };
      answersRef.current = nextAnswers;
      setAnswers(nextAnswers);
      changeActiveTest(test._id);
      setClockNow(Date.now());
      await fullscreenRequest;
    } catch (error) {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      setMessage(error.response?.data?.message || "Could not start test");
    } finally {
      setSubmittingTestId(null);
    }
  }

  async function submit(test) {
    setSubmittingTestId(test._id);
    try {
      let submission;
      if (test.format === "pdf") {
        submission = new FormData();
        if (answerFiles[test._id]) {
          submission.append("answer", answerFiles[test._id]);
        }
      } else {
        await progressQueueRef.current.catch(() => {});
        submission = {
          answers: answersRef.current[test._id] || test.attempt?.answers || [],
        };
      }

      const response = await submitTestAttempt(test._id, submission);
      if (test.format === "mcq") {
        closeActiveAttempt(test._id, response.data, "Answers submitted. Your result is shown below.");
      } else {
        setMessage("PDF submitted. Marks will appear after trainer evaluation.");
      }
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not submit test");
    } finally {
      setSubmittingTestId(null);
    }
  }

  const activeTest = tests.find((test) => test._id === activeTestId);
  const activeAttempt = activeTest?.attempt;
  const deadline = activeAttempt?.startedAt
    ? new Date(activeAttempt.startedAt).getTime() + (activeTest.durationMinutes || 60) * 60_000
    : 0;
  const secondsRemaining = Math.max(0, Math.ceil((deadline - clockNow) / 1000));

  useEffect(() => {
    if (!activeTestId) return undefined;
    const attemptTest = testsRef.current.find((test) => test._id === activeTestId);
    const attempt = attemptTest?.attempt;
    if (!attempt || attempt.status !== "in-progress") return undefined;
    const attemptDeadline = new Date(attempt.startedAt).getTime() + (attemptTest.durationMinutes || 60) * 60_000;
    let lastViolationAt = 0;
    let warningPending = false;
    let timeSubmitted = false;
    let fullscreenWasEntered = Boolean(document.fullscreenElement);

    function reportViolation() {
      const now = Date.now();
      if (warningPending || now - lastViolationAt < 350) return;
      warningPending = true;
      lastViolationAt = now;
      const currentAnswers = answersRef.current[activeTestId] || [];
      queueProgress(activeTestId, currentAnswers, true)
        .catch((error) => setMessage(error.response?.data?.message || "Could not record exam warning"))
        .finally(() => {
          warningPending = false;
        });
    }

    function onVisibilityChange() {
      if (document.hidden) reportViolation();
    }

    function onFullscreenChange() {
      if (document.fullscreenElement) fullscreenWasEntered = true;
      else if (fullscreenWasEntered) reportViolation();
    }

    function updateClock() {
      const now = Date.now();
      setClockNow(now);
      if (!timeSubmitted && now >= attemptDeadline) {
        timeSubmitted = true;
        queueProgress(
          activeTestId,
          answersRef.current[activeTestId] || [],
        ).catch((error) => setMessage(error.response?.data?.message || "Could not submit expired test"));
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("blur", reportViolation);
    const timer = window.setInterval(updateClock, 1000);
    updateClock();
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("blur", reportViolation);
      window.clearInterval(timer);
    };
  }, [activeTestId]);

  return (
    <AppShell>
      <main className="page batch-tests-page">
        <Link className="back-link" to={`/my-batch/${batchId}`}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to batch
        </Link>

        <header className="page__head">
          <div>
            <span className="eyebrow">ASSESSMENTS</span>
            <h1>Batch tests</h1>
            <p>
              Attempt each test once. MCQ tests are marked automatically; PDF
              papers are checked by your trainer.
            </p>
          </div>
        </header>

        {message && <div className="banner batch-tests-message">{message}</div>}

        {loading ? (
          <div className="card card__pad empty-state">Loading tests…</div>
        ) : !tests.length ? (
          <div className="card card__pad empty-state">
            No tests have been published for this batch yet.
          </div>
        ) : (
          <div className="batch-test-list">
            {tests.filter((test) => !activeTestId || test._id === activeTestId).map((test) => (
              <section className="card batch-test-card" key={test._id}>
                <header className="batch-test-card__header">
                  <div>
                    <span className="eyebrow">{test.format === "mcq" ? "MULTIPLE CHOICE" : "WRITTEN PAPER"}</span>
                    <h2>{test.title}</h2>
                    {test.description && <p>{test.description}</p>}
                  </div>
                  <span className={`batch-test-format batch-test-format--${test.format}`}>
                    {test.format === "mcq" ? "MCQ" : "PDF"}
                  </span>
                </header>

                {test.format === "pdf" && (
                  <div className="pdf-test-actions">
                    <button
                      type="button"
                      className="chip"
                      onClick={async () =>
                        saveBlob(await getTestPaper(test._id), `${test.title}-paper.pdf`)
                      }
                    >
                      <Download size={15} aria-hidden="true" /> Download question paper
                    </button>
                    {test.attempt ? (
                      <p>
                        {test.attempt.isGraded
                          ? `Result: ${test.attempt.score}/${test.attempt.total} · ${test.attempt.percentage}% · ${test.attempt.evaluation}`
                          : "Submission awaiting trainer evaluation"}
                      </p>
                    ) : (
                      <>
                        <label className="batch-test-upload">
                          Upload your answer PDF
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={(event) =>
                              setAnswerFiles((current) => ({
                                ...current,
                                [test._id]: event.target.files?.[0],
                              }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="hero-btn"
                          disabled={!answerFiles[test._id] || submittingTestId === test._id}
                          onClick={() => submit(test)}
                        >
                          {submittingTestId === test._id ? "Submitting…" : "Submit PDF"}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {test.format === "mcq" && (
                  <p className="batch-test-time-limit">
                    Time limit: {formatDuration(test.durationMinutes || 60)}
                  </p>
                )}

                {test.format === "mcq" && test.attempt?.status !== "in-progress" && test.attempt ? (
                    <div className="test-result-summary">
                      <div className="test-result-summary__metric">
                        <strong>{test.attempt.score}/{test.attempt.total}</strong>
                        <span>Score</span>
                      </div>
                      <div className="test-result-summary__metric">
                        <strong>{test.attempt.percentage}%</strong>
                        <span>Overall result</span>
                      </div>
                      <div className="test-result-summary__metric">
                        <strong>{test.attempt.evaluation}</strong>
                        <span>Evaluation</span>
                      </div>
                      <div className="test-result-summary__counts">
                        <span><CheckCircle2 size={16} aria-hidden="true" /> {test.attempt.correctCount} correct</span>
                        <span>{test.attempt.wrongCount} incorrect</span>
                        <span>{test.attempt.unansweredCount || 0} unanswered</span>
                      </div>
                      <p>
                        {test.attempt.status === "eliminated"
                          ? `Eliminated after ${test.attempt.warningCount} warnings`
                          : test.attempt.status === "time-expired"
                            ? "Time expired"
                            : "Submitted"}
                      </p>
                    </div>
                ) : test.format === "mcq" ? (
                    <>
                      {test.attempt?.status === "in-progress" ? (
                        <>
                          <div className="test-result-summary__metric" aria-live="polite">
                            <strong>Time remaining: {formatCountdown(secondsRemaining)}</strong>
                            <span>Warnings: {test.attempt.warningCount || 0}/3</span>
                          </div>
                          <div className="test-question-list">
                            {test.questions.map((question, questionIndex) => (
                              <fieldset key={questionIndex}>
                                <legend>{questionIndex + 1}. {question.prompt}</legend>
                                {question.options.map((option, optionIndex) => (
                                  <label key={optionIndex}>
                                    <input
                                      type="radio"
                                      name={`${test._id}-${questionIndex}`}
                                      checked={answers[test._id]?.[questionIndex] === optionIndex}
                                      onChange={() => {
                                        const currentAnswers = answersRef.current[test._id] || test.attempt.answers || [];
                                        const nextAnswers = Array.from(
                                          { length: test.questions.length },
                                          (_, index) => index === questionIndex ? optionIndex : currentAnswers[index] ?? null,
                                        );
                                        const nextState = { ...answersRef.current, [test._id]: nextAnswers };
                                        answersRef.current = nextState;
                                        setAnswers(nextState);
                                        queueProgress(test._id, nextAnswers).catch((error) =>
                                          setMessage(error.response?.data?.message || "Could not save your answer"),
                                        );
                                      }}
                                    />
                                    {option}
                                  </label>
                                ))}
                              </fieldset>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="hero-btn"
                            disabled={submittingTestId === test._id}
                            onClick={() => submit(test)}
                          >
                            {submittingTestId === test._id ? "Submitting…" : "Submit answers"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="hero-btn"
                          disabled={Boolean(activeTestId) || submittingTestId === test._id}
                          onClick={() => beginAttempt(test)}
                        >
                          {submittingTestId === test._id ? "Starting…" : "Start test"}
                        </button>
                      )}
                    </>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
