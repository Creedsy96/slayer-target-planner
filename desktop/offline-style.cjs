'use strict';

function offlineStyle(css) {
  // Font URLs contain semicolons. Remove the complete import line, rather than
  // stopping at the first semicolon and corrupting the following :root rule.
  return css.replace(/^@import[^\r\n]*(?:\r?\n|$)/m, '')
    + '\n.desktop-brand-icon{width:48px;height:48px;object-fit:contain}\n';
}

module.exports = {offlineStyle};
