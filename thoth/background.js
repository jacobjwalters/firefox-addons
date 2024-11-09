function badgeColour(excluded, indexed) {
  colour = '#0000bc'
  if (excluded)
    colour = '#bc0000'
  if (indexed)
    colour = '#00bc00'

  return colour
}

// Listen for the keyboard command
browser.commands.onCommand.addListener((command) => {
  if (command === "index-page") {
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
      browser.tabs.sendMessage(tabs[0].id, {command: "index-page"})
    })
  }
  if (command === "search-contents-selection") {
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
      browser.tabs.sendMessage(tabs[0].id, {command: "search-contents-selection"})
    })
  }
  if (command === "show-input-box") {
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
      browser.tabs.sendMessage(tabs[0].id, {command: "show-input-box"})
    })
  }
})

// Listen for messages from content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === 'get-tab-info') {
    // Get the current tab's information
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      sendResponse({ url: tab.url, title: tab.title })
    })
    return true; // Keep the message channel open for sendResponse
  }

  if (message.command === 'display-val') {
    console.log("Displaying val", message.val, message.excluded, message.indexed)

    if (message.val) {
      browser.browserAction.setBadgeText({ text: message.val.toString() })
    } else {
      browser.browserAction.setBadgeText({ text: " " })
    }

    const colour = badgeColour(message.excluded, message.indexed)
    browser.browserAction.setBadgeBackgroundColor({ color: colour })
  }
})

browser.browserAction.onClicked.addListener(() => {
  browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
    console.log("sending!")
    browser.tabs.sendMessage(tabs[0].id, {command: "browser-action-clicked"})
  })
})

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    browser.tabs.sendMessage(tabs[0].id, {command: "url-changed"})
  }
})
