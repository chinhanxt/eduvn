export const sampleDoc = () => ({
  version: 1 as const,
  pages: [
    {
      id: "p1",
      objects: [
        { type: "stroke", id: "s1", color: "#f3f0e6", width: 4.5, pts: [10, 10, 20, 25, 30, 40] },
        { type: "graph", id: "g1", x: 560, y: 50, w: 660, h: 420, exprs: [{ latex: "y=A\\sin x+B", color: "#5cc8ff" }], params: { A: 2, B: 1 }, view: { xMin: -5, xMax: 5, yMin: -4, yMax: 5 } },
        { type: "solid", id: "c1", kind: "cube", cx: 360, cy: 360, size: 210, th: 0.62, ph: 0.42, points: [{ name: "M", a: 0, b: 1, t: 0.5 }], section: ["M", "C", "C'"], angle: null },
      ],
    },
  ],
});
