async function save() {
  const activeTimeThreshold = document.getElementById('activeTimeThreshold').value;
  const thothdEndpoint = document.getElementById('thothdEndpoint').value;
  const embeddingEndpoint = document.getElementById('embeddingEndpoint').value;
  const urls = document.getElementById('excludedUrls').value.split('\n').filter(url => url.trim() !== '');

  await browser.storage.sync.set({ options: {
    activeTimeThreshold: activeTimeThreshold,
    thothdEndpoint: thothdEndpoint,
    embeddingEndpoint: embeddingEndpoint,
    excludedUrls: urls
  }});

  alert('Settings saved.');
}

async function load() {
  const result = await browser.storage.sync.get('options');

  if (!result.options) {
    alert('No saved settings to load.')
    return
  }
  const options = result.options;

  const activeTimeThreshold = options.activeTimeThreshold || 60;
  const thothdEndpoint = options.thothdEndpoint || '';
  const embeddingEndpoint = options.embeddingEndpoint || '';
  const urls = options.excludedUrls || [];

  document.getElementById('activeTimeThreshold').value = activeTimeThreshold;
  document.getElementById('thothdEndpoint').value = thothdEndpoint;
  document.getElementById('embeddingEndpoint').value = embeddingEndpoint;
  document.getElementById('excludedUrls').value = urls.join('\n');
}


document.getElementById('save').addEventListener('click', save);
document.getElementById('load').addEventListener('click', load);

// Load the URLs when the options page is opened
document.addEventListener('DOMContentLoaded', load);
