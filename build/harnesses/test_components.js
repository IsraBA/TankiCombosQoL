// הקומפוננטות המשותפות החדשות: כפתור, סליידר ודיאלוג, מעל DOM מזויף.
// מה שנבדק: המבנה שה-CSS מצפה לו, שכל דרך סגירה סוגרת פעם אחת בלבד,
// שהסליידר צובע את המילוי לפי הערך, ושמודל המחיקה מתחווט נכון.
// node build/harnesses/test_components.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { makeFakeDom } = require("./fake_dom");

const EXT =
  "c:/Users/User/Documents/programming/Tanki Extensions/Combos Extension/TankiCombosQoL";
const FILES = [
  "shared/components/button.js",
  "shared/components/slider.js",
  "shared/components/dialog.js",
  "features/combos/view/panels/delete_combo_modal.js",
  "features/combos/view/panels/import_export.js",
];

let failures = 0;
function ok(label, cond) {
  console.log((cond ? "OK  " : "FAIL") + "   " + label);
  if (!cond) failures++;
}

function makeEnv() {
  const dom = makeFakeDom();
  const ctx = {
    console: { log() {}, error() {} },
    Promise,
    document: dom.document,
    chrome: { storage: { local: { get(k, cb) { cb({}); }, set(o, cb) { if (cb) cb(); } } } },
    Blob: function () {},
    URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
  };
  ctx.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(
    "globalThis.window = globalThis; window.TankiQoL = { LanguageManager: { getUIText: (k) => 'T:' + k, getCurrentLanguageCode: () => 'en' } };",
    ctx,
  );
  for (const f of FILES) {
    vm.runInContext(fs.readFileSync(path.join(EXT, f), "utf8"), ctx, { filename: f });
  }
  return { ctx, dom, Q: ctx.window.TankiQoL };
}

// ---- כפתור ----

let env = makeEnv();
let clicks = 0;
const btn = env.Q.Button.create({ text: "Go", variant: "secondary", onClick: () => clicks++ });
ok("button: base + variant classes", btn.classList.contains("cme_button") && btn.classList.contains("cme_button--secondary"));
ok("button: text lives in its own span", btn.querySelector(".cme_button-text").textContent === "Go");
btn.click();
ok("button: click reaches the handler", clicks === 1);
btn._setDisabled(true);
btn.click();
ok("button: disabled swallows clicks", clicks === 1 && btn.classList.contains("cme_button--disabled"));
const iconBtn = env.Q.Button.create({ iconHtml: "<svg></svg>", variant: "white", className: "cme_button--square" });
ok("button: icon-only hides the empty text span", iconBtn.querySelector(".cme_button-text").style.display === "none");

// ---- סליידר ----

let inputs = [], changes = [];
const sl = env.Q.Slider.create({ label: "Size", min: 50, max: 200, value: 125, onInput: (v) => inputs.push(v), onChange: (v) => changes.push(v) });
const input = sl._input;
ok("slider: title carries label + green value", sl.querySelector(".cme_slider-label").textContent === "Size" && sl.querySelector(".cme_slider-value").textContent === "(125%)");
ok("slider: fill gradient is painted at 50% for the midpoint", /rgb\(255, 188, 9\) 50%/.test(input.style.background));
input.value = "200";
(input.listeners.input || []).forEach((fn) => fn());
ok("slider: input repaints to 100% and reports the value", /9\) 100%/.test(input.style.background) && inputs[0] === 200);
(input.listeners.change || []).forEach((fn) => fn());
ok("slider: change (release) reports separately", changes[0] === 200);
sl._setValue(50);
ok("slider: _setValue repaints to 0%", /9\) 0%,/.test(input.style.background) && sl._getValue() === 50);

// ---- דיאלוג ----

env = makeEnv();
let closedCount = 0, confirmed = 0;
let d = env.Q.Dialog.open({
  id: "dlg", variant: "warning", title: "Reset?", body: "line one\nline two",
  buttons: [
    { text: "Cancel", variant: "secondary", action: "cancel" },
    { text: "OK", variant: "danger", action: "ok", onClick: () => confirmed++ },
  ],
  onClose: () => closedCount++,
});
const root = env.dom.document.getElementById("dlg");
ok("dialog: mounted on body under its id", !!root && root.classList.contains("cme_dialog-root"));
ok("dialog: variant class on the box", !!root.querySelector(".cme_dialog--warning"));
ok("dialog: title text", root.querySelector("h1").textContent === "Reset?");
ok("dialog: body newline becomes a line break", root.querySelector(".cme_dialog-body").querySelector("span").children.some((c) => c.tagName === "BR"));
ok("dialog: two footer buttons with the requested variants",
  root.querySelectorAll(".cme_dialog-button").length === 2 && !!root.querySelector(".cme_button--danger"));
root.querySelector('[data-action="ok"]').click();
ok("dialog: confirm runs the handler and closes", confirmed === 1 && env.dom.document.getElementById("dlg") === null && d.isOpen() === false);
d.close();
env.dom.keydown("Escape");
ok("dialog: onClose fires exactly once, however many times it is closed", closedCount === 1);
ok("dialog: its Escape listener is gone", env.dom.docListeners.length === 0);

d = env.Q.Dialog.open({ id: "dlg2", title: "x", buttons: [{ text: "keep", keepOpen: true, onClick: () => {} }] });
env.dom.document.getElementById("dlg2").querySelector(".cme_dialog-button").click();
ok("dialog: keepOpen leaves it open", d.isOpen() === true);
env.dom.keydown("Escape");
ok("dialog: Escape closes it", d.isOpen() === false);

// ---- מודל המחיקה על הדיאלוג ----

env = makeEnv();
let deleted = null;
env.Q.DeleteComboModal.show(42, "Sniper", (id) => { deleted = id; });
let dr = env.dom.document.getElementById("cme_modal-root");
ok("delete modal: opens as a danger dialog with the translated title", !!dr && dr.querySelector("h1").textContent.includes("T:deleteComboModalTitle") && !!dr.querySelector(".cme_dialog--danger"));
dr.querySelector('[data-action="cancel"]').click();
ok("delete modal: cancel does not delete", deleted === null && env.dom.document.getElementById("cme_modal-root") === null);
env.Q.DeleteComboModal.show(42, "Sniper", (id) => { deleted = id; });
env.dom.document.getElementById("cme_modal-root").querySelector('[data-action="delete"]').click();
ok("delete modal: delete confirms with the combo id and closes", deleted === 42 && env.dom.document.getElementById("cme_modal-root") === null);

// ---- ייבוא: הודעת שגיאה ובחירת פעולה ----

env.Q.ImportExport.processImportedFile("not json");
let ir = env.dom.document.getElementById("cme_import-modal-root");
ok("import: invalid file opens the error dialog", !!ir && ir.textContent.includes("T:importInvalidFile"));
env.Q.ImportExport.hideModal();
ok("import: hideModal closes it", env.dom.document.getElementById("cme_import-modal-root") === null);

console.log(failures ? `\n${failures} check(s) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
