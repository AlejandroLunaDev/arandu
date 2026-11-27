/**
 * Makes the chapters of the subjects given, in topic order, run by hand from apps/api after a build:
 *
 *   node dist/scripts/make-chapters.js 8:6 9
 *
 * `<id>` covers every topic of subject id; `<id>:<n>` its first n topics. A chapter stored with its three lessons is
 * kept; one made before lessons (#157) is made again, from a new search. It stops a subject
 * at its first failure, so a book keeps its leading run of made chapters. Every Firecrawl search and model call is
 * paid: run it only with the owner's OK on its estimated cost.
 */
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { ChaptersService } from '../modules/paths/chapters.service.js';
import { PathsRepository } from '../modules/paths/paths.repository.js';

const subjects = process.argv.slice(2).map((a) => {
  const [id, limit] = a.split(':').map(Number);
  if (!id || !Number.isInteger(id) || (limit !== undefined && !(limit > 0)))
    throw new Error(`Bad subject "${a}": use <id> or <id>:<count>`);
  return { id, limit: limit ?? Infinity };
});
if (!subjects.length) throw new Error('Give at least one subject id');

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: new ConsoleLogger({ prefix: 'make-chapters' }),
});
const chapters = app.get(ChaptersService);
const paths = app.get(PathsRepository);
try {
  for (const { id, limit } of subjects) {
    const discipline = await paths.discipline(id);
    if (!discipline) throw new Error(`No subject ${id}`);
    let made = 0;
    try {
      for (const [topic, text] of discipline.topics.slice(0, limit).entries()) {
        const stored = await paths.chapterContent(id, topic, text);
        if (stored?.lessons) continue;
        const content = await chapters.make(id, topic, Boolean(stored));
        made++;
        console.log(
          `${stored ? 'remade' : 'made'} ${id}:${topic} "${text}": lessons ${content.lessons?.map((l) => `"${l.title}" ${l.cards.length}`).join(', ')}; ${content.pieces?.length ?? 0} pieces, ${content.exercises.length} exercises`,
        );
      }
    } catch (error) {
      // The book keeps its leading run; the next subject still gets its turn.
      process.exitCode = 1;
      console.log(`subject ${id} stopped: ${String(error)}`);
    }
    console.log(`subject ${id} "${discipline.name}": ${made} made`);
  }
} finally {
  await app.close();
}
