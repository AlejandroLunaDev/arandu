// Evals of the onboarding and the career recommendations against the real database and model (paid, cents per run).
// Run by hand before merging a change to their prompts, the model or its settings: npm run eval --workspace @arandu/api
import type {
  AranduProfile,
  ChatMessage,
  OnboardingTopic,
} from '@arandu/contracts';
import { AiService, type AiObjectResult } from '@nestjs/ai';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { OnboardingService } from '../src/arandu/onboarding.service.js';
import { createJudge, questionMarks } from './judge.js';

/** Each case runs this many times; a case passes only if every run does. */
const RUNS = 3;

const user = (content: string): ChatMessage => ({ role: 'user', content });
const arandu = (content: string): ChatMessage => ({
  role: 'assistant',
  content,
});
const welcome = arandu(
  'Oi, eu sou o Arandu, um gato que ajuda a encontrar um caminho profissional. Para começar: o que você faz hoje?',
);

// The four people Alejandro named (2026-11-18): none of them has chosen a career yet.
const personas = {
  teen: 'Tenho 17 anos, tô terminando o ensino médio e não faço ideia do que fazer.',
  leftMedicine:
    'Tenho 22 anos e acabei de largar Medicina. Quero saber o que eu posso fazer agora.',
  careerChange:
    'Tenho 36 anos, trabalho com vendas há dez anos e quero mudar de carreira, mas não sei bem para qual.',
  retired:
    'Tenho 60 anos, me aposentei e quero fazer uma faculdade, mas não sei qual.',
};

interface TurnCase {
  id: string;
  messages: ChatMessage[];
  covers?: OnboardingTopic[];
  doesNotCover?: OnboardingTopic[];
  done?: boolean;
  judge: string[];
}

const turnCases: TurnCase[] = [
  {
    id: 'start',
    messages: [],
    judge: [
      'Introduces itself as Arandu in one sentence and asks what the person does now, assuming no age or school.',
      'The quick replies fit different kinds of people: students, workers, retired people.',
    ],
  },
  {
    id: 'teen-finishing-school',
    messages: [welcome, user(personas.teen)],
    covers: ['situation'],
    judge: [
      'Asks next which subjects or areas the person likes, with quick replies that fit someone in school.',
    ],
  },
  {
    id: 'left-medicine',
    messages: [welcome, user(personas.leftMedicine)],
    covers: ['situation'],
    judge: [
      'Treats leaving Medicina as information, not failure, without pushing the person back to it.',
    ],
  },
  {
    id: 'career-change',
    messages: [welcome, user(personas.careerChange)],
    covers: ['situation'],
    judge: [
      'Treats the person as an adult: the next question fits a working adult, not a school student.',
    ],
  },
  {
    id: 'retired',
    messages: [welcome, user(personas.retired)],
    covers: ['situation'],
    judge: [
      'Respects the person’s age without condescension, and the next question does not assume a school life now.',
    ],
  },
  {
    id: 'off-topic-answer',
    messages: [
      welcome,
      user(personas.teen),
      arandu(
        'Que bom que você quer pensar nisso com calma! Quais matérias ou assuntos você mais gosta de estudar?',
      ),
      user('Qual é a capital da Austrália?'),
    ],
    covers: ['situation'],
    doesNotCover: ['likedSubjects'],
    judge: [
      'Steers back kindly in a sentence and asks again which subjects or areas the person likes.',
    ],
  },
  {
    id: 'last-answer-closes',
    messages: [
      welcome,
      user(personas.careerChange),
      arandu('Que legal! O que você mais gosta de estudar ou aprender?'),
      user('Gosto de entender como as empresas funcionam e de economia.'),
      arandu('Boa! E o que é mais difícil ou chato para você?'),
      user('Contas muito detalhadas e ficar sozinho o dia todo.'),
      arandu('Entendi. O que você gosta de fazer quando ninguém te pede nada?'),
      user('Ler sobre negócios e organizar eventos com amigos.'),
      arandu(
        'Que bacana! Como você prefere trabalhar: com pessoas, ideias, mãos ou dados?',
      ),
      user('Com pessoas, liderando um time.'),
      arandu('E você já tinha alguma carreira em mente?'),
      user('Pensei em Administração.'),
    ],
    covers: [
      'situation',
      'likedSubjects',
      'hardSubjects',
      'interests',
      'workStyle',
      'careerIdea',
    ],
    done: true,
    judge: [
      'Asks no question: closes warmly, saying it will now show careers that may fit.',
      'The profile records Administração as the career idea.',
    ],
  },
];

