

// 1. Setup: shortcuts and shared data 

// Shortcut: $("welcome") instead of document.getElementById("welcome")
const $ = id => document.getElementById(id);

// Everything the app knows lives here. It is replaced with fresh data from the backend after every change.
let state = { name: "", items: [], categories: [] };

// One helper for all backend calls (GET, POST, PUT, DELETE).
// Sends a form (for photo uploads) or JSON, and returns { ok, data }.
async function api(url, method = "GET", body) {
  const opts = { method };
  if (body instanceof FormData) opts.body = body;
  else if (body) { opts.body = JSON.stringify(body); opts.headers = { "Content-Type": "application/json" }; }
  const res = await fetch(url, opts);
  return { ok: res.ok, data: await res.json() };
}

// 2. Small helpers that build HTML

// All tags of one item = its category + its extra tags
const allTags = i => [i.category, ...i.tags].filter(Boolean);

// Turns an item's tags into little pink chips
const chips = i => allTags(i).map(t => `<span class="chip">${t}</span>`).join("");

// <option> list for a category dropdown (the fixed list from the backend)
const categoryOptions = selected => state.categories.map(c => `<option ${c === selected ? "selected" : ""}>${c}</option>`).join("");

// Outfit slots (hat, top, bottom, shoes) come from the backend as state.slots.
// Each slot only draws pieces from its own categories (set in app.py).
let outfit = {};   // current piece in each slot, e.g. outfit.hat
let locked = {};   // locked slots are skipped when spinning

// Top half of an item card (photo, optional name, tag chips).
// The caller adds the buttons and closes the </div>.
const card = i => `<div class="item"><img src="/uploads/${i.image}">${i.name ? `<h3>${i.name}</h3>` : ""}<div class="chips">${chips(i)}</div>`;

// 3. Drawing the screens 

// Decides what to show: the setup card (no name yet) or the main app (name saved).
function render() {
  const named = !!state.name;
  $("setup").hidden = named;
  $("app").hidden = !named;
  $("addTop").hidden = !named;   // "+ Add Item" button in the header
  if (!named) return;
  $("welcome").textContent = `Welcome back, ${state.name}!!!`;
  renderWardrobe();
  renderAddCategory();
  renderColorOptions();
  renderSlots();
}

// Draws the wardrobe grid, applying whatever is typed in the search box.
function renderWardrobe() {
  const q = $("search").value.toLowerCase();
  const shown = state.items.filter(i => (i.name + " " + allTags(i).join(" ")).toLowerCase().includes(q));
  $("count").textContent = `${state.items.length} piece${state.items.length === 1 ? "" : "s"}`;
  $("empty").hidden = state.items.length > 0;   // show the "first piece" message only when wardrobe is empty
  // Each card = photo + chips + Edit/Remove buttons + a hidden edit form
  $("grid").innerHTML = shown.map(i => card(i) + `
      <div class="row"><button class="btn small" onclick="toggleEdit('${i.id}')">Edit tags</button><button class="btn small" onclick="removeItem('${i.id}')">Remove</button></div>
      <div class="editor" id="edit-${i.id}" hidden>
        <input id="n-${i.id}" placeholder="Item name" value="${i.name}">
        <select id="c-${i.id}">${categoryOptions(i.category)}</select>
        <input id="t-${i.id}" placeholder="Extra tags, separated by commas" value="${i.tags.join(", ")}">
        <div class="row"><button class="btn small primary" onclick="saveEdit('${i.id}')">Save changes</button><button class="btn small" onclick="toggleEdit('${i.id}')">Done</button></div>
      </div></div>`).join("");
}

// Fills the "Add a piece" category dropdown (keeps the current choice)
function renderAddCategory() {
  $("addCategory").innerHTML = categoryOptions($("addCategory").value);
}

// Fills the OOTD "Color or tag" dropdown with every extra tag in the wardrobe (keeps the current choice)
function renderColorOptions() {
  const sel = $("colorSel"), keep = sel.value;
  const tags = [...new Set(state.items.flatMap(i => i.tags))].sort();
  sel.innerHTML = `<option value="">Any color or tag</option>` + tags.map(t => `<option ${t === keep ? "selected" : ""}>${t}</option>`).join("");
}

