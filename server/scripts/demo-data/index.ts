// Gom dữ liệu soạn sẵn cho server demo.
import { BANK_THCS } from "./bank-thcs";
import { BANK_DH } from "./bank-dh";
import { BANK_10 } from "./bank-thpt10";
import { BANK_1112 } from "./bank-thpt1112";
import { AI_LESSONS, BOARDS, COMMENTS, DECKS, DIAGRAMS, LESSONS, VANBAN } from "./content-gv";
import { BOOKS, CHATS, KBS, PATHS, SOLUTIONS } from "./content-hoc";
import type { SeedData } from "./seed";

export const DATA: SeedData = {
  banks: [...BANK_THCS, ...BANK_10, ...BANK_1112, ...BANK_DH],
  lessons: LESSONS,
  decks: DECKS,
  aiLessons: AI_LESSONS,
  diagrams: DIAGRAMS,
  boards: BOARDS,
  vanban: VANBAN,
  comments: COMMENTS,
  solutions: SOLUTIONS,
  kbs: KBS,
  chats: CHATS,
  paths: PATHS,
  books: BOOKS,
};
