import type { CareerOption, Institution } from "@arandu/contracts";

/** One course to pick, with the recommended career it belongs to. */
export type PlaceCourse = { courseId: number; course: string; profession: CareerOption["profession"]; reason: string };

/** An institution where at least one recommended career can be lived, with its courses. */
export type Place = { institution: Institution; city: string; courses: PlaceCourse[] };

/** The name the person reads: the short one when there is one ("USP"). */
export const placeName = (institution: Institution) => institution.shortName ?? institution.name;

/** O10 lists institutions, not careers: the recommendations turned inside out, in alphabetical order. */
export function byInstitution(careers: CareerOption[]): Place[] {
  const places = new Map<string, Place>();
  for (const { profession, reason, offerings } of careers)
    for (const { courseId, course, institution, city } of offerings) {
      const key = `${institution.name}\n${city}`;
      const place = places.get(key) ?? { institution, city, courses: [] };
      if (!place.courses.some((c) => c.courseId === courseId)) place.courses.push({ courseId, course, profession, reason });
      places.set(key, place);
    }
  return [...places.values()].sort((a, b) => placeName(a.institution).localeCompare(placeName(b.institution), "pt-BR"));
}
