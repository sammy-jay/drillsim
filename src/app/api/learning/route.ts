import type { Collection } from "mongodb";
import { ALL_LESSON_IDS } from "@/lib/learning";
import { getLearningDatabase } from "@/lib/mongodb";

type LearningProgress = {
  completedLessonIds: string[];
  passedLessonIds: string[];
};

type LearningProgressDocument = {
  _id: string;
  progress: LearningProgress;
  createdAt: Date;
  updatedAt: Date;
};

const EMPTY_PROGRESS: LearningProgress = {
  completedLessonIds: [],
  passedLessonIds: [],
};

const validLessonIds = new Set(ALL_LESSON_IDS);
const learnerIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseLearnerId(value: string | null) {
  return value && learnerIdPattern.test(value) ? value : null;
}

function parseProgress(value: unknown): LearningProgress | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const validIds = (ids: unknown): ids is string[] =>
    Array.isArray(ids) && ids.length <= ALL_LESSON_IDS.length && ids.every(
      (id): id is string => typeof id === "string" && validLessonIds.has(id),
    );

  if (!validIds(candidate.completedLessonIds) || !validIds(candidate.passedLessonIds)) return null;
  return {
    completedLessonIds: [...new Set(candidate.completedLessonIds)],
    passedLessonIds: [...new Set(candidate.passedLessonIds)],
  };
}

function collection() {
  return getLearningDatabase().then((database) =>
    database.collection<LearningProgressDocument>("learningProgress"),
  );
}

export async function GET(request: Request) {
  if (!process.env.MONGODB_URI) {
    return Response.json({ enabled: false, progress: null });
  }

  const learnerId = parseLearnerId(new URL(request.url).searchParams.get("learnerId"));
  if (!learnerId) return Response.json({ error: "Invalid learner ID." }, { status: 400 });

  try {
    const records: Collection<LearningProgressDocument> = await collection();
    const record = await records.findOne({ _id: learnerId });
    return Response.json({ enabled: true, progress: record?.progress ?? EMPTY_PROGRESS });
  } catch {
    return Response.json({ error: "Learning progress is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!process.env.MONGODB_URI) {
    return Response.json({ enabled: false }, { status: 200 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const learnerId = typeof body.learnerId === "string" ? parseLearnerId(body.learnerId) : null;
  const progress = parseProgress(body.progress);
  if (!learnerId || !progress) return Response.json({ error: "Invalid learning progress." }, { status: 400 });

  try {
    const records = await collection();
    const now = new Date();
    await records.updateOne(
      { _id: learnerId },
      {
        $set: { updatedAt: now },
        $setOnInsert: { createdAt: now },
        $addToSet: {
          "progress.completedLessonIds": { $each: progress.completedLessonIds },
          "progress.passedLessonIds": { $each: progress.passedLessonIds },
        },
      },
      { upsert: true },
    );
    return Response.json({ enabled: true });
  } catch {
    return Response.json({ error: "Learning progress could not be saved." }, { status: 503 });
  }
}