import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CareerOption } from "@arandu/contracts";
import { byInstitution } from "./places.ts";

const career = (slug: string, offerings: CareerOption["offerings"]): CareerOption => ({
  profession: { slug, name: slug },
  reason: "",
  offerings,
});

describe("byInstitution", () => {
  it("groups careers offered at the same institution and city, in the order given", () => {
    const out = byInstitution([
      career("medicina", [{ institution: "USP", city: "São Paulo" }]),
      career("direito", [{ institution: "USP", city: "São Paulo" }]),
    ]);
    assert.equal(out.length, 1);
    assert.deepEqual(out[0]?.careers.map((c) => c.slug), ["medicina", "direito"]);
  });
  it("splits the same institution name across cities", () => {
    const out = byInstitution([
      career("direito", [
        { institution: "Unifesp", city: "São Paulo" },
        { institution: "Unifesp", city: "Guarulhos" },
      ]),
    ]);
    assert.deepEqual(out.map((p) => p.city).sort(), ["Guarulhos", "São Paulo"]);
  });
  it("lists a career once per place even if repeated", () => {
    const out = byInstitution([
      career("direito", [
        { institution: "USP", city: "São Paulo" },
        { institution: "USP", city: "São Paulo" },
      ]),
      career("direito", [{ institution: "USP", city: "São Paulo" }]),
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0]?.careers.length, 1);
  });
  it("sorts by institution with pt-BR collation", () => {
    const names = ["Universidade Federal", "Escola", "Unifesp", "Ébano", "UFSCar"];
    const out = byInstitution([career("x", names.map((institution) => ({ institution, city: "A" })))]);
    assert.deepEqual(out.map((p) => p.institution), ["Ébano", "Escola", "UFSCar", "Unifesp", "Universidade Federal"]);
  });
  it("returns [] without careers", () => assert.deepEqual(byInstitution([]), []));
});
