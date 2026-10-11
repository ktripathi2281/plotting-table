// The ASCII portrait warms to amber around the cursor, like a torch on paper.
export function initPortrait() {
  const pre = document.getElementById("portrait");
  if (!pre || !matchMedia("(hover: hover)").matches) return;
  let frame = 0;
  pre.addEventListener("pointermove", (e) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const box = pre.getBoundingClientRect();
      pre.style.setProperty("--mx", `${((e.clientX - box.left) / box.width) * 100}%`);
      pre.style.setProperty("--my", `${((e.clientY - box.top) / box.height) * 100}%`);
    });
  });
  pre.addEventListener("pointerleave", () => {
    cancelAnimationFrame(frame);
    pre.style.removeProperty("--mx");
    pre.style.removeProperty("--my");
  });
}
