import { and, asc, eq } from "drizzle-orm";
import { db } from "~/db";
import { courseSuggestions, CourseSuggestionStatus } from "~/db/schema";

// ─── Course Suggestion Service ───
// Suggested future courses for an instructor, built from their published
// courses. Uses positional parameters (project convention).

export function getActiveSuggestions(instructorId: number) {
  return db
    .select()
    .from(courseSuggestions)
    .where(
      and(
        eq(courseSuggestions.instructorId, instructorId),
        eq(courseSuggestions.status, CourseSuggestionStatus.Active)
      )
    )
    .orderBy(asc(courseSuggestions.createdAt), asc(courseSuggestions.id))
    .all();
}
