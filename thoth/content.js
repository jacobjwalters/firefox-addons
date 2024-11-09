let embeddingEndpoint = ''
let thothdEndpoint = ''
let activeTimeThreshold = 60

// Per-page globals
let resultsContainer
let activeTime = 0
let intervalId
let indexed = false
let excluded = false
let count = 0
let pageEmbedding = []
let similarPages

function log(...args) {
  console.log("[thoth]", ...args)
}
function err(...args) {
  console.error("[thoth]", ...args)
}

function loadCSS() {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.type = 'text/css'
  link.href = browser.extension.getURL('style.css')
  document.head.appendChild(link)
}

// Utility function to send a POST request and return the JSON response
async function postRequest(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    log(response)
    throw new Error(`HTTP error on ${url}! status: ${response.status}; response: ${response.toString()}`)
  }

  return response.json()
}

async function getEmbedding(str) {
  try {
    let res = await postRequest(embeddingEndpoint, { content: str })
    return res['embedding']
  } catch (error) {
    err('Error during embedding:', error)
  }
}

// Function to handle embedding and sending data to the server
async function processPage(article, text) {
  try {
    if (pageEmbedding.length === 0)
      pageEmbedding = await getEmbedding(text)

    const tab = await browser.runtime.sendMessage({ command: "get-tab-info" })

    return {
      content: {
        title: tab.title,
        url: tab.url,
        body: text,
        access_time: Date.now(),
        embedding: pageEmbedding,
      },
    }
  } catch (error) {
    err('Error during page processing:', error)
  }
}

async function index(data) {
  try {
    return await postRequest(thothdEndpoint+'/index-webpage', data)
  } catch (error) {
    err('Error during indexing:', error)
  }
}

async function query(ty, e) {
  try {
    res = await postRequest(thothdEndpoint+"/query", { "query_type": ty, "embedding": e })
    return res
  } catch (error) {
    err('Error during querying:', error)
  }
}

// Main function to extract reader content and send it to the server
async function indexPage() {
  const doc = document.cloneNode(true)
  const reader = new Readability(doc)
  const article = reader.parse()

  if (article) {
    const start_t = Date.now()

    // Handle embedding and sending data to the server
    pageDetails = await processPage(article, article.textContent)
    const embed_t = Date.now()

    const response = await index(pageDetails)

    count += urlCount(window.location.href)
    await displayCount()

    log('Server response:', response)
    log(`Time taken: ${embed_t - start_t}ms embed + ${Date.now() - embed_t}ms index`)
  } else {
    err("Unable to extract reader mode content.")
  }
}

async function search() {
  const doc = document.cloneNode(true)
  const reader = new Readability(doc)
  const article = reader.parse()
  const selection = window.getSelection().toString()

  if (article) {
    const start_t = Date.now()

    let queryEmbedding
    if (selection === "" && pageEmbedding.length > 0) {
      queryEmbedding = pageEmbedding
    } else if (selection === "") {
      queryEmbedding = await getEmbedding(article.textContent)
      pageEmbedding = queryEmbedding
    } else {
      queryEmbedding = await getEmbedding(selection)
    }
                                         
    const embed_t = Date.now()

    if (!similarPages) {
      similarPages = await query("webpages", queryEmbedding)
      log('Server response:', similarPages)
    }
    showResults(similarPages)

    log(`Time taken: ${embed_t - start_t}ms embed + ${Date.now() - embed_t}ms query`)
  } else {
    err("Unable to extract reader mode content.")
  }
}
  


// Function to show the input box
async function showInputBox() {
  let inputBox = document.createElement("div")
  inputBox.id = "queryInputBox"
  inputBox.classList.add("query-input-box")

  inputBox.innerHTML = `
    <input type="text" id="queryInput" class="query-input" placeholder="Enter query" />
    <button id="submitQuery" class="query-button">Submit</button>
    <button id="closeQueryBox" class="query-button">X</button>
    <div id="queryResults" class="query-results"></div>
  `

  document.body.appendChild(inputBox)

  document.getElementById("submitQuery").addEventListener("click", async () => {
    let str = document.getElementById("queryInput").value
    let e = await getEmbedding(str)
    queryEmbedding = '[' + e.toString() + ']'

    let q = `SELECT (title, 1 - (embedding <=> '${queryEmbedding}')) FROM webpages ORDER BY embedding <=> '${queryEmbedding}'`

    let res = await query("webpages", queryEmbedding)

    let resultsBox = document.getElementById("queryResults")
    resultsBox.innerHTML = ""
    for (let entry of res) {
      let title = entry[0]
      let url = entry[1]
      let similarity = entry[2]
      resultsBox.innerHTML += `<a href="${url}" class="query-link">${title}</a> (${similarity})<br>`
    }
  })

  document.getElementById("closeQueryBox").addEventListener("click", () => {
    document.getElementById("queryInputBox").remove()
  })
}

