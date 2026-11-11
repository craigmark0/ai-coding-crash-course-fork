import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import {
  CourseSuggestionKind,
  CourseSuggestionStatus,
  UserRole,
} from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

import { getActiveSuggestions } from "~/services/courseSuggestionService";

function insertSuggestion(
  overrides: Partial<typeof schema.courseSuggestions.$inferInsert> = {}
) {
  return testDb
    .insert(schema.courseSuggestions)
    .values({
      instructorId: base.instructor.id,
      kind: CourseSuggestionKind.Series,
      status: CourseSuggestionStatus.Active,
      title: "Suggested Course",
      description: "A suggested course",
      salesCopy: "## Suggested\n\nSales copy.",
      categoryId: base.category.id,
      outline: { modules: [{ title: "Module 1", lessons: ["Lesson 1"] }] },
      prepGuide: "## Prerequisites\n\n- Something",
      ...overrides,
    })
    .returning()
    .get();
}

beforeEach(() => {
  testDb = createTestDb();
  base = seedBaseData(testDb);
});

describe("getActiveSuggestions", () => {
  it("returns only the instructor's active suggestions", () => {
    insertSuggestion({ title: "Active Series" });
    insertSuggestion({
      title: "Active Adjacent",
      kind: CourseSuggestionKind.Adjacent,
    });
    insertSuggestion({
      title: "Dismissed",
      status: CourseSuggestionStatus.Dismissed,
    });
    insertSuggestion({
      title: "Started",
      status: CourseSuggestionStatus.Started,
    });

    const titles = getActiveSuggestions(base.instructor.id).map((s) => s.title);

    expect(titles.sort()).toEqual(["Active Adjacent", "Active Series"]);
  });

  it("excludes other instructors' suggestions", () => {
    const otherInstructor = testDb
      .insert(schema.users)
      .values({
        name: "Other Instructor",
        email: "other@example.com",
        role: UserRole.Instructor,
      })
      .returning()
      .get();
    insertSuggestion({ title: "Mine" });
    insertSuggestion({ title: "Theirs", instructorId: otherInstructor.id });

    const titles = getActiveSuggestions(base.instructor.id).map((s) => s.title);

    expect(titles).toEqual(["Mine"]);
  });

  it("returns an empty list for an instructor with no suggestions", () => {
    expect(getActiveSuggestions(base.instructor.id)).toEqual([]);
  });
});
