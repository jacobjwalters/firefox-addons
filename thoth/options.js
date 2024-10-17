// options.js
document.getElementById('save').addEventListener('click', () => {
  const urls = document.getElementById('excludedUrls').value.split('\n').filter(url => url.trim() !== '');
  browser.storage.sync.set({ excludedUrls: urls }).then(() => {
    alert('Banned URLs saved.');
  });
});

document.getElementById('load').addEventListener('click', () => {
  browser.storage.sync.get('excludedUrls').then((result) => {
    const urls = result.excludedUrls || [];
    document.getElementById('excludedUrls').value = urls.join('\n');
  });
});

// Load the URLs when the options page is opened
document.addEventListener('DOMContentLoaded', () => {
  browser.storage.sync.get('excludedUrls').then((result) => {
    const urls = result.excludedUrls || [];
    document.getElementById('excludedUrls').value = urls.join('\n');
  });
});
