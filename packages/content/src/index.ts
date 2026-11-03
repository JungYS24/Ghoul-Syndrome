import type { GameContent } from "@guul/engine";
import raw from "../cards/content.json";
import { contentSchema } from "./schema";

/** 빌드 시 zod 로 카드 데이터를 검증합니다. 잘못되면 여기서 바로 던집니다. */
export const content: GameContent = contentSchema.parse(raw) as unknown as GameContent;
export { contentSchema } from "./schema";
