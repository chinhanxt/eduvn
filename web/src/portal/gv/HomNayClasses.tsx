import { Link } from "react-router";
import { GradeBar, GradeLegend } from "../../ui/charts/GradeBar";
import { type GvToday, pct, signed, vn1 } from "../today";
import { ClassHead } from "./HomNay";

// Bảng lớp màn Hôm nay GV (học lực xếp chồng): tải riêng, vẽ ngay khi dữ liệu về.
export function Classes({ d }: { d: GvToday }) {
  return (
    <>
      <table className="ctable">
        <ClassHead />
        <tbody>
          {d.classes.map((c) => (
            <tr key={c.id}>
              <td>
                <Link to={`/lop-hoc/${c.id}`} style={{ fontWeight: 500 }}>{c.name}</Link> {c.subject && <span className="muted">{c.subject}</span>}
              </td>
              <td className="r hide-sm">{c.rosterSize}</td>
              <td><GradeBar counts={c.bands} height={18} /></td>
              <td className="r">{c.avg == null ? "—" : vn1(c.avg)}</td>
              <td className={c.deltaMonth == null ? "r muted" : c.deltaMonth > 0 ? "r up" : c.deltaMonth < 0 ? "r dn" : "r"}>{c.deltaMonth == null ? "—" : signed(c.deltaMonth)}</td>
              <td className="r hide-sm">{pct(c.onTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ghd" style={{ justifyContent: "space-between", borderBottom: 0, height: "auto", minHeight: 32, flexWrap: "wrap", gap: 8, padding: "6px 12px" }}>
        <GradeLegend />
        <span className="caption" style={{ fontWeight: 400 }}>ĐTB tạm tính theo sổ điểm; lớp chưa có sổ điểm tính theo bài giao.</span>
      </div>
    </>
  );
}
