import { describe, expect, it } from "vitest";
import { SKILL_NAMES, loadSkill, parseFrontmatter, skillText } from "../../src/services/skills";
import { leaksName, levelFromDtb } from "../../src/services/aiSkills";

describe("skills/ trên đĩa", () => {
  it("6 skill đều nạp được: frontmatter, quy trình, references", async () => {
    for (const n of SKILL_NAMES) {
      const s = await loadSkill(n);
      expect(s.name).toBe(n);
      expect(s.description.length).toBeGreaterThan(40);
      expect(s.references.length).toBeGreaterThanOrEqual(1);
      expect(skillText(s)).toContain("Tài liệu tham chiếu");
    }
  });

  it("tên lạ → NotFound", async () => {
    await expect(loadSkill("../../etc/passwd")).rejects.toThrow("Không có skill");
  });

  it("parseFrontmatter tách name/description", () => {
    expect(parseFrontmatter("---\nname: a\ndescription: b: c\n---\nnội dung")).toEqual({ meta: { name: "a", description: "b: c" }, body: "nội dung" });
  });

  it("levelFromDtb và leaksName", () => {
    expect([9, 7, 5.5, 3].map(levelFromDtb)).toEqual(["Tốt", "Khá", "Đạt", "Chưa đạt"]);
    expect(leaksName("em nguyen van an học tốt", "Nguyễn Văn An")).toBe(true);
    expect(leaksName("Em học tốt, hoa đẹp", "Lê Hoa")).toBe(false);
  });
});
