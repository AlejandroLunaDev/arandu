import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CareerOption, Institution } from "@arandu/contracts";
import { byCareer, byInstitution, placeName } from "./places.ts";

const inst = (name: string, shortName: string | null = null): Institution => ({
  name,
  shortName,
  kind: "public",
  logo: null,
  photo: null,
});

const offering = (courseId: number, course: string, institution: Institution, city: string) => ({
  courseId,
  course,
  institution,
  city,
});

const career = (slug: string, offerings: CareerOption["offerings"]): CareerOption => ({
  profession: { slug, name: slug },
  reason: "",
  offerings,
});

const usp = inst("Universidade de São Paulo", "USP");

describe("placeName", () => {
  it("prefers the short name", () => {
    assert.equal(placeName(usp), "USP");
    assert.equal(placeName(inst("Escola")), "Escola");
  });
});

describe("byInstitution", () => {
  it("groups careers offered at the same institution and city, in the order given", () => {
    const out = byInstitution([
      career("medicina", [offering(1, "Medicina", usp, "São Paulo")]),
      career("direito", [offering(2, "Direito", usp, "São Paulo")]),
    ]);
    assert.equal(out.length, 1);
    assert.deepEqual(out[0]?.courses.map((c) => c.profession.slug), ["medicina", "direito"]);
  });
  it("splits the same institution across cities", () => {
    const unifesp = inst("Unifesp");
    const out = byInstitution([
      career("direito", [offering(1, "Direito", unifesp, "São Paulo"), offering(2, "Direito", unifesp, "Guarulhos")]),
    ]);
    assert.deepEqual(out.map((p) => p.city).sort(), ["Guarulhos", "São Paulo"]);
  });
  it("lists a course once even if repeated under two careers, keeping the first career", () => {
    const out = byInstitution([
      career("direito", [offering(1, "Direito", usp, "São Paulo"), offering(1, "Direito", usp, "São Paulo")]),
      career("outra", [offering(1, "Direito", usp, "São Paulo")]),
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0]?.courses.length, 1);
    assert.equal(out[0]?.courses[0]?.profession.slug, "direito");
  });
  it("lists a course name once per place when each career has its own courseId, keeping the first career", () => {
    const out = byInstitution([
      career("dev", [offering(10, "Engenharia De Software", usp, "São Paulo")]),
      career("games", [offering(11, "Engenharia De Software", usp, "São Paulo"), offering(12, "Jogos Digitais", usp, "São Paulo")]),
    ]);
    assert.deepEqual(out[0]?.courses.map((c) => [c.courseId, c.profession.slug]), [[10, "dev"], [12, "games"]]);
  });
  it("keeps two courses of the same career at one place", () => {
    const out = byInstitution([
      career("enfermagem", [offering(5038, "Enfermagem", usp, "São Paulo"), offering(5140, "Obstetrícia", usp, "São Paulo")]),
    ]);
    assert.equal(out.length, 1);
    assert.deepEqual(out[0]?.courses.map((c) => c.courseId), [5038, 5140]);
  });
  it("sorts by institution with pt-BR collation", () => {
    const names = ["Universidade Federal", "Escola", "Unifesp", "Ébano", "UFSCar"];
    const out = byInstitution([career("x", names.map((n, i) => offering(i, "C", inst(n), "A")))]);
    assert.deepEqual(out.map((p) => placeName(p.institution)), ["Ébano", "Escola", "UFSCar", "Unifesp", "Universidade Federal"]);
  });
  it("sorts by the short name when there is one", () => {
    const out = byInstitution([
      career("x", [offering(1, "C", usp, "A"), offering(2, "C", inst("Unifesp"), "A"), offering(3, "C", inst("UFSCar"), "A")]),
    ]);
    assert.deepEqual(out.map((p) => placeName(p.institution)), ["UFSCar", "Unifesp", "USP"]);
  });
  it("returns [] without careers", () => assert.deepEqual(byInstitution([]), []));
});

describe("byCareer", () => {
  const places = byInstitution([
    career("psicologia", [offering(1, "Psicologia", usp, "São Paulo"), offering(2, "Psicologia", inst("Anhanguera"), "São Paulo")]),
    career("pedagogia", [offering(3, "Pedagogia", inst("Anhanguera"), "São Paulo")]),
  ]);
  const out = byCareer(places);
  it("lists each career once, Arandu's best first", () => assert.deepEqual(out.map((c) => c.profession.slug), ["psicologia", "pedagogia"]));
  it("puts under a career every place that has it, in alphabetical order", () =>
    assert.deepEqual(out[0]?.at.map(({ place, course }) => [placeName(place.institution), course.courseId]), [["Anhanguera", 2], ["USP", 1]]));
  it("returns [] without places", () => assert.deepEqual(byCareer([]), []));
});
