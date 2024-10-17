const userLinks = document.querySelectorAll('span.update-components-actor__name')

const usernameExtractor = (link) => {
  const usernameSpan = element.querySelector('span[aria-hidden="true"]')
  return "linkedin:" + usernameSpan.textContent.trim()
}

injectInfoLinksForUsernames(userLinks, usernameExtractor)

