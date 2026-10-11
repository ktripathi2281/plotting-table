// `mail kaustubh`: the form sends through Web3Forms, which delivers to the
// inbox behind this public access key (safe to publish). If sending fails,
// the visitor's own mail app is offered, with their message filled in.

const KEY = "012be787-faa5-4745-90a7-27775d7a9ca8";
const TO = "tripathikaustubh2281@gmail.com";

const LABELS = { email: "from: needs an email address", name: "name: who should I reply to?", message: "the message needs a few more words" };

export function prefill(subject) {
  const field = document.querySelector('#mail-form [name="subject"]');
  if (field && !field.value) field.value = subject;
}

export function initMail() {
  const form = document.getElementById("mail-form");
  const status = document.getElementById("mail-status");
  const send = document.getElementById("mail-send");
  if (!form) return;

  const say = (html, kind = "") => {
    status.className = `mail-status${kind ? ` is-${kind}` : ""}`;
    status.innerHTML = html;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const field = (k) => String(data.get(k) || "").trim();
    // Bots fill in the hidden box; people never see it.
    if (data.get("botcheck")) {
      form.reset();
      say("250 OK · sent.", "ok");
      return;
    }
    const invalid = [...form.elements].find((el) => el.willValidate && !el.checkValidity());
    if (invalid) {
      say(LABELS[invalid.name] || "check the highlighted field", "err");
      invalid.focus();
      return;
    }

    const name = field("name");
    const email = field("email");
    const subject = field("subject");
    const message = field("message");
    send.disabled = true;
    say("sending…");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: KEY,
          subject: subject ? `${subject} · from ${name}` : `A message from ${name}`,
          from_name: name,
          name,
          email,
          replyto: email,
          message,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`);
      form.reset();
      say(`250 OK · sent. I'll reply to ${email.replace(/[<>&]/g, "")} soon.`, "ok");
    } catch {
      const href = `mailto:${TO}?subject=${encodeURIComponent(subject || `Hello from ${name}`)}&body=${encodeURIComponent(message)}`;
      say(`couldn't send just now. Your message is still here: try again, or <a href="${href}">use your own mail</a>.`, "err");
    } finally {
      send.disabled = false;
    }
  });
}
