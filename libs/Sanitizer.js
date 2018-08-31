class Sanitizer {
  static escapeHTML(str) {
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return String(str).replace(/[&<>"'`=\/]/g, (s) => entityMap[s]);
  }
}

module.exports = Sanitizer;