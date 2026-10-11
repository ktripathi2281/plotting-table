import { initTheme } from "./theme.js";
import { runIntro } from "./intro.js";
import { initProjects } from "./projects.js";
import { initCommands } from "./commands.js";
import { initMail } from "./mail.js";
import { initActivity } from "./activity.js";

document.documentElement.classList.add("js");
initTheme();
initProjects();
initCommands();
initMail();
initActivity();

// fetch's uptime: how long at TCS, counted from June 2025.
const months = (() => {
  const now = new Date();
  return (now.getFullYear() - 2025) * 12 + now.getMonth() - 5;
})();
const years = Math.floor(months / 12);
const rest = months % 12;
const span = [years && `${years} year${years > 1 ? "s" : ""}`, rest && `${rest} month${rest > 1 ? "s" : ""}`].filter(Boolean).join(", ");
const uptime = document.getElementById("uptime");
if (uptime && months > 0) uptime.textContent = `${span} at TCS`;

runIntro((fromIntro) => {
  if (fromIntro) document.getElementById("name").focus({ preventScroll: true });
});
