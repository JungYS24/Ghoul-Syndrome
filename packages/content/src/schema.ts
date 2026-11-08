import { z } from "zod";

const gaugeKey = z.enum(["morale", "order", "finance", "legit", "faith", "control", "offering", "stealth"]);
const effectKey = z.enum([
  "morale", "order", "finance", "legit", "faith", "control", "offering", "stealth",
  "pop", "army", "food", "silver", "strat", "prey",
  "infection", "target", "neutral", "wrath", "research", "wall", "rel", "relTo", "voodooPower",
]);
const effects = z.record(effectKey, z.number());
const range = z.object({ min: z.number().optional(), max: z.number().optional() }).strict();
const when = z.object({
  infection: range.optional(), turn: range.optional(), wrath: range.optional(), ci: range.optional(), wall: range.optional(),
  gauge: z.record(gaugeKey, range).optional(),
  flags: z.array(z.string()).optional(), notFlags: z.array(z.string()).optional(),
  foodLow: z.boolean().optional(), relLow: z.boolean().optional(), voodooAi: z.boolean().optional(),
}).strict();
const factionId = z.enum(["arkandal", "iruth", "voodoo"]);
const choice = z.object({
  label: z.string().min(1),
  art: z.array(z.string()).optional(),
  check: z.object({ stat: gaugeKey, mod: z.number().optional() }).strict(),
  effects,
  onFail: effects.optional(),
  setFlags: z.array(z.string()).optional(),
  target: factionId.optional(),
  withSuccess: z.array(effectKey).optional(),
  followUp: z.object({ cardId: z.string().min(1), afterTurns: z.number().int().min(1) }).strict().optional(),
  grantRelic: z.string().min(1).optional(),
}).strict();
const tone = z.enum(["crit", "great", "success", "partial", "fail", "fumble", "after"]);
const branch = z.object({
  prevTones: z.array(tone).min(1),
  title: z.string().min(1).optional(),
  text: z.string().optional(),
  choices: z.array(choice).min(1).optional(),
}).strict();
export const cardSchema = z.object({
  id: z.string().min(1),
  faction: z.enum(["arkandal", "iruth", "voodoo", "common"]),
  kind: z.string().optional(),
  season: z.array(z.enum(["spring", "summer", "autumn", "winter"])).optional(),
  when: when.optional(),
  weight: z.number().optional(),
  title: z.string().min(1),
  text: z.string(),
  art: z.array(z.string()).optional(),
  choices: z.array(choice).min(1),
  branches: z.array(branch).optional(),
}).strict();
export const actionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  desc: z.string(),
  factions: z.array(factionId).min(1),
  when: when.optional(),
  card: cardSchema,
}).strict();
export const decreeSchema = z.object({
  id: z.string().min(1),
  faction: factionId,
  name: z.string().min(1),
  desc: z.string(),
  icon: z.string().min(1),
  effects,
  upkeep: z.record(z.enum(["silver", "strat", "food", "prey"]), z.number().nonnegative()),
  wrath: z.number().optional(),
  requires: when.optional(),
  repealWhen: when.optional(),
  repealText: z.string().optional(),
}).strict();
export const relicSchema = z.object({
  id: z.string().min(1),
  faction: z.enum(["arkandal", "iruth", "voodoo", "common"]),
  name: z.string().min(1),
  desc: z.string(),
  choice,
}).strict();
export const contentSchema = z.object({
  cards: z.array(cardSchema),
  situational: z.array(cardSchema),
  collapse: z.array(cardSchema),
  fixed: z.record(z.string(), cardSchema),
  actions: z.array(actionSchema),
  decrees: z.array(decreeSchema),
  opportunities: z.array(cardSchema).optional(),
  relics: z.array(relicSchema).optional(),
}).strict();
