const userLinks = document.querySelectorAll('a.hnuser')

const usernameExtractor = (link) => {
  const un = link.href.split('user?id=')[1]
  return "hn:" + un
}

injectInfoLinksForUsernames(userLinks, usernameExtractor)

