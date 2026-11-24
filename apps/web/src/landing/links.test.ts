import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { youtubeEmbed } from "./links.ts";

const id = "GTMbuMdmMHU";
const embed = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;

describe("youtubeEmbed", () => {
  it("reads watch?v=", () => assert.equal(youtubeEmbed(`https://www.youtube.com/watch?v=${id}`), embed));
  it("keeps ?t= as the start on youtu.be", () => {
    assert.equal(youtubeEmbed(`https://youtu.be/${id}?t=464`), `https://www.youtube-nocookie.com/embed/${id}?start=464&autoplay=1&rel=0`);
  });
  it("accepts www. and m. hosts", () => {
    assert.equal(youtubeEmbed(`https://m.youtube.com/watch?v=${id}`), embed);
    assert.equal(youtubeEmbed(`https://youtube.com/watch?v=${id}`), embed);
  });
  it("reads shorts and embed paths", () => {
    assert.equal(youtubeEmbed(`https://www.youtube.com/shorts/${id}`), embed);
    assert.equal(youtubeEmbed(`https://www.youtube.com/embed/${id}`), embed);
  });
  it("returns undefined for anything invalid", () => {
    for (const bad of [undefined, "", "not a url", "https://vimeo.com/123", "https://www.youtube.com/watch?v=short"]) {
      assert.equal(youtubeEmbed(bad), undefined);
    }
  });
});
