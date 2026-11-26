import type { CareerOption, CourseChoice, Institution } from "@arandu/contracts";

/** One course to pick, with the recommended career it belongs to and that career's place in Arandu's ranking (0 first). */
export type PlaceCourse = { courseId: number; course: string; profession: CareerOption["profession"]; reason: string; rank: number };

/** An institution where at least one recommended career can be lived, with its courses. */
export type Place = { institution: Institution; city: string | null; courses: PlaceCourse[] };

/** The name the person reads: the short one when there is one ("USP"). */
export const placeName = (institution: Institution) => institution.shortName ?? institution.name;

/** A course on screen as the chat takes it, so Arandu can tell the places apart (O10). */
export const toChoice = (place: Place, course: PlaceCourse): CourseChoice => ({
  courseId: course.courseId,
  course: course.course,
  institution: placeName(place.institution),
  city: place.city,
});

/**
 * The recommendations turned inside out: the institutions where a recommended career can be lived, in alphabetical
 * order. The same course name can come more than once at a place: a course is one row per profession, and one
 * institution can register a course several times in e-MEC (one per campus, same first term). The place keeps it once,
 * with the best-ranked career (the API ranks the careers best first).
 */
export function byInstitution(careers: CareerOption[]): Place[] {
  const places = new Map<string, Place>();
  careers.forEach(({ profession, reason, offerings }, rank) => {
    for (const { courseId, course, institution, city } of offerings) {
      const key = `${institution.name}\n${city}`;
      const place = places.get(key) ?? { institution, city, courses: [] };
      if (!place.courses.some((c) => c.courseId === courseId || c.course === course)) place.courses.push({ courseId, course, profession, reason, rank });
      places.set(key, place);
    }
  });
  return [...places.values()].sort((a, b) => placeName(a.institution).localeCompare(placeName(b.institution), "pt-BR"));
}

/** A recommended career and where it can be studied. */
export type CareerPlaces = { profession: CareerOption["profession"]; reason: string; rank: number; at: { place: Place; course: PlaceCourse }[] };

/** O10 lists careers, each one once: Arandu's best first, and under each its places as `places` orders them. */
export function byCareer(places: Place[]): CareerPlaces[] {
  const careers = new Map<string, CareerPlaces>();
  for (const place of places)
    for (const course of place.courses) {
      const career = careers.get(course.profession.slug) ?? { profession: course.profession, reason: course.reason, rank: course.rank, at: [] };
      career.at.push({ place, course });
      careers.set(course.profession.slug, career);
    }
  return [...careers.values()].sort((a, b) => a.rank - b.rank);
}
