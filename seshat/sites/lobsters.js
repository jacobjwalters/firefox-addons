//const userLinks = document.querySelectorAll('span > a:not(:first-of-type)[href^="/~"]')
const userLinks = Array.prototype.concat(
  ...document.querySelectorAll('span > a:not(:first-of-type)[href^="/~"]'),
  ...document.querySelectorAll('a.u-author'),
)
const usernameExtractor = (link) => {
  const href = link.getAttribute('href')
  const un = href ? href.replace('/~', '') : ''
  return "lobsters:" + un
}

injectInfoLinksForUsernames(userLinks, usernameExtractor)

