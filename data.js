// Everything on the table lives here: the sheets, their paper, and what they say.
// Content is taken from the portfolio (kauswhynot.vercel.app).
//
// The table has no edge. The sheets below form one block, `period.w` by `period.h` units, and that
// block repeats in every direction. Each row of blocks is shifted sideways by `period.shift`, like
// bricks, so the repeats never line up.
//
// You do not place sheets by hand. Give each one a size (w, h), a `row` and a `col`, and `pack()` at the
// bottom spreads the rows across the block and centres each sheet in its row. One grid dot is 100 units.
//
// stock: the paper a sheet is printed on. cream, blush, sage, sky, butter, lilac, kraft, ink (a dark
// card in day mode, a light one at night) or red.
window.TABLE = (function () {
  var SITE = "https://kauswhynot.vercel.app";

  var profile = {
    name: "Kaustubh Tripathi",
    first: "Kaustubh",
    last: "Tripathi",
    role: "Software & AI Engineer",
    location: "Bangalore, India",
    current: "Product Engineer, TCS",
    availability: "Open to software & AI engineering roles",
    email: "tripathikaustubh2281@gmail.com",
    github: "https://github.com/ktripathi2281",
    linkedin: "https://www.linkedin.com/in/kaustubh-tripathi",
    resume: SITE + "/resume.pdf",
    portfolio: SITE + "/",
    source: "https://github.com/ktripathi2281/plotting-table",
    lede: "I build dependable software, including language-model systems that hold their shape when the model doesn't."
  };

  var period = { w: 3400, h: 0, shift: 1700 };
  var ROW_GAP = 150;

  var sheets = [];
  function add(s) { sheets.push(s); return s; }

  /* ================================================================ the title */
  add({
    id: "title", kind: "title", group: "note", short: "—", row: 1, col: 1, w: 900, h: 600, stock: "ink",
    no: "Selected works", title: "Kaustubh Tripathi", kicker: "Software & AI Engineer",
    wall: { no: "Selected works · 2024 – 2026", nm: "Kaustubh Tripathi" },
    keywords: "profile about introduction bangalore tcs product engineer software ai engineer open to roles hire resume cv"
  });

  /* ================================================================ plate 0 */
  add({
    id: "model", kind: "plate", group: "plate", short: "0", drawing: "model", row: 1, col: 2, w: 560, h: 700, stock: "cream",
    no: "Plate 0", title: "Model, contained", kicker: "The frontispiece",
    description: "A single line wanders for 4,000 random steps and never leaves its boundary. The red line is the only way out, through a gate. This is how I build with AI.",
    caption: "A single line wanders for 4,000 random steps and never leaves its boundary. The red line is the only way out, through a gate. This is how I build with AI.",
    hint: "Hover over or tap any part of a drawing to read it.",
    keywords: "ai llm model boundary guardrails schema validation contained safety gate random wander structured outputs"
  });

  /* ================================================================ plates I - IV */
  add({
    id: "kavach", kind: "plate", group: "plate", short: "I", drawing: "kavach", row: 2, col: 1, w: 800, h: 560, stock: "sky",
    no: "Plate I", title: "Kavach", kicker: "AI cybercrime support platform",
    meta: [
      ["Context", "Build What Moves India Hackathon, 2-person team"],
      ["Medium", "GPT-5, GPT-5-mini, GPT-4o-transcribe; Next.js, TypeScript, Supabase, IndexedDB"],
      ["Dimensions", "6 model routes · 22 languages · 10 action steps"]
    ],
    description: "Reporting cybercrime in India means dealing with several portals, helplines and banks, each with its own deadlines. Kavach replaces all of that with a single case file of ten ordered, deadline-tracked steps, in any of the 22 scheduled Indian languages, by voice or text.",
    notes: [
      "Strict JSON-schema outputs on every route, sent through a provider-agnostic HTTP client with no SDK lock-in.",
      "Hybrid regex + LLM extraction of transaction IDs (UTRs), phone numbers and UPI IDs.",
      "A contradiction guardrail throws out any draft that conflicts with facts the citizen has confirmed."
    ],
    caption: "Six lines, one per model route, converge into one case file of ten steps. The red line is the rules engine, running alongside the whole way so the app still works with no API key.",
    hint: "Hover a route to light it; the case file lights with it.",
    links: [
      { label: "Essay", goto: "essay-kavach" },
      { label: "Visit", href: "https://cybercrime-assistant.vercel.app" },
      { label: "Source", href: "https://github.com/ashusnapx/hackathon" }
    ],
    keywords: "ai llm gpt openai nextjs typescript supabase indexeddb cybercrime fraud india languages voice transcribe hackathon guardrail schema json routes rules fallback safety"
  });

  add({
    id: "leetcode", kind: "plate", group: "plate", short: "II", drawing: "agent", row: 2, col: 2, w: 800, h: 560, stock: "blush",
    no: "Plate II", title: "LeetCode Agent Tracker", kicker: "Autonomous interview-prep platform",
    meta: [
      ["Context", "Independent project"],
      ["Medium", "Google Gemini function calling; React, Express, MongoDB"],
      ["Dimensions", "3 agents · 4 tools · up to 8 iterations"]
    ],
    description: "An interview-prep platform with three agents: a planner that builds each week's study plan on its own, a Socratic tutor that hints instead of answering, and a post-mortem reviewer that flags suboptimal complexity in solved code.",
    notes: [
      "The planner can act only through four database tools, which keeps it bounded and reviewable.",
      "Leitner-style spaced repetition, topic heatmaps and company-readiness analytics.",
      "Every call is logged with its tool calls, reasoning trace and latency."
    ],
    caption: "Each loop is one iteration of the planning agent, reaching out to one of its four tools and returning. The red line is the audit log, with one mark per iteration.",
    hint: "Hover a loop to see the tool it reached for.",
    links: [
      { label: "Essay", goto: "essay-leetcode" },
      { label: "Source", href: "https://github.com/ktripathi2281/LeetCode-Tracker" }
    ],
    keywords: "ai agents agent gemini function calling tools react express mongodb planner tutor socratic reviewer spaced repetition leitner audit log interview prep leetcode"
  });

  add({
    id: "skillbarter", kind: "plate", group: "plate", short: "III", drawing: "barter", row: 2, col: 3, w: 800, h: 560, stock: "kraft",
    no: "Plate III", title: "Skill Barter", kicker: "Peer-to-peer skill exchange",
    meta: [
      ["Context", "Independent project"],
      ["Medium", "MongoDB 2dsphere, Socket.io, JWT; React, Express"],
      ["Dimensions", "Mutual & one-way matches, ranked by distance"]
    ],
    description: "A place to trade skills without money. It solves the double coincidence of wants: you teach what I want to learn, I teach what you want. Matches are ranked by distance, and every trade needs both people to agree.",
    notes: [
      "Real-time chat and a trade lifecycle that requires consent from both sides.",
      "Dual-token JWT with silent renewal, OTP email verification, rate limiting and CORS whitelisting."
    ],
    caption: "Lens shapes are mutual matches and single arcs are one-way interest. The rings measure distance from you, and your nearest mutual match is drawn in red.",
    hint: "Hover a lens shape for a mutual match, a single arc for one-way interest.",
    links: [
      { label: "Visit", href: "https://skill-barter-psi.vercel.app/" },
      { label: "Source", href: "https://github.com/ktripathi2281/Skill-Barter" }
    ],
    keywords: "matching geo location mongodb 2dsphere socket.io realtime real-time chat jwt otp rate limiting cors security react express marketplace exchange barter"
  });

  add({
    id: "rideradar", kind: "plate", group: "plate", short: "IV", drawing: "radar", row: 3, col: 1, w: 800, h: 560, stock: "sage",
    no: "Plate IV", title: "Ride Radar", kicker: "Real-time group trip tracker",
    meta: [
      ["Context", "Independent project"],
      ["Medium", "Socket.io, React Leaflet, OpenStreetMap; Express, MongoDB"],
      ["Dimensions", "Per-trip rooms · 1,000-point trails"]
    ],
    description: "A live map for groups riding together. Each rider's position, battery level and SOS alerts reach everyone in the group in real time, and a rider who loses signal fades to their last known position instead of disappearing.",
    notes: [
      "JWT is checked at the socket handshake, and every event stays inside its trip's room.",
      "Location trails are capped at 1,000 points per rider, so history stays a constant size."
    ],
    caption: "Five riders make their way to a shared checkpoint across a map grid. One stops, and the group sees it at once.",
    hint: "Hover the red rings to read the SOS.",
    links: [
      { label: "Visit", href: "https://ride-radar-sand.vercel.app/" },
      { label: "Source", href: "https://github.com/ktripathi2281/RideRadar" }
    ],
    keywords: "realtime real-time live map maps leaflet openstreetmap socket.io sos riders trip tracker gps location jwt express mongodb react"
  });

  /* ================================================================ essays */
  add({
    id: "essay-kavach", kind: "essay", group: "essay", short: "E·I", row: 3, col: 4, w: 560, h: 440, stock: "blush",
    no: "Essay I", title: "Confidently wrong", kicker: "Building an AI assistant a fraud victim can rely on at 2 a.m.",
    project: "Kavach", collaborator: "Ashutosh Kumar", plate: "kavach",
    lead: "Kavach started as a better cybercrime complaint form, and we threw that version away.",
    excerpt: "Kavach started as a better cybercrime complaint form, and we threw that version away. Filing the complaint turned out to be about one percent of the job.",
    href: SITE + "/essays/kavach/",
    keywords: "essay writing kavach cybercrime fraud complaint form india language models structure schema guardrails confidently wrong"
  });

  add({
    id: "essay-leetcode", kind: "essay", group: "essay", short: "E·II", row: 4, col: 2, w: 520, h: 440, stock: "butter",
    no: "Essay II", title: "Show your work", kicker: "An AI study coach with a small world, a strict examiner and a paper trail.",
    project: "LeetCode Agent Tracker", plate: "leetcode",
    lead: "Most interview-prep tools sort a list of problems for you.",
    excerpt: "Most interview-prep tools sort a list of problems for you. The hard part of preparing is deciding what to work on this week, getting unstuck without being handed the answer, and finding out that a solution which passed was still the slow one.",
    href: SITE + "/essays/leetcode/",
    keywords: "essay writing leetcode agent agents planner tutor examiner tools audit log read-only small world show your work"
  });

  /* ================================================================ statement */
  add({
    id: "statement", kind: "statement", group: "note", short: "§ 2", row: 3, col: 2, w: 800, h: 480, stock: "ink",
    no: "§ 2", title: "Statement", kicker: "In my own words",
    pull: "The model is the least reliable part of the system. Everything I build around it is designed to hold.",
    body: [
      "I am a software engineer first. At Tata Consultancy Services I work on Java and Spring Boot services for a banking product, where the job is keeping legacy systems fast, correct and debuggable in production. Lately I’ve been bringing the same instincts to language models.",
      "In practice that means typed, schema-validated outputs, guardrails that reject answers contradicting what a user has already confirmed, a deterministic fallback behind every model route, and a log entry for every decision an agent makes. The drawings on this page are made the same way: generated in code, but held inside rules."
    ],
    keywords: "statement philosophy approach reliable guardrails typed outputs fallback logging java spring boot banking tcs"
  });

  /* ================================================================ certificates */
  add({
    id: "cert-architect", kind: "credential", group: "credential", short: "C·I", numeral: "I", row: 1, col: 3, w: 440, h: 540, stock: "lilac",
    no: "Credential I", title: "Claude Certified Architect", kicker: "Foundations",
    description: "For solution architects: designing and building production-grade applications on Claude with Claude Code, the Agent SDK, the Claude API and MCP.",
    issued: "19 September 2026", validThrough: "September 2027", assessment: "Proctored exam",
    covers: "AI system design, multi-agent orchestration, context management, tool & MCP design, production reliability",
    href: "https://www.credly.com/badges/2bfa241d-e6f9-4330-8f23-37c70505c45a/public_url",
    badge: SITE + "/images/badges/claude-architect.png",
    inscription: "Claude Certified Architect · Foundations · MMXXVI · ",
    pattern: { r0: 76, amp: 12, waves: 16, copies: 5 },
    keywords: "certificate certified credential anthropic claude architect mcp agent sdk credly proctored exam badge"
  });

  add({
    id: "cert-developer", kind: "credential", group: "credential", short: "C·II", numeral: "II", row: 1, col: 4, w: 440, h: 540, stock: "sage",
    no: "Credential II", title: "Claude Certified Developer", kicker: "Foundations",
    description: "For developers: building, integrating and shipping production applications and agents on Claude with the Claude API, Claude Code, custom tools and MCP servers.",
    issued: "12 September 2026", validThrough: "September 2027", assessment: "Proctored exam",
    covers: "Agent development, Claude API integration, MCP server development, evals & debugging, application security",
    href: "https://www.credly.com/badges/2e1ecb88-4f11-4f3c-b7cf-a10251856c05/public_url",
    badge: SITE + "/images/badges/claude-developer.png",
    inscription: "Claude Certified Developer · Foundations · MMXXVI · ",
    pattern: { r0: 76, amp: 10, waves: 13, copies: 7, amp2: 4, waves2: 5 },
    keywords: "certificate certified credential anthropic claude developer mcp api evals credly proctored exam badge"
  });

  /* ================================================================ chronology + materials */
  add({
    id: "chronology", kind: "timeline", group: "note", short: "§ 4", drawing: "chronology", row: 4, col: 1, w: 800, h: 430, stock: "lilac",
    no: "§ 4", title: "Chronology", kicker: "Experience & education",
    caption: "Seven years, one tick a month. The bracket above is study, the red bar below is work, and the two red marks are September 2026.",
    hint: "Hover the bracket, the red bar or the marks.",
    entries: [
      { year: "2025", text: "Joins Tata Consultancy Services, Bangalore, as Product Engineer", detail: "Backend modules in Java and Spring Boot for a fintech/banking product. SQL tuning and indexing on critical processes, production debugging, code review, and Jenkins build automation." },
      { year: "2024", text: "B.Tech, Computer Science & Engineering, CGPA 7.9" },
      { year: "2020", text: "Begins at Madan Mohan Malaviya University of Technology, Gorakhpur" }
    ],
    keywords: "chronology experience education timeline tcs tata consultancy services product engineer btech computer science mmmut gorakhpur cgpa jenkins sql"
  });

  add({
    id: "materials", kind: "specimen", group: "note", short: "M·M", row: 3, col: 3, w: 700, h: 540, stock: "cream",
    no: "Materials", title: "Materials & methods", kicker: "What the work is made of",
    rows: [
      ["Models", "OpenAI GPT-5 family, Google Gemini"],
      ["Methods", "Tool calling, agentic workflows, structured outputs, multi-model routing, guardrails, fallbacks, audit logging"],
      ["Languages", "Java, TypeScript, JavaScript, SQL, C++"],
      ["Frameworks", "Spring Boot, Spring Security, Node.js, Express, React, Next.js"],
      ["Data", "PostgreSQL, MongoDB, Redis, MySQL, Supabase"],
      ["Tools", "Docker, GitHub Actions, Jenkins, Git, Linux, Vitest"]
    ],
    // what the sheet itself shows; the wall label has the full list
    glance: [
      ["Models", "GPT-5, Gemini"],
      ["Methods", "Tool calling, guardrails, fallbacks"],
      ["Languages", "Java, TypeScript, SQL"],
      ["Frameworks", "Spring Boot, Node, React"],
      ["Data", "PostgreSQL, MongoDB, Redis"],
      ["Tools", "Docker, Jenkins, Git"]
    ],
    keywords: "skills stack materials methods models gpt gemini java typescript javascript sql c++ spring node express react next.js postgresql mongodb redis mysql supabase docker github actions jenkins git linux vitest"
  });

  /* ================================================================ enquiries */
  add({
    id: "enquiries", kind: "gate", group: "note", short: "§ 5", row: 4, col: 3, w: 520, h: 440, stock: "red",
    no: "§ 5", title: "Enquiries", kicker: "Roles, collaborations, conversations",
    text: "For software or AI engineering roles, or a conversation about backend systems, LLMs and agents, write to",
    keywords: "contact email hire hiring roles enquiries linkedin github resume cv write open to work"
  });

  /* ================================================================ studies: drawings made for the pleasure of it */
  add({
    id: "study-square", kind: "plate", group: "study", short: "S·1", drawing: "wander-square", row: 1, col: 5, w: 500, h: 500, stock: "butter",
    no: "Study 0.1", title: "Held by a square", kicker: "The same wanderer, a different fence",
    meta: [["Boundary", "Square"], ["Steps", "4,000"], ["Held by", "Steering near the edge, a hard stop at it"]],
    description: "The wanderer from Plate 0, with the same four thousand steps and a different fence. A circle is forgiving. A square has corners, and the line has to be steered away from them or it escapes.",
    caption: "One line, four thousand steps, a square boundary. The corners are where it comes closest to leaving.",
    hint: "Hover the line, the boundary or the gate.",
    keywords: "study wander random boundary square contained generative drawing guardrails"
  });

  add({
    id: "study-rosette", kind: "plate", group: "study", short: "S·2", drawing: "rosette", row: 2, col: 4, w: 500, h: 500, stock: "ink",
    no: "Study 0.2", title: "Two rosettes", kicker: "A moiré made of circles",
    meta: [["Method", "Guilloché, the banknote pattern"], ["Bands", "Two"], ["Motion", "One turns in two minutes, the other in a little more than three"]],
    description: "Two bands of interlaced sine rings turn slowly against each other. Nothing is drawn but circles; the pattern is the way they cross.",
    caption: "Two guilloché bands turn in opposite directions. Everything on the sheet is a circle whose radius rises and falls.",
    hint: "Hover either band.",
    keywords: "study rosette guilloche moire circles pattern generative banknote seal"
  });

  add({
    id: "study-hex", kind: "plate", group: "study", short: "S·3", drawing: "wander-hex", row: 4, col: 4, w: 500, h: 500, stock: "sky",
    no: "Study 0.3", title: "Held by a hexagon", kicker: "Six corners, none of them a trap",
    meta: [["Boundary", "Hexagon"], ["Steps", "4,000"], ["Held by", "Steering near the edge, a hard stop at it"]],
    description: "A hexagon sits between the circle and the square: six corners, none sharp enough to catch the line.",
    caption: "The same wanderer inside a hexagon. It gets everywhere, and it still never gets out.",
    hint: "Hover the line, the boundary or the gate.",
    keywords: "study wander random boundary hexagon contained generative drawing guardrails"
  });

  add({
    id: "study-open", kind: "plate", group: "study", short: "S·4", drawing: "wander-open", row: 4, col: 5, w: 560, h: 440, stock: "ink",
    no: "Study 0.4", title: "Held by nothing", kicker: "The same wanderer, no boundary",
    meta: [["Boundary", "None"], ["Steps", "1,600"], ["Result", "It leaves the page"]],
    description: "The same line with the fence taken away. It is not malicious and it is not broken. It simply goes where its noise takes it, and by the end it has left the page. Nothing is wrong with the model. Nothing is holding it either.",
    caption: "The line wanders for 1,600 steps and leaves the drawing. There is no boundary, and so there is no gate.",
    hint: "Hover the line, or the dashed ring where a boundary would have been.",
    keywords: "study wander random no boundary uncontained open generative drawing guardrails risk"
  });

  /* ================================================================ lay the rows out */
  (function pack() {
    var rows = {};
    sheets.forEach(function (s) { (rows[s.row] = rows[s.row] || []).push(s); });
    var y = ROW_GAP / 2;
    Object.keys(rows).sort(function (a, b) { return a - b; }).forEach(function (r) {
      var items = rows[r].sort(function (a, b) { return a.col - b.col; }), sum = 0, rowH = 0;
      items.forEach(function (s) { sum += s.w; rowH = Math.max(rowH, s.h); });
      var gap = (period.w - sum) / items.length, x = gap / 2;
      items.forEach(function (s) { s.x = Math.round(x); s.y = Math.round(y + (rowH - s.h) / 2); x += s.w + gap; });
      y += rowH + ROW_GAP;
    });
    period.h = Math.round(y - ROW_GAP / 2);
  })();

  return { site: SITE, profile: profile, period: period, sheets: sheets };
})();
