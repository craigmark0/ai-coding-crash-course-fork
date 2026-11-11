import { Link, useFetcher } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/instructor";
import { getCoursesByInstructor, getLessonCountForCourse } from "~/services/courseService";
import { getEnrollmentCountForCourse } from "~/services/enrollmentService";
import { requireInstructor } from "~/lib/access.server";
import {
  dismissSuggestion,
  getActiveSuggestions,
} from "~/services/courseSuggestionService";
import { parseFormData } from "~/lib/validation";
import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { AlertTriangle, BookOpen, GraduationCap, Lightbulb, Plus, Users, X } from "lucide-react";
import { CourseImage } from "~/components/course-image";
import { data, isRouteErrorResponse } from "react-router";
import { CourseStatus, CourseSuggestionKind } from "~/db/schema";

export function meta() {
  return [
    { title: "My Courses — Cadence" },
    { name: "description", content: "Manage your courses" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { userId: currentUserId } = await requireInstructor(request);

  const instructorCourses = getCoursesByInstructor(currentUserId);

  const coursesWithStats = instructorCourses.map((course) => {
    const lessonCount = getLessonCountForCourse(course.id);
    const enrollmentCount = getEnrollmentCountForCourse(course.id);

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      status: course.status,
      coverImageUrl: course.coverImageUrl,
      lessonCount,
      enrollmentCount,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  });

  // Suggestions are built from the instructor's published courses, so an
  // instructor with none sees no suggestions section at all.
  const hasPublishedCourse = instructorCourses.some(
    (course) => course.status === CourseStatus.Published
  );
  const suggestions = hasPublishedCourse
    ? getActiveSuggestions(currentUserId).map((suggestion) => ({
        id: suggestion.id,
        kind: suggestion.kind,
        title: suggestion.title,
        teaser: suggestion.description,
      }))
    : [];

  return { courses: coursesWithStats, suggestions };
}

const dismissSuggestionSchema = z.object({
  intent: z.literal("dismiss-suggestion"),
  suggestionId: z.coerce.number().int(),
});

export async function action({ request }: Route.ActionArgs) {
  const { userId: currentUserId } = await requireInstructor(request);

  const formData = await request.formData();
  const parsed = parseFormData(formData, dismissSuggestionSchema);

  if (!parsed.success) {
    return data(
      { error: Object.values(parsed.errors)[0] ?? "Invalid input." },
      { status: 400 }
    );
  }

  // Dismissing only removes the suggestion; no replacement is generated.
  const dismissed = dismissSuggestion(parsed.data.suggestionId, currentUserId);
  if (!dismissed) {
    // Returned, not thrown: the card reappears instead of the page erroring.
    return data({ error: "Suggestion not found." }, { status: 404 });
  }
  return { success: true };
}

function suggestionKindBadge(kind: CourseSuggestionKind) {
  return kind === CourseSuggestionKind.Series ? (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
      Series
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
      Adjacent
    </span>
  );
}

function SuggestionCard({
  suggestion,
}: {
  suggestion: Route.ComponentProps["loaderData"]["suggestions"][number];
}) {
  const fetcher = useFetcher();

  // Hide optimistically while dismissing; the revalidated loader then omits it.
  if (fetcher.formData) {
    return null;
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold leading-tight">
            {suggestion.title}
          </h3>
          {suggestionKindBadge(suggestion.kind)}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {suggestion.teaser}
        </p>
      </CardContent>
      <CardFooter>
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="dismiss-suggestion" />
          <input type="hidden" name="suggestionId" value={suggestion.id} />
          <Button type="submit" variant="ghost" size="sm">
            <X className="mr-1 size-4" />
            Dismiss
          </Button>
        </fetcher.Form>
      </CardFooter>
    </Card>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case CourseStatus.Published:
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Published
        </span>
      );
    case CourseStatus.Draft:
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Draft
        </span>
      );
    case CourseStatus.Archived:
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
          Archived
        </span>
      );
    default:
      return null;
  }
}

export function HydrateFallback() {
  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="mt-2 h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="flex flex-col">
            <Skeleton className="aspect-video rounded-b-none rounded-t-lg" />
            <CardHeader>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="flex-1">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function InstructorDashboard({
  loaderData,
}: Route.ComponentProps) {
  const { courses, suggestions } = loaderData;

  return (
    <div className="mx-auto max-w-7xl p-6 lg:p-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">My Courses</span>
      </nav>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your courses and track enrollments
          </p>
        </div>
        <Link to="/instructor/new">
          <Button>
            <Plus className="mr-2 size-4" />
            New Course
          </Button>
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="mb-4 size-12 text-muted-foreground/50" />
          <h2 className="text-lg font-medium">No courses yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first course to get started.
          </p>
          <Link to="/instructor/new" className="mt-4">
            <Button>
              <Plus className="mr-2 size-4" />
              Create Course
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="flex flex-col overflow-hidden pt-0">
              <Link to={`/courses/${course.slug}`} className="aspect-video overflow-hidden">
                <CourseImage
                  src={course.coverImageUrl}
                  alt={course.title}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                />
              </Link>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/courses/${course.slug}`}
                    className="text-lg font-semibold leading-tight hover:text-primary"
                  >
                    {course.title}
                  </Link>
                  {statusBadge(course.status)}
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {course.description}
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="size-4" />
                    <span>
                      {course.lessonCount}{" "}
                      {course.lessonCount === 1 ? "lesson" : "lessons"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="size-4" />
                    <span>
                      {course.enrollmentCount}{" "}
                      {course.enrollmentCount === 1 ? "student" : "students"}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link to={`/instructor/${course.id}`} className="w-full">
                  <Button className="w-full" variant="outline">
                    <BookOpen className="mr-2 size-4" />
                    Edit Course
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="mt-12">
          <div className="mb-6 flex items-center gap-2">
            <Lightbulb className="size-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Courses you could create next</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let message = "An unexpected error occurred while loading your courses.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 401) {
      title = "Sign in required";
      message = typeof error.data === "string" ? error.data : "Please select a user from the DevUI panel.";
    } else if (error.status === 403) {
      title = "Access denied";
      message = typeof error.data === "string" ? error.data : "You don't have permission to access this page.";
    } else {
      title = `Error ${error.status}`;
      message = typeof error.data === "string" ? error.data : error.statusText;
    }
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">{title}</h1>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/courses">
            <Button variant="outline">Browse Courses</Button>
          </Link>
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
