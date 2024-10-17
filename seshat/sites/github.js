const userLinks = Array.prototype.concat(
  ...document.querySelectorAll('a.author'),
  ...document.querySelectorAll('span.p-nickname'),
  ...document.querySelectorAll('a.f5'),
)

const usernameExtractor = (link) => {
  const un = link.textContent
  return "github:" + un
}

injectInfoLinksForUsernames(userLinks, usernameExtractor)

console.log("GitHub script loaded", userLinks)