function makeIframe() {
  const existingIframe = document.getElementById('sidebarIframe')
  if (existingIframe) {
    existingIframe.remove()
  }

  const iframeContainer = document.createElement('div')
  iframeContainer.id = 'sidebarIframe'
  iframeContainer.attachShadow({ mode: 'open' })

  Object.assign(iframeContainer.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '300px',
    height: 'calc(100%-40px)',
    border: 'none',
    "border-radius": "10px",
    padding: "10px",
    zIndex: '10000',
    backgroundColor: 'white',
    boxShadow: '0 0 10px rgba(0,0,0,0.5)'
  })

  document.body.appendChild(iframeContainer)

  const initialContent = `
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
      .close-button {
        position: fixed
        top: 10px
        right: 10px
        cursor: pointer
        background-color: #007bff
        color: white
        border: none
        border-radius: 4px
        padding: 8px 15px
      }
      .content {
        margin-top: 50px
      }
    </style>
    <button class="close-sidebar">X</button>
    <div class="content"></div>
  `

  const wrapper = document.createElement('div')
  wrapper.innerHTML = initialContent

  iframeContainer.shadowRoot.appendChild(wrapper)

  contentContainer = iframeContainer.shadowRoot.querySelector('.content')

  const closeButton = iframeContainer.shadowRoot.querySelector('.close-sidebar')
  closeButton.addEventListener('click', () => {
    iframeContainer.remove()
  })
}

function showResults(res) {
  // res in format [(title, url, similarity), ...]
  makeIframe()

  for (let r of res) {
    let title = r[0]
    let url = r[1]
    let similarity = r[2]
    contentContainer.innerHTML += `<a href="${url}" class="query-link">${title} (${similarity})</a><p></p>`
  }
}

function isUrlExcluded(url, excludedUrls) {
  return excludedUrls.some(excludedUrl => url.includes(excludedUrl))
}

async function isUrlIndexed(url) {
  try {
    res = await postRequest(thothdEndpoint+"/is_indexed", { "url": url })
    return res['indexed'][0]
  } catch (error) {
    err('Error during indexing check:', error)
  }
}

async function urlCount(url) {
  try {
    res = await postRequest(thothdEndpoint+"/is_indexed", { "url": url })
    return res['count']
  } catch (error) {
    err('Error during counting:', error)
  }
}


function displayNum(n) {
  browser.runtime.sendMessage({ command: "display-val",
                                val: n,
                                excluded: excluded,
                                indexed: indexed
                              })
}

function displayCount() {
  displayNum(count)
}

async function startTimer() {
  intervalId = setInterval(async () => {
    if (document.visibilityState !== 'visible') {
      stopTimer()
    }

    activeTime += 1

    displayNum(activeTimeThreshold - activeTime)

    if (activeTime >= activeTimeThreshold && !indexed) {
      log(`Page has been active for ${activeTime}s. Indexing...`)
      clearInterval(intervalId)
      indexed = true
      await indexPage()
      displayCount()
    }
  }, 1000)
}

function stopTimer() {
  clearInterval(intervalId)
  activeTime = 0
}

async function initTimer() {
  const storage = await browser.storage.sync.get('options')
  const excludedUrls = storage.options.excludedUrls || []
  const currentUrl = window.location.href

  if (isUrlExcluded(currentUrl, excludedUrls)) {
    log('This URL is excluded. Skipping auto-index.')
    return
  }

  if (indexed) {
    log('This URL is already indexed. Skipping auto-index.')
    return
  }

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && !indexed) {
      log('Starting timer...')
      startTimer()
      displayCount()
    } else {
      log('Stopping timer...')
      stopTimer()
    }
  })

  if (document.visibilityState === 'visible' && !indexed) {
    log('Page not yet indexed. Starting timer for auto-index...')
    startTimer()
  }
}

// Listen for messages from the background script
browser.runtime.onMessage.addListener(async (message) => {
  log("Message received in content script:", message)
  if (message.command === "index-page") {
    stopTimer()
    await indexPage()
  }
  if (message.command === "search-contents-selection") {
    search()
  }
  if (message.command === "show-input-box") {
    showInputBox()
  }
  if (message.command === "browser-action-clicked") {
    search()
  }
  if (message.command === "url-changed") {
    stopTimer()
    await initAddon()
    if (document.visibilityState === 'visible' && !indexed) {
      startTimer()
    }
    displayCount()
  }
})

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    displayCount()
  }
})

async function initAddon() {
  const url = window.location.href
  const storage = await browser.storage.sync.get('options')

  if (storage.options === undefined) {
    alert('thoth: You need to set your endpoints!')
  }
  const options = storage.options

  activeTimeThreshold = options.activeTimeThreshold || 60;
  thothdEndpoint = options.thothdEndpoint || ''
  embeddingEndpoint = options.embeddingEndpoint || ''
  const excludedUrls = options.excludedUrls || []

  excluded = isUrlExcluded(url, excludedUrls)
  indexed = await isUrlIndexed(url)
  if (indexed || excluded) {
    count = await urlCount(url)
  } else {
    count = activeTimeThreshold
  }
}

async function run() {
  await initAddon()
  displayCount()
  loadCSS()
  await initTimer()
  log("addon loaded")
}

run()

