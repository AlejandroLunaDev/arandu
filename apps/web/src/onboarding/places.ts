import type { CareerOption } from "@arandu/contracts";

/** An institution where at least one recommended career can be lived, with those careers. */
export type Place = { institution: string; city: string; careers: CareerOption["profession"][] };

/** O10 lists institutions, not careers: the recommendations turned inside out, in alphabetical order. */
export function byInstitution(careers: CareerOption[]): Place[] {
  const places = new Map<string, Place>();
  for (const { profession, offerings } of careers)
    for (const { institution, city } of offerings) {
      const key = `${institution}\n${city}`;
      const place = places.get(key) ?? { institution, city, careers: [] };
      if (!place.careers.some((c) => c.slug === profession.slug)) place.careers.push(profession);
      places.set(key, place);
    }
  return [...places.values()].sort((a, b) => a.institution.localeCompare(b.institution, "pt-BR"));
}
