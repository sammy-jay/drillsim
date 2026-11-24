"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  RotateCcw,
  Search,
  Target,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocalStore } from "@/lib/localStore";
import { ALL_LESSON_IDS, LEARNING_COURSES } from "@/lib/learning";
import { NavIcon } from "@/components/shell/NavIcon";

type LearningProgress = {
  completedLessonIds: string[];
  passedLessonIds: string[];
};

const EMPTY_PROGRESS: LearningProgress = {
  completedLessonIds: [],
  passedLessonIds: [],
};

const TABS = [
  { id: "lesson", label: "Lesson", icon: BookOpen },
  { id: "check", label: "Knowledge check", icon: Target },
] as const;

export function LearningCenter() {
  const [progress, setProgress] = useLocalStore<LearningProgress>("drillsim-learning-v1", EMPTY_PROGRESS);
  const learnerIdRef = useRef("");
  const [mongoEnabled, setMongoEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"checking" | "local" | "syncing" | "synced" | "offline">("checking");
  const [selectedCourseId, setSelectedCourseId] = useState(LEARNING_COURSES[0]?.id ?? "");
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("lesson");
  const [query, setQuery] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    let id: string;
    try {
      id = window.localStorage.getItem("drillsim-learner-id-v1") ?? window.crypto.randomUUID();
      window.localStorage.setItem("drillsim-learner-id-v1", id);
    } catch {
      id = window.crypto.randomUUID();
    }
    learnerIdRef.current = id;

    fetch(`/api/learning?learnerId=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Progress sync unavailable.");
        return response.json() as Promise<{ enabled: boolean; progress: LearningProgress | null }>;
      })
      .then((result) => {
        if (!active) return;
        if (!result.enabled) {
          setSyncStatus("local");
          return;
        }
        setMongoEnabled(true);
        setProgress((current) => ({
          completedLessonIds: [...new Set([...current.completedLessonIds, ...(result.progress?.completedLessonIds ?? [])])],
          passedLessonIds: [...new Set([...current.passedLessonIds, ...(result.progress?.passedLessonIds ?? [])])],
        }));
        setSyncStatus("syncing");
      })
      .catch(() => {
        if (active) setSyncStatus("offline");
      });

    return () => {
      active = false;
    };
  }, [setProgress]);

  useEffect(() => {
    if (!mongoEnabled || !learnerIdRef.current) return;
    const timer = setTimeout(() => {
      setSyncStatus("syncing");
      fetch("/api/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerId: learnerIdRef.current, progress }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Progress sync unavailable.");
          setSyncStatus("synced");
        })
        .catch(() => setSyncStatus("offline"));
    }, 350);

    return () => clearTimeout(timer);
  }, [mongoEnabled, progress]);

  const course = LEARNING_COURSES.find((item) => item.id === selectedCourseId) ?? LEARNING_COURSES[0];
  if (!course) return null;

  const lesson = course.lessons[selectedLessonIndex];
  const lessonId = `${course.id}:${selectedLessonIndex}`;
  const lessonCompleted = progress.completedLessonIds.includes(lessonId);
  const lessonPassed = progress.passedLessonIds.includes(lessonId);
  const completedCount = progress.completedLessonIds.length;
  const overallProgress = Math.round((completedCount / ALL_LESSON_IDS.length) * 100);
  const courseCompleted = course.lessons.filter((_, index) =>
    progress.completedLessonIds.includes(`${course.id}:${index}`),
  ).length;
  const courseProgress = Math.round((courseCompleted / course.lessons.length) * 100);
  const filteredCourses = LEARNING_COURSES.filter((item) =>
    `${item.title} ${item.group} ${item.description} ${item.tags.join(" ")} ${item.sources.join(" ")}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  function selectCourse(courseId: string) {
    setSelectedCourseId(courseId);
    setSelectedLessonIndex(0);
    setActiveTab("lesson");
    setSelectedAnswer(null);
    setSubmitted(false);
  }

  function selectLesson(index: number) {
    setSelectedLessonIndex(index);
    setActiveTab("lesson");
    setSelectedAnswer(null);
    setSubmitted(false);
  }

  function markComplete() {
    setProgress((current) => ({
      ...current,
      completedLessonIds: current.completedLessonIds.includes(lessonId)
        ? current.completedLessonIds
        : [...current.completedLessonIds, lessonId],
    }));
  }

  function submitAnswer() {
    if (selectedAnswer === null) return;
    setSubmitted(true);
    if (selectedAnswer === lesson.answer) {
      setProgress((current) => ({
        ...current,
        passedLessonIds: current.passedLessonIds.includes(lessonId)
          ? current.passedLessonIds
          : [...current.passedLessonIds, lessonId],
      }));
    }
  }

  function continueLearning() {
    if (selectedLessonIndex < course.lessons.length - 1) {
      selectLesson(selectedLessonIndex + 1);
      return;
    }
    const nextCourse = LEARNING_COURSES[(LEARNING_COURSES.findIndex((item) => item.id === course.id) + 1) % LEARNING_COURSES.length];
    selectCourse(nextCourse.id);
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-xl border border-line bg-panel shadow-[var(--shadow-panel)]">
        <div className="border-b border-line p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-ink">Your curriculum</p>
              <p className="mt-0.5 text-[11.5px] text-ink-3">{LEARNING_COURSES.length} guided tracks</p>
            </div>
            <div className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
              <GraduationCap size={18} />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-ink-3">
            <span>Overall progress</span>
            <span className="num font-medium text-ink-2">{completedCount}/{ALL_LESSON_IDS.length}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-3" aria-label={`${overallProgress}% overall complete`}>
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
        <label className="relative block border-b border-line px-3 py-3">
          <Search size={15} className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a learning track"
            className="h-9 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-[12px] text-ink outline-none placeholder:text-ink-3 focus:border-accent-line"
          />
        </label>
        <div className="scroll-thin max-h-[460px] overflow-y-auto p-2">
          {filteredCourses.length ? filteredCourses.map((item) => {
            const done = item.lessons.filter((_, index) => progress.completedLessonIds.includes(`${item.id}:${index}`)).length;
            const active = course.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectCourse(item.id)}
                aria-pressed={active}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${active ? "bg-accent-soft" : "hover:bg-panel-2"}`}
              >
                <NavIcon name={item.icon} size={16} className={active ? "shrink-0 text-accent" : "shrink-0 text-ink-3 group-hover:text-ink-2"} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[12px] ${active ? "font-semibold text-ink" : "font-medium text-ink-2"}`}>{item.title}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[10.5px] text-ink-3">
                    <span>{item.lessons.length} lessons</span>
                    <span aria-hidden="true">·</span>
                    <span>{done}/{item.lessons.length} complete</span>
                  </span>
                </span>
                {done === item.lessons.length && <CheckCircle2 size={15} className="shrink-0 text-good-ink" />}
              </button>
            );
          }) : (
            <p className="px-3 py-8 text-center text-[12px] text-ink-3">No tracks match that search.</p>
          )}
        </div>
        <div className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-ink-3" aria-live="polite">
          {syncStatus === "checking" && "Checking progress storage..."}
          {syncStatus === "local" && "Progress is saved on this device."}
          {syncStatus === "syncing" && "Syncing progress to MongoDB..."}
          {syncStatus === "synced" && "Progress synced to MongoDB and saved on this device."}
          {syncStatus === "offline" && "MongoDB is unavailable. Progress remains saved on this device."}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-accent">
              <span>{course.group}</span>
              <span className="text-ink-3">/</span>
              <span>{course.level}</span>
            </div>
            <h2 className="text-[21px] font-semibold leading-tight text-ink sm:text-[24px]">{course.title}</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-2">{course.description}</p>
          </div>
          <Link
            href={course.href}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-line bg-panel px-3 text-[12px] font-medium text-ink-2 transition hover:border-accent-line hover:text-ink"
          >
            Practice in module <ArrowUpRight size={14} />
          </Link>
        </div>

        {course.sources.length > 0 && (
          <div className="mb-4 border-l-2 border-series-1/50 py-1 pl-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">Source references</p>
            <ul className="mt-1 flex flex-col gap-1">
              {course.sources.map((source) => (
                <li key={source} className="text-[10.5px] leading-relaxed text-ink-3">{source}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3">
            <Clock3 size={16} className="text-accent" />
            <div><p className="text-[10.5px] text-ink-3">Estimated time</p><p className="mt-0.5 text-[12px] font-medium text-ink">{course.minutes} min</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3">
            <BookOpen size={16} className="text-series-1" />
            <div><p className="text-[10.5px] text-ink-3">Lessons</p><p className="mt-0.5 text-[12px] font-medium text-ink">{course.lessons.length} concepts</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3">
            <CheckCircle2 size={16} className="text-good-ink" />
            <div><p className="text-[10.5px] text-ink-3">Track progress</p><p className="mt-0.5 text-[12px] font-medium text-ink">{courseProgress}% complete</p></div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label={`${course.title} lessons`} className="rounded-xl border border-line bg-panel p-3">
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">In this track</p>
            <ol className="flex flex-col gap-1">
              {course.lessons.map((item, index) => {
                const id = `${course.id}:${index}`;
                const isCurrent = selectedLessonIndex === index;
                const isDone = progress.completedLessonIds.includes(id);
                return (
                  <li key={item.title}>
                    <button
                      type="button"
                      onClick={() => selectLesson(index)}
                      aria-current={isCurrent ? "step" : undefined}
                      className={`flex w-full items-start gap-2.5 rounded-md px-2.5 py-2.5 text-left ${isCurrent ? "bg-panel-2" : "hover:bg-panel-2/70"}`}
                    >
                      <span className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border text-[9px] font-semibold ${isDone ? "border-good-ink bg-good-ink text-white" : isCurrent ? "border-accent bg-accent text-accent-ink" : "border-line-strong text-ink-3"}`}>
                        {isDone ? <Check size={11} /> : index + 1}
                      </span>
                      <span className={`text-[11.5px] leading-snug ${isCurrent ? "font-semibold text-ink" : "text-ink-2"}`}>{item.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 border-t border-line pt-3">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">By the end, you can</p>
              <ul className="mt-2 flex flex-col gap-2 px-2">
                {course.outcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-2 text-[10.5px] leading-snug text-ink-2">
                    <Check size={12} className="mt-0.5 shrink-0 text-accent" />{outcome}
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <article className="min-w-0 overflow-hidden rounded-xl border border-line bg-panel shadow-[var(--shadow-panel)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 sm:px-6">
              <div className="flex gap-1" role="tablist" aria-label="Learning activity">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === id}
                    onClick={() => { setActiveTab(id); setSelectedAnswer(null); setSubmitted(false); }}
                    className={`inline-flex items-center gap-2 border-b-2 px-3 py-3.5 text-[12px] font-medium transition ${activeTab === id ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink-2"}`}
                  >
                    <Icon size={14} />{label}
                    {id === "check" && lessonPassed && <CheckCircle2 size={13} className="text-good-ink" />}
                  </button>
                ))}
              </div>
              <span className="px-1 text-[10.5px] text-ink-3">Lesson {selectedLessonIndex + 1} of {course.lessons.length}</span>
            </div>

            {activeTab === "lesson" ? (
              <div className="px-5 py-5 sm:px-7 sm:py-7">
                <div className="mb-5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-accent">
                  <span className="grid size-6 place-items-center rounded-md bg-accent-soft"><BookOpen size={13} /></span>
                  Core concept
                </div>
                <h3 className="text-[22px] font-semibold leading-tight text-ink sm:text-[26px]">{lesson.title}</h3>
                <p className="mt-4 max-w-3xl text-[14px] leading-[1.8] text-ink-2">{lesson.concept}</p>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <section className="rounded-lg border border-line bg-canvas p-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">Model / relationship</p>
                    <p className="font-mono text-[12px] leading-relaxed text-ink">{lesson.equation}</p>
                  </section>
                  <section className="rounded-lg border border-series-1/20 bg-series-1/5 p-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-series-1">At the rig</p>
                    <p className="text-[12px] leading-relaxed text-ink-2">{lesson.fieldExample}</p>
                  </section>
                </div>

                <div className="mt-5 border-l-[3px] border-accent pl-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">Keep in mind</p>
                  <p className="mt-1 text-[13px] font-medium leading-relaxed text-ink">{lesson.takeaway}</p>
                </div>

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                  <button
                    type="button"
                    onClick={() => setActiveTab("check")}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-[12px] font-medium text-panel transition hover:opacity-85"
                  >
                    Check understanding <ChevronRight size={14} />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={markComplete}
                      disabled={lessonCompleted}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-[11.5px] font-medium text-ink-2 transition hover:border-good-ink hover:text-good-ink disabled:cursor-default disabled:border-good-ink/30 disabled:text-good-ink"
                    >
                      <Check size={14} />{lessonCompleted ? "Completed" : "Mark complete"}
                    </button>
                    <button
                      type="button"
                      onClick={continueLearning}
                      aria-label={selectedLessonIndex < course.lessons.length - 1 ? "Next lesson" : "Next learning track"}
                      title={selectedLessonIndex < course.lessons.length - 1 ? "Next lesson" : "Next learning track"}
                      className="grid size-9 place-items-center rounded-md border border-line text-ink-2 transition hover:bg-panel-2"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 py-5 sm:px-7 sm:py-7">
                <div className="mb-5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-series-1">
                  <span className="grid size-6 place-items-center rounded-md bg-series-1/10"><Target size={13} /></span>
                  Apply what you learned
                </div>
                <h3 className="text-[20px] font-semibold leading-tight text-ink">Knowledge check</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">Choose the best answer. You can revisit the lesson whenever you need to.</p>
                <fieldset className="mt-6">
                  <legend className="text-[15px] font-medium leading-relaxed text-ink">{lesson.question}</legend>
                  <div className="mt-4 flex flex-col gap-2">
                    {lesson.options.map((option, index) => {
                      const correct = submitted && index === lesson.answer;
                      const incorrect = submitted && index === selectedAnswer && index !== lesson.answer;
                      const selected = selectedAnswer === index;
                      return (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-[12.5px] leading-relaxed transition ${correct ? "border-good-ink/50 bg-good-ink/5" : incorrect ? "border-critical/50 bg-critical/5" : selected ? "border-accent-line bg-accent-soft" : "border-line hover:bg-panel-2"} ${submitted ? "cursor-default" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`answer-${lessonId}`}
                            value={index}
                            checked={selected}
                            disabled={submitted}
                            onChange={() => setSelectedAnswer(index)}
                            className="mt-0.5 accent-[var(--accent)]"
                          />
                          <span className="flex-1 text-ink-2">{option}</span>
                          {correct && <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-good-ink" />}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                {submitted && (
                  <div role="status" className={`mt-4 rounded-lg border p-4 ${selectedAnswer === lesson.answer ? "border-good-ink/30 bg-good-ink/5" : "border-warning/30 bg-warning/5"}`}>
                    <p className={`text-[12px] font-semibold ${selectedAnswer === lesson.answer ? "text-good-ink" : "text-warning-ink"}`}>
                      {selectedAnswer === lesson.answer ? "That’s right." : "Not quite. Review the explanation and try the next lesson."}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{lesson.explanation}</p>
                  </div>
                )}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
                  <button type="button" onClick={() => setActiveTab("lesson")} className="inline-flex h-9 items-center gap-2 text-[12px] font-medium text-ink-2 hover:text-ink">
                    <ChevronLeft size={14} /> Back to lesson
                  </button>
                  {submitted ? (
                    <button type="button" onClick={() => { setSelectedAnswer(null); setSubmitted(false); }} className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-[11.5px] font-medium text-ink-2 hover:bg-panel-2">
                      <RotateCcw size={13} /> Try again
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={submitAnswer}
                      disabled={selectedAnswer === null}
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3.5 text-[12px] font-medium text-panel transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Check answer <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}