const turnCriteria = [
  'pt-br: The reply and quick replies are in Brazilian Portuguese.',
  'in-character: It speaks as Arandu: curious, honest and warm; light and informal but never childish; at most about four sentences.',
  'no-assumptions: Neither the reply nor the profile assumes anything about the person’s age, school, family or gender that they did not say.',
  'faithful-profile: The profile holds only what the person said, in short items, with nothing invented.',
  'no-careers-yet: It suggests no career yet.',
];

const profile = (p: Partial<AranduProfile>): AranduProfile => ({
  situation: null,
  likedSubjects: [],
  hardSubjects: [],
  interests: [],
  workStyle: [],
  careerIdea: null,
  covered: [
    'situation',
    'likedSubjects',
    'hardSubjects',
    'interests',
    'workStyle',
    'careerIdea',
  ],
  ...p,
});

interface RecommendCase {
  id: string;
  profile: AranduProfile;
  first?: string;
  never?: string[];
  judge?: string[];
}

const recommendCases: RecommendCase[] = [
  {
    id: 'teen-biology-drawing',
    profile: profile({
      situation: 'terminando o ensino médio, 17 anos',
      likedSubjects: ['biologia', 'artes'],
      hardSubjects: ['matemática'],
      interests: ['desenhar animais', 'cuidar do cachorro'],
      workStyle: ['com as mãos', 'com pessoas'],
    }),
  },
  {
    id: 'left-medicine',
    profile: profile({
      situation: 'largou Medicina no segundo ano, 22 anos',
      likedSubjects: ['biologia', 'conversar com pacientes'],
      hardSubjects: ['plantões longos', 'pressão das provas'],
      interests: ['escutar os amigos', 'ler sobre comportamento'],
      workStyle: ['com pessoas'],
    }),
    never: ['medicina'],
  },
  {
    id: 'career-change-idea-first',
    profile: profile({
      situation: 'trabalha com vendas há dez anos, 36 anos',
      likedSubjects: ['economia', 'como as empresas funcionam'],
      hardSubjects: ['contas muito detalhadas'],
      interests: ['ler sobre negócios', 'organizar eventos'],
      workStyle: ['com pessoas', 'liderando um time'],
      careerIdea: 'Administração',
    }),
    first: 'administracao',
  },
  {
    id: 'retired-history',
    profile: profile({
      situation: 'aposentado, 60 anos',
      likedSubjects: ['história', 'leitura'],
      hardSubjects: ['matemática'],
      interests: ['contar histórias para os netos', 'visitar museus'],
      workStyle: ['com pessoas'],
    }),
  },
];

const recommendCriteria = [
  'fit: Every career fits the profile, and its reason links it to something the person said.',
  'honest: No reason claims facts about the career (salary, job market, difficulty, statistics).',
  'voice: Each reason is one warm sentence in Brazilian Portuguese, with no gendered word about the person.',
];

