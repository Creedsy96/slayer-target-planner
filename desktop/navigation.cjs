'use strict';

const EXTERNAL_HOSTS = new Set(['docs.google.com', 'oldschool.runescape.wiki', 'runelite.net']);

function allowedExternal(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && EXTERNAL_HOSTS.has(url.hostname)
      && !url.username && !url.password && (!url.port || url.port === '443');
  } catch {
    return false;
  }
}

function sameDocument(value, documentUrl) {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.href === documentUrl;
  } catch {
    return false;
  }
}

module.exports = {allowedExternal, sameDocument};
