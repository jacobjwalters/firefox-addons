const userLinks = document.querySelectorAll('span.username_f9f2ca')

const usernameExtractor = (link) => {
  return "discord:" + link.textContent.trim()
}

injectInfoLinksForUsernames(userLinks, usernameExtractor)

