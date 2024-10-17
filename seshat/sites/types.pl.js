const userLinks = document.querySelectorAll('strong.display-name__html')

const usernameExtractor = (link) => {
  const un = link.textContent
  return "types.pl:" + un
}

injectInfoLinksForUsernames(userLinks, usernameExtractor)

