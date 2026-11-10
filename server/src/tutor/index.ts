import type { Db } from "../db/client";
import { type Ai, disabledAi } from "../services/ai";
import { createBookService } from "./book";
import { createChatService } from "./chat";
import { createKbService } from "./kb";
import { createMasteryService } from "./mastery";
import { createPracticeService } from "./practice";
import { createQuestionService } from "./questions";
import { parseOverrides, withTaskOverrides } from "./tasks";

/** Gom các dịch vụ gia sư AI (P6). `overrides` = ánh xạ tạm tên tác vụ cổng AI (xem AI_TASK_OVERRIDES). */
export function createTutor(db: Db, aiIn: Ai | undefined, overrides: string | undefined = process.env.AI_TASK_OVERRIDES) {
  const ai = withTaskOverrides(aiIn ?? disabledAi, parseOverrides(overrides));
  const kb = createKbService(db);
  const practice = createPracticeService(db, ai);
  return {
    kb,
    chat: createChatService({ db, ai, kb }),
    practice,
    mastery: createMasteryService({ db, ai, kb }),
    questions: createQuestionService({ db, ai, kb, practice }),
    books: createBookService({ db, ai, kb }),
  };
}
export type Tutor = ReturnType<typeof createTutor>;
