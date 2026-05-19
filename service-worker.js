chrome.action.onClicked.addListener(async (tab) => {
  // Guard: can't inject into chrome://, edge://, or the extensions page
  if (!tab.url || !tab.url.startsWith("http")) {
    console.warn("ILLiad Helper: cannot run on this page:", tab.url);
    return;
  }

  // Extract citation data from the current page
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractCitation,
  });

  if (!results?.[0]?.result) {
    console.error("ILLiad Helper: no citation data returned from page.");
    return;
  }

  const text = results[0].result;

  // Read the saved default profile (if any) so output.js can pre-select it
  const stored = await chrome.storage.local.get("defaultProfile");

  // Store citation and active profile together, then open the output page
  await chrome.storage.session.set({
    citation:      text,
    activeProfile: stored.defaultProfile || null
  });

  chrome.tabs.create({ url: chrome.runtime.getURL("output.html") });
});

function extractCitation() {
  const meta = s => document.querySelector(`meta[${s}]`)?.content || "";
  const grep = re => (document.body.textContent.match(re) || [])[0] || "";

  const cite = {
    author:  meta('name="citation_author"') ||
             meta('name="dc.creator"') ||
             meta('name="author"'),
    doi:     meta('name="citation_doi"') ||
             meta('name="dc.identifier"') ||
             meta('property="og:url"').match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i)?.[0] ||
             grep(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i),
    title:   meta('name="citation_title"') ||
             meta('name="dc.title"') ||
             meta('property="og:title"') ||
             document.querySelector("h1")?.textContent.trim() ||
             document.title,
    journal: meta('name="citation_journal_title"') ||
             meta('name="dc.source"') ||
             meta('name="journal_title"') ||
             meta('property="og:site_name"'),
    date:    meta('name="citation_publication_date"') ||
             meta('name="citation_date"') ||
             meta('name="dc.date"') ||
             meta('name="publication_date"') ||
             grep(/(19|20)\d{2}/),
    volume:  meta('name="citation_volume"'),
    issue:   meta('name="citation_issue"'),
    issn:    meta('name="citation_issn"'),
    spage:   meta('name="citation_firstpage"'),
    epage:   meta('name="citation_lastpage"')
  };

  // Fall back to page-text pattern for pages if meta tags missing
  if (!cite.spage) {
    const m = grep(/\bpp?\.\s*(\d{1,5})[-–](\d{1,5})/i).match(/\d{1,5}/g);
    if (m) [cite.spage, cite.epage] = m;
  }

  const year  = (cite.date || "").slice(0, 4);
  const pages = [cite.spage, cite.epage].filter(Boolean).join("-");

  return [
    `Article Title: ${cite.title || ""}`,
    `First Author: ${cite.author || ""}`,
    `Year: ${year}`,
    `Publication Title: ${cite.journal || ""}`,
    `Volume: ${cite.volume || ""}`,
    `Issue: ${cite.issue || ""}`,
    `Pages: ${pages}`,
    `DOI: ${cite.doi || ""}`,
    `ISSN: ${cite.issn || ""}`,
    `Other Notes: DOI: ${cite.doi || ""}`,
    `Where did you find this citation?: DOI: ${cite.doi || ""}`
  ].filter(line => !line.endsWith(": ")).join("\n");
}