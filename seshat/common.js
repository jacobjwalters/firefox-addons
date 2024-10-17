function log(...args) {
  console.log("[seshat]", ...args)
}
function err(...args) {
  console.error("[seshat]", ...args)
}


// Save data to IndexedDB
async function saveToDB(uuid, userProfile) {
  return new Promise((resolve, reject) => {
    const data = {}
    data[uuid] = userProfile
    browser.storage.local.set(data, () => {
      if (browser.runtime.lastError) {
        reject(browser.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

// Load data from IndexedDB
async function loadFromDB(uuid) {
  return new Promise((resolve, reject) => {
    browser.storage.local.get(uuid, (result) => {
      if (browser.runtime.lastError) {
        reject(browser.runtime.lastError)
      } else {
        resolve(result)
      }
    })
  })
}

async function deleteFromDB(uuid) {
  return new Promise((resolve, reject) => {
    browser.storage.local.remove(uuid, () => {
      if (browser.runtime.lastError) {
        reject(browser.runtime.lastError)
      } else {
        resolve()
      }
    })
  })
}

async function saveUser(user) {
  return saveToDB(user.uuid, user)
}

async function newUser(un) {
  const username = un.split(':').pop()
  const uuid = self.crypto.randomUUID()
  const user = { "uuid": uuid, "name": username, "profiles": [un], "notes": [] }
  await saveUser(user)
  log("Created", user)
  return user
}

async function getUserByUUID(uuid) {
  const res = await loadFromDB(uuid)
  return res[uuid] || null
}

async function getUserByUsername(un, createIfMissing=true) {
  const res = await loadFromDB(null)
  for (const [uuid, user] of Object.entries(res)) {
    for (const profile of user.profiles) {
      if (profile === un) {
        return user
      }
    }
  }

  return createIfMissing ? newUser(un) : null
}

async function addNoteToUser(un, text) {
  const user = await getUserByUsername(un)
  const note = { "text": text, "timestamp": Date.now(), "url": window.location.href }
  
  user.notes.unshift(note)  // Insert at the beginning
  await saveUser(user)
  log("Saved note for", un, note)
}

async function updateUserDetail(username, detailKey, newValue) {
  const user = await getUserByUsername(username)
  user[detailKey] = newValue
  await saveUser(user)
  log(`Updated ${detailKey} for ${username}: ${newValue}`)
  // Here you can add the actual implementation to update the user detail
}

// Function to make an element editable
function makeEditable(element, un, detailKey) {
  element.addEventListener('click', function(event) {
    event.stopPropagation()

    const currentValue = element.textContent

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'editable-input'
    input.value = currentValue

    // Replace the element with the input
    element.replaceWith(input)
    input.focus()
    log(element)

    // Function to handle the update
    async function updateValue() {
      const newValue = input.value
      const newElement = document.createElement(element.tagName.toLowerCase())
      newElement.className = element.className
      newElement.textContent = newValue

      // Replace the input with the updated element
      input.replaceWith(newElement)
      await updateUserDetail(un, detailKey, newValue)

      // Reattach the editable functionality
      makeEditable(newElement, un, detailKey)
    }

    // Event listeners to handle the update
    input.addEventListener('blur', updateValue)
    input.addEventListener('keypress', async function(event) {
      if (event.key === 'Enter') {
        event.preventDefault()
        updateValue()
      }
    })
  })
}

async function showInfoBox(event, un) {
  const link = event.currentTarget
  const username = un.split(':').pop()
  const user = await getUserByUsername(un)

  // Remove any existing infobox
  const existingBox = document.querySelector('.info-box')
  if (existingBox) {
    existingBox.remove()
  }

  // Create a new infobox element
  const shadowRoot = document.createElement('div')
  shadowRoot.className = 'info-box'
  const infoBox = shadowRoot.attachShadow({ mode: 'open' })

  // Add the CSS to the infobox
  const req = await fetch(browser.runtime.getURL('/css/info-box-elements.css'))
  const css = await req.text()
  infoBox.innerHTML += `<style>${css}</style>`

  // Fill the infobox with user data
  infoBox.innerHTML += `
    <h3 class="editable" data-detail-key="name">${user.name}</h3>
    <textarea class="note-input" placeholder="Write a note..."></textarea>
  `

  if (user.profiles.length > 0) {
    for (const profile of user.profiles) {
      infoBox.innerHTML += `<p>${profile}</p>`
    }
  }

  if (user.notes.length > 0) {
    infoBox.innerHTML += '<h3>Notes</h3>'
    for (const note of user.notes) {
      const date = new Date(note.timestamp).toLocaleString()
      infoBox.innerHTML += `<p>${date}: ${note.text}</p>`
    }
  }

  // Add merge button
  infoBox.innerHTML += '<button class="merge-button">Merge</button>'
  const mergeButton = infoBox.querySelector('.merge-button')
  mergeButton.addEventListener('click', async function() {
    const otherUsername = prompt('Enter the other username:')
    const otherUser = await getUserByUsername(otherUsername)
    if (!otherUser) {
      if (confirm('User not found. Add as new profile to the current user?')) {
        user.profiles.push(otherUsername)
        await saveUser(user)
      }
      return
    }

    user.profiles = user.profiles.concat(otherUser.profiles)
    user.profiles = [...new Set(user.profiles)]
    
    user.notes = [...user.notes, ...otherUser.notes]
    user.notes.sort((a, b) => b.timestamp - a.timestamp)

    await saveUser(user)
    await deleteFromDB(otherUser.uuid)
    alert('Merged users successfully!')
  })

  // Position the infobox
  const linkRect = link.getBoundingClientRect()
  shadowRoot.style.top = `${linkRect.bottom + window.scrollY + 5}px`
  shadowRoot.style.left = `${linkRect.left + window.scrollX}px`
  shadowRoot.style.position = 'absolute'
  shadowRoot.style.zIndex = '9999'
  shadowRoot.style.backgroundColor = 'white'
  shadowRoot.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.1)'
  shadowRoot.style.padding = '10px'
  shadowRoot.style.borderRadius = '5px'
  shadowRoot.style.width = '300px'
  

  // Append the infobox to the body
  document.body.appendChild(shadowRoot)

  const textarea = infoBox.querySelector('.note-input')
  textarea.addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      addNoteToUser(un, textarea.value)
      shadowRoot.remove()
    }
  })

  const editableElements = infoBox.querySelectorAll('.editable')
  editableElements.forEach(element => {
    const detailKey = element.getAttribute('data-detail-key')
    makeEditable(element, un, detailKey)
  })

  // Event listener to close the infobox when clicking outside of it
  document.addEventListener('click', function onDocumentClick(event) {
    if (!shadowRoot.contains(event.target)) {
      shadowRoot.remove()
      document.removeEventListener('click', onDocumentClick)
    }
  })
}

function injectInfoLinksForUsernames(userLinks, usernameExtractor) {
  userLinks.forEach(async link => {
    const username = usernameExtractor(link)

    const user = await getUserByUsername(username, false)
    let note
    if (user && user.notes.length > 0) {
      note = user.notes[0].text
    }

    const infoBoxSpan = document.createElement('span')
    if (note) infoBoxSpan.textContent += ' | ' + note
    infoBoxSpan.textContent += ' •'
    infoBoxSpan.style.cursor = 'pointer'
    infoBoxSpan.addEventListener('click', function(e) {
      showInfoBox(e, username)
    })
  
    link.insertAdjacentElement('afterend', infoBoxSpan)
  })

  log(`Injected info links for ${userLinks.length} users`)
}