describe('Onboarding evals', () => {
  let onboarding: OnboardingService;
  let judge: ReturnType<typeof createJudge>;
  const results: { id: string; passed: boolean; ms: number }[] = [];
  const samples = new Map<string, string>();
  // Arandu's own calls, priced by the app's model pricing; the judge counts its own.
  let aranduCost = 0;
  let aranduCalls = 0;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    await module.init();
    onboarding = module.get(OnboardingService);
    const ai = module.get(AiService);
    judge = createJudge(ai);
    const generateObject = ai.generateObject.bind(ai);
    ai.generateObject = (async (options) => {
      const result: AiObjectResult<unknown> = await generateObject(options);
      if (options.label !== 'eval-judge') {
        aranduCost += result.cost ?? 0;
        aranduCalls++;
      }
      return result;
    }) as AiService['generateObject'];
  });

  afterAll(() => {
    const ms = results.map((r) => r.ms).sort((a, b) => a - b);
    const cost = aranduCost;
    console.log(
      [
        `\nOnboarding evals: ${results.filter((r) => r.passed).length}/${results.length} outputs passed (${turnCases.length + recommendCases.length} cases x ${RUNS} runs)`,
        `Latency p50 ${ms[Math.floor(ms.length / 2)]} ms, max ${ms.at(-1)} ms`,
        `Per call: US$ ${(cost / aranduCalls).toFixed(6)}`,
        `This run: US$ ${(cost + judge.cost).toFixed(4)} (Arandu ${cost.toFixed(4)}, judge ${judge.cost.toFixed(4)})`,
        '\nSamples:',
        ...[...samples].map(([id, output]) => `- ${id}: ${output}`),
      ].join('\n'),
    );
  });

  // Cases run concurrently; the runs of one case one after another.
  it.concurrent.each(turnCases)(
    'turn: $id',
    async (c) => {
      const failed: string[] = [];
      for (let run = 0; run < RUNS; run++) {
        const failures: string[] = [];
        const started = Date.now();
        const out = await onboarding.turn(c.messages);
        const ms = Date.now() - started;

        if (/miau/i.test(out.reply)) failures.push('says miau');
        if (questionMarks(out.reply) > (c.done ? 0 : 1))
          failures.push(`${questionMarks(out.reply)} question marks`);
        if (
          !c.done &&
          (out.quickReplies.length < 3 || out.quickReplies.length > 5)
        )
          failures.push(`${out.quickReplies.length} quick replies`);
        if ((c.done ?? false) !== out.done) failures.push(`done ${out.done}`);
        for (const t of c.covers ?? [])
          if (!out.profile.covered.includes(t))
            failures.push(`${t} not covered`);
        for (const t of c.doesNotCover ?? [])
          if (out.profile.covered.includes(t)) failures.push(`${t} covered`);

        failures.push(
          ...(await judge.failures(
            [
              `Conversation:\n${c.messages.map((m) => `${m.role}: ${m.content}`).join('\n') || '(none: the onboarding starts)'}`,
              `Arandu's reply:\n${out.reply}`,
              `Quick replies: ${JSON.stringify(out.quickReplies)}`,
              `Profile Arandu built:\n${JSON.stringify(out.profile, null, 2)}`,
            ],
            [...turnCriteria, ...c.judge],
          )),
        );

        results.push({ id: c.id, passed: !failures.length, ms });
        if (run === 0)
          samples.set(c.id, `${out.reply} ${JSON.stringify(out.quickReplies)}`);
        if (failures.length)
          failed.push(
            `run ${run}: ${failures.join('; ')}\n  reply: ${out.reply}`,
          );
      }
      expect(failed).toEqual([]);
    },
    180_000,
  );

  it.concurrent.each(recommendCases)(
    'recommendations: $id',
    async (c) => {
      const failed: string[] = [];
      for (let run = 0; run < RUNS; run++) {
        const failures: string[] = [];
        const started = Date.now();
        const { careers } = await onboarding.recommend({ profile: c.profile });
        const ms = Date.now() - started;
        const slugs = careers.map((k) => k.profession.slug);

        if (careers.length < 3 || careers.length > 4)
          failures.push(`${careers.length} careers`);
        if (c.first && slugs[0] !== c.first)
          failures.push(`first is ${slugs[0]}, not ${c.first}`);
        for (const slug of c.never ?? [])
          if (slugs.includes(slug)) failures.push(`suggests ${slug}`);
        if (careers.some((k) => !k.offerings.length))
          failures.push('a career without offerings');
        if (careers.some((k) => /miau/i.test(k.reason)))
          failures.push('a reason says miau');
        if (careers.some((k) => questionMarks(k.reason)))
          failures.push('a reason asks a question');

        const listed = careers
          .map((k) => `${k.profession.name}: ${k.reason}`)
          .join('\n');
        failures.push(
          ...(await judge.failures(
            [
              `The person's profile:\n${JSON.stringify(c.profile, null, 2)}`,
              `Careers Arandu suggested, with their reasons:\n${listed}`,
            ],
            [...recommendCriteria, ...(c.judge ?? [])],
          )),
        );

        results.push({ id: c.id, passed: !failures.length, ms });
        if (run === 0)
          samples.set(`recommend ${c.id}`, listed.replaceAll('\n', ' | '));
        if (failures.length)
          failed.push(
            `run ${run}: ${failures.join('; ')}\n  careers: ${listed}`,
          );
      }
      expect(failed).toEqual([]);
    },
    180_000,
  );
});
