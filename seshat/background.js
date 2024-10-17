// List of sites and their corresponding script files
const siteScripts = {
  "news.ycombinator.com": "sites/hn.js",
  "lobste.rs": "sites/lobsters.js",
  "linkedin.com": "sites/linkedin.js",
  //"discord.com": "sites/discord.js",  // BROKEN: discord only gives the nickname, not the profile name
  "types.pl": "sites/types.pl.js",
  "github.com": "sites/github.js",
}

function injectSiteScript(tabId, url) {
  const domain = new URL(url).hostname
  for (const [site, scriptPath] of Object.entries(siteScripts)) {
    if (domain.includes(site)) {
      chrome.tabs.executeScript(tabId, { file: 'common.js' }, function() {
        chrome.tabs.executeScript(tabId, { file: scriptPath });
      });
      break
    }
  }
}

async function addCSS(tabId) {
  try {
    await browser.scripting.insertCSS({
      target: { tabId: tabId },
      files: ["/css/info-box.css"],
      origin: "USER" })
  } catch (e) {
    console.error("Failed to insert CSS", e)
  }
}

chrome.webNavigation.onCompleted.addListener((details) => {
  injectSiteScript(details.tabId, details.url)
  //addCSS(details.tabId)
}, { url: [{ urlMatches: '.*' }] })