// Draws the outfit slots: label, lock checkbox, and the current piece (if any)
function renderSlots() {
  $("slots").innerHTML = state.slots.map(s => `
    <div>
      <div class="slot-head">${s}<label><input type="checkbox" ${locked[s] ? "checked" : ""} onchange="locked['${s}'] = this.checked"> Lock</label></div>
      ${outfit[s] ? card(outfit[s]) + "</div>" : `<div class="item"><p class="status">Nothing rolled yet.</p></div>`}
    </div>`).join("");
}

// 4. Wardrobe actions (edit, remove, add) 

// Show/hide the edit form under one card
const toggleEdit = id => { $("edit-" + id).hidden = !$("edit-" + id).hidden; };

// "Save changes" in the edit form -> update the item in the backend
async function saveEdit(id) {
  const body = { name: $("n-" + id).value, category: $("c-" + id).value, tags: $("t-" + id).value };
  state = (await api("/api/items/" + id, "PUT", body)).data;
  render();
}

// "Remove" button -> ask first, then delete the item and its photo
async function removeItem(id) {
  if (!confirm("Remove this piece from your wardrobe?")) return;
  state = (await api("/api/items/" + id, "DELETE")).data;
  render();
}

// Open the "Add a piece" form and scroll to it
function openAdd() {
  $("addForm").hidden = false;
  $("photoStatus").textContent = "";
  $("addForm").scrollIntoView({ behavior: "smooth" });
}

// Close the "Add a piece" form and clear what was typed
function closeAdd() {
  $("addForm").hidden = true;
  ["addName", "addCategory", "addTags", "addPhoto"].forEach(id => $(id).value = "");
}

//5. Button and input wiring 

// First-time setup: save the name, then show the app
$("nameBtn").onclick = async () => {
  const name = $("nameInput").value.trim();
  if (!name) { $("setupStatus").textContent = "Please enter your name to continue."; return; }
  state = (await api("/api/name", "POST", { name })).data;
  render();
};

// Both "+ Add Item" (header) and "Add your first piece" open the add form
$("addTop").onclick = $("addFirst").onclick = openAdd;
$("cancelItem").onclick = closeAdd;

// Filter the grid on every keystroke in the search box
$("search").oninput = renderWardrobe;

// "Save piece": check the form, upload photo + details, then refresh
$("saveItem").onclick = async () => {
  if (!$("addPhoto").files[0]) { $("photoStatus").textContent = "Please choose a photo."; return; }
  const form = new FormData();   // FormData is how files are sent to the backend
  form.append("name", $("addName").value);
  form.append("category", $("addCategory").value);
  form.append("tags", $("addTags").value);
  form.append("photo", $("addPhoto").files[0]);
  const res = await api("/api/items", "POST", form);
  if (!res.ok) { $("photoStatus").textContent = res.data.error; return; }
  state = res.data;
  closeAdd();
  render();
};

// Tabs: switch between "My Wardrobe" and "Choose OOTD for me"
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
  document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("active", x === b));
  $("tab-wardrobe").hidden = b.dataset.tab !== "wardrobe";
  $("tab-ootd").hidden = b.dataset.tab !== "ootd";
});

// 6. OOTD "gacha" (with lockable slots)

// "Spin my look": ask the backend for one random piece for each UNLOCKED slot
// (optionally only pieces with the chosen color/tag). Locked slots keep their piece.
$("spin").onclick = async () => {
  const open = state.slots.filter(s => !locked[s]);
  if (open.length === 0) { $("outfitStatus").textContent = "Every slot is locked. Unlock one to spin."; return; }
  const color = $("colorSel").value;
  const picks = (await api(`/api/ootd?slots=${open.join(",")}&color=${encodeURIComponent(color)}`)).data;
  open.forEach((s, n) => outfit[s] = picks[n]);
  renderSlots();
  // Tell the user which slots had nothing to draw
  const empty = open.filter(s => !outfit[s]);
  $("outfitStatus").textContent = empty.length
    ? `Nothing for ${empty.join(", ")}${color ? ` in “${color}”` : ""} yet. Add a matching piece or change the color.`
    : "Here’s your look!";
};

// 7. Start

// When the page opens: load saved data, then draw the right screen
(async () => { state = (await api("/api/state")).data; render(); })();
