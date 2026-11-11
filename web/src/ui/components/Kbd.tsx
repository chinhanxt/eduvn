/** Phím tắt: "Ctrl K" → <kbd>Ctrl</kbd> <kbd>K</kbd>. */
export function Kbd({ keys }: { keys: string }) {
  const parts = keys.split(/\s+/).filter(Boolean);
  return (
    <>
      {parts.map((k, i) => (
        <span key={i}>
          {i > 0 && " "}
          <kbd>{k}</kbd>
        </span>
      ))}
    </>
  );
}
