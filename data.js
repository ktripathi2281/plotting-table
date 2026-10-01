// Everything on the table lives here: the sheets, where they sit, and what they say.
// Content is taken from the portfolio (kauswhynot.vercel.app); positions are in world units
// on a 4000 x 2500 sheet. One grid square is 100 units.
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
    source: "https://github.com/ktripathi2281/kaustubh-tripathi",
    lede: "I build dependable software, including language-model systems that hold their shape when the model doesn't."
  };

  var world = {
    w: 4000, h: 2500, inset: 26,
    bounds: { x0: -260, y0: -260, x1: 4900, y1: 2700 },
    gate: { x: 4000, y: 1540, half: 36 }
  };

  var sheets = [];
  function add(s) { sheets.push(s); return s; }

  /* ---------------------------------------------------------------- the title block */
  add({
    id: "title", kind: "title", group: "note", short: "—",
    no: "Title", title: profile.name, kicker: profile.role,
    x: 200, y: 180, w: 1000, h: 620,
    keywords: "profile about introduction bangalore tcs product engineer software ai engineer open to roles hire resume cv"
  });

  /* ---------------------------------------------------------------- plate 0 */
  add({
    id: "model", kind: "plate", group: "plate", short: "0", drawing: "model",
    no: "Plate 0", title: "Model, contained", kicker: "The frontispiece",
    x: 1400, y: 140, w: 560, h: 740,
    description: "A single line wanders for 4,000 random steps and never leaves its boundary. The red line is the only way out, through a gate. This is how I build with AI.",
    caption: "A single line wanders for 4,000 random steps and never leaves its boundary. The red line is the only way out, through a gate. This is how I build with AI.",
    hint: "Hover over or tap any part of a drawing to read it.",
    keywords: "ai llm model boundary guardrails schema validation contained safety gate random wander structured outputs"
  });

  /* ---------------------------------------------------------------- plates I - IV */
  add({
    id: "kavach", kind: "plate", group: "plate", short: "I", drawing: "kavach",
    no: "Plate I", title: "Kavach", kicker: "AI cybercrime support platform",
    x: 240, y: 1080, w: 800, h: 640,
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
    id: "leetcode", kind: "plate", group: "plate", short: "II", drawing: "agent",
    no: "Plate II", title: "LeetCode Agent Tracker", kicker: "Autonomous interview-prep platform",
    x: 1200, y: 1200, w: 800, h: 640,
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
    id: "skillbarter", kind: "plate", group: "plate", short: "III", drawing: "barter",
    no: "Plate III", title: "Skill Barter", kicker: "Peer-to-peer skill exchange",
    x: 2160, y: 1060, w: 800, h: 640,
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
    id: "rideradar", kind: "plate", group: "plate", short: "IV", drawing: "radar",
    no: "Plate IV", title: "Ride Radar", kicker: "Real-time group trip tracker",
    x: 3100, y: 1220, w: 800, h: 640,
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

  /* ---------------------------------------------------------------- essays */
  add({
    id: "essay-kavach", kind: "essay", group: "essay", short: "E·I",
    no: "Essay I", title: "Confidently wrong", kicker: "Building an AI assistant a fraud victim can rely on at 2 a.m.",
    project: "Kavach", collaborator: "Ashutosh Kumar", plate: "kavach",
    excerpt: "Kavach started as a better cybercrime complaint form, and we threw that version away. Filing the complaint turned out to be about one percent of the job.",
    href: SITE + "/essays/kavach/",
    x: 260, y: 1900, w: 560, h: 380,
    keywords: "essay writing kavach cybercrime fraud complaint form india language models structure schema guardrails confidently wrong"
  });

  add({
    id: "essay-leetcode", kind: "essay", group: "essay", short: "E·II",
    no: "Essay II", title: "Show your work", kicker: "An AI study coach with a small world, a strict examiner and a paper trail.",
    project: "LeetCode Agent Tracker", plate: "leetcode",
    excerpt: "Most interview-prep tools sort a list of problems for you. The hard part of preparing is deciding what to work on this week, getting unstuck without being handed the answer, and finding out that a solution which passed was still the slow one.",
    href: SITE + "/essays/leetcode/",
    x: 1240, y: 2020, w: 560, h: 380,
    keywords: "essay writing leetcode agent agents planner tutor examiner tools audit log read-only small world show your work"
  });

  /* ---------------------------------------------------------------- statement */
  add({
    id: "statement", kind: "statement", group: "note", short: "§ 2",
    no: "§ 2", title: "Statement", kicker: "In my own words",
    pull: "The model is the least reliable part of the system. Everything I build around it is designed to hold.",
    body: [
      "I am a software engineer first. At Tata Consultancy Services I work on Java and Spring Boot services for a banking product, where the job is keeping legacy systems fast, correct and debuggable in production. Lately I’ve been bringing the same instincts to language models.",
      "In practice that means typed, schema-validated outputs, guardrails that reject answers contradicting what a user has already confirmed, a deterministic fallback behind every model route, and a log entry for every decision an agent makes. The drawings on this page are made the same way: generated in code, but held inside rules."
    ],
    x: 2200, y: 220, w: 760, h: 520,
    keywords: "statement philosophy approach reliable guardrails typed outputs fallback logging java spring boot banking tcs"
  });

  /* ---------------------------------------------------------------- certificates */
  add({
    id: "cert-architect", kind: "credential", group: "credential", short: "C·I", numeral: "I",
    no: "Credential I", title: "Claude Certified Architect", kicker: "Foundations",
    description: "For solution architects: designing and building production-grade applications on Claude with Claude Code, the Agent SDK, the Claude API and MCP.",
    issued: "19 September 2026", validThrough: "September 2027", assessment: "Proctored exam",
    covers: "AI system design, multi-agent orchestration, context management, tool & MCP design, production reliability",
    href: "https://www.credly.com/badges/2bfa241d-e6f9-4330-8f23-37c70505c45a/public_url",
    badge: SITE + "/images/badges/claude-architect.png",
    inscription: "Claude Certified Architect · Foundations · MMXXVI · ",
    pattern: { r0: 76, amp: 12, waves: 16, copies: 5 },
    x: 3120, y: 150, w: 380, h: 540,
    keywords: "certificate certified credential anthropic claude architect mcp agent sdk credly proctored exam badge"
  });

  add({
    id: "cert-developer", kind: "credential", group: "credential", short: "C·II", numeral: "II",
    no: "Credential II", title: "Claude Certified Developer", kicker: "Foundations",
    description: "For developers: building, integrating and shipping production applications and agents on Claude with the Claude API, Claude Code, custom tools and MCP servers.",
    issued: "12 September 2026", validThrough: "September 2027", assessment: "Proctored exam",
    covers: "Agent development, Claude API integration, MCP server development, evals & debugging, application security",
    href: "https://www.credly.com/badges/2e1ecb88-4f11-4f3c-b7cf-a10251856c05/public_url",
    badge: SITE + "/images/badges/claude-developer.png",
    inscription: "Claude Certified Developer · Foundations · MMXXVI · ",
    pattern: { r0: 76, amp: 10, waves: 13, copies: 7, amp2: 4, waves2: 5 },
    x: 3540, y: 270, w: 380, h: 540,
    keywords: "certificate certified credential anthropic claude developer mcp api evals credly proctored exam badge"
  });

  /* ---------------------------------------------------------------- chronology + materials */
  add({
    id: "chronology", kind: "timeline", group: "note", short: "§ 4", drawing: "chronology",
    no: "§ 4", title: "Chronology", kicker: "Experience & education",
    x: 2100, y: 1960, w: 760, h: 470,
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
    id: "materials", kind: "specimen", group: "note", short: "M·M",
    no: "Materials", title: "Materials & methods", kicker: "What the work is made of",
    rows: [
      ["Models", "OpenAI GPT-5 family, Google Gemini"],
      ["Methods", "Tool calling, agentic workflows, structured outputs, multi-model routing, guardrails, fallbacks, audit logging"],
      ["Languages", "Java, TypeScript, JavaScript, SQL, C++"],
      ["Frameworks", "Spring Boot, Spring Security, Node.js, Express, React, Next.js"],
      ["Data", "PostgreSQL, MongoDB, Redis, MySQL, Supabase"],
      ["Tools", "Docker, GitHub Actions, Jenkins, Git, Linux, Vitest"]
    ],
    x: 3000, y: 2000, w: 700, h: 470,
    keywords: "skills stack materials methods models gpt gemini java typescript javascript sql c++ spring node express react next.js postgresql mongodb redis mysql supabase docker github actions jenkins git linux vitest"
  });

  /* ---------------------------------------------------------------- the gate (outside the sheet) */
  add({
    id: "enquiries", kind: "gate", group: "note", short: "§ 5",
    no: "§ 5", title: "Enquiries", kicker: "Roles, collaborations, conversations",
    text: "For software or AI engineering roles, or a conversation about backend systems, LLMs and agents, write to",
    x: 4200, y: 1300, w: 560, h: 480,
    keywords: "contact email hire hiring roles enquiries linkedin github resume cv write open to work"
  });

  // The red line threads the plates in reading order and leaves through the gate.
  // [from sheet, side, to sheet, side]
  var route = [
    ["title", "e", "model", "w"],
    ["model", "s", "kavach", "n"],
    ["kavach", "e", "leetcode", "w"],
    ["leetcode", "e", "skillbarter", "w"],
    ["skillbarter", "e", "rideradar", "w"],
    ["rideradar", "e", "enquiries", "w"]
  ];

  // Fainter dotted ties: an essay hangs from the plate it is about.
  var ties = [
    ["essay-kavach", "n", "kavach", "s"],
    ["essay-leetcode", "n", "leetcode", "s"]
  ];

  return { site: SITE, profile: profile, world: world, sheets: sheets, route: route, ties: ties };
})();
