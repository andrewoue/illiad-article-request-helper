// ─── Field name → citation key mapping ───────────────────────────────────────
// Maps ILLiad form field IDs to the keys used in the citation text produced
// by service-worker.js. Add new fields here as needed.
const FIELD_MAP = {
  PhotoJournalTitle:          "Publication Title",
  PhotoJournalYear:           "Year",
  PhotoJournalInclusivePages: "Pages",
  PhotoJournalVolume:         "Volume",
  PhotoJournalIssue:          "Issue",
  PhotoJournalMonth:          "Month",
  PhotoArticleAuthor:         "First Author",
  PhotoArticleTitle:          "Article Title",
  ISSN:                       "ISSN",
  ESPNumber:                  "OCLC Number",
  PMID:                       "PMID",
  DOI:                        "DOI",
  Notes:                      "Other Notes",
  CitedIn:                    "Where did you find this citation?"
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Fetch a JSON file bundled with the extension
async function loadJSON(path) {
  const url = chrome.runtime.getURL(path);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

// Parse the citation text (key: value lines) back into a plain object
function parseCitation(text) {
  const fields = {};
  text.split("\n").forEach(line => {
    const idx = line.indexOf(": ");
    if (idx !== -1) {
      fields[line.slice(0, idx).trim()] = line.slice(idx + 2).trim();
    }
  });
  return fields;
}

// Show a temporary message in the profile status span, then clear it
function flashProfileStatus(msg, ms = 2500) {
  const el = document.getElementById("profile-status");
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, ms);
}

// ─── Profile bar setup ───────────────────────────────────────────────────────

async function initProfileBar() {
  const select     = document.getElementById("profile-select");
  const setDefault = document.getElementById("set-default");

  // Load the list of available profiles
  let index;
  try {
    index = await loadJSON("profiles/index.json");
  } catch (e) {
    select.innerHTML = '<option value="">⚠️ Could not load profiles</option>';
    return null;
  }

  // Build the dropdown options
  select.innerHTML = '<option value="">— Select your library —</option>';
  index.profiles.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });

  // Restore active profile from session (set by service-worker from local default)
  // Fall back to reading local storage directly in case the page was refreshed
  const session = await chrome.storage.session.get("activeProfile");
  const local   = await chrome.storage.local.get("defaultProfile");
  const saved   = session.activeProfile || local.defaultProfile || null;

  if (saved) {
    select.value = saved;
    // Only disable "Set as Default" if this matches the persisted local default
    setDefault.disabled = (saved === local.defaultProfile);
  }

  // Enable/disable Set as Default based on whether a real option is selected
  select.addEventListener("change", () => {
    setDefault.disabled = !select.value;
  });

  // Save the current selection as the default
  setDefault.addEventListener("click", async () => {
    const id = select.value;
    if (!id) return;
    await chrome.storage.local.set({ defaultProfile: id });
    setDefault.disabled = true;
    flashProfileStatus("Default saved ✓");
  });

  // Return the currently selected profile id (may be "" if none chosen)
  return () => select.value;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // Set up profile bar and get a getter for the current selection
  const getProfileId = await initProfileBar();

  // Load and display the citation text
  const sessionData = await chrome.storage.session.get("citation");
  const citationEl  = document.getElementById("citation");
  citationEl.textContent = sessionData.citation || "No citation data found.";

  // ── Copy to clipboard ──────────────────────────────────────────────────────
  document.getElementById("copy").addEventListener("click", () => {
  // Strip internal-only fields from clipboard output
  const cleaned = citationEl.textContent
    .split("\n")
    .filter(line => !line.startsWith("Other Notes:") && !line.startsWith("Where did you find this citation?:"))
    .join("\n");

  navigator.clipboard.writeText(cleaned)
    .then(() => {
      document.getElementById("copy").textContent = "Copied!";
      setTimeout(() => {
        document.getElementById("copy").textContent = "Copy to clipboard";
      }, 2500);
    });
  });

  // ── Fill ILLiad tab ────────────────────────────────────────────────────────
  document.getElementById("fill-illiad").addEventListener("click", async () => {
    const btn    = document.getElementById("fill-illiad");
    const status = document.getElementById("status-msg");

    // Make sure we have citation data
    const data = await chrome.storage.session.get("citation");
    if (!data.citation) {
      status.textContent = "No citation data found.";
      return;
    }

    // Make sure a profile is selected
    const profileId = getProfileId();
    if (!profileId) {
      status.textContent = "⚠️ Please select your library first.";
      return;
    }

    // Load the full profile JSON
    let profile;
    try {
      profile = await loadJSON(`profiles/${profileId}.json`);
    } catch (e) {
      status.textContent = "⚠️ Could not load profile for selected library.";
      return;
    }

    const articleForm = profile.articleForm;
    const fields      = parseCitation(data.citation);

    // Build the set of field IDs to fill:
    // required fields + any alwaysPopulate fields that have data
    const fieldsToFill = [
      ...articleForm.requiredFields,
      ...articleForm.alwaysPopulate.filter(f => !articleForm.requiredFields.includes(f))
    ];

    // Look for an open ILLiad tab matching this profile's URL
    const tabs = await chrome.tabs.query({ url: `${profile.illiadUrl}*` });

    if (tabs.length === 0) {
      const loginUrl = `${profile.illiadUrl}logon.html`;
      status.innerHTML = `⚠️ No ILLiad tab found. Please <a href="${loginUrl}" target="_blank">log in to ILLiad</a>, navigate to New Request → Article, then try again.`;
      return;
    }

    const targetTab = tabs[0];
    await chrome.tabs.update(targetTab.id, { active: true });

    await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      func:   fillForm,
      args:   [fieldsToFill, fields, FIELD_MAP],
    });

    status.textContent = "✓ Fields filled! Switch to the ILLiad tab to review and submit.";
    btn.textContent    = "Filled!";
    setTimeout(() => {
      btn.textContent    = "Copy to Open ILLiad Tab";
      status.textContent = "";
    }, 4000);
  });
});

// ─── Injected into the ILLiad tab ────────────────────────────────────────────
// Receives the list of field IDs to fill, the parsed citation data, and the
// field map. Runs in the context of the ILLiad page.
function fillForm(fieldsToFill, citationFields, fieldMap) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  };

  fieldsToFill.forEach(fieldId => {
    const citationKey = fieldMap[fieldId];
    if (citationKey) set(fieldId, citationFields[citationKey]);
  });
}