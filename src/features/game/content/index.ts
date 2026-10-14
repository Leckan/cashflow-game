import { board } from "./board";
import { cards } from "./cards";
import { challenges } from "./challenges";
import { offers } from "./offers";
import { profiles } from "./profiles";
import type { Catalog } from "../types";

export const catalog: Catalog = {
  board,
  cards,
  offers,
  profiles,
  challenges,
  fallbackCardId: "quiet-review",
};

export { board, cards, challenges, offers, profiles };
