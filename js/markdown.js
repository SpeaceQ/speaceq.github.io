/* ===================================================================
   THE MARGINALIA — tiny local markdown parser
   No external dependencies. Supports headings, paragraphs, lists,
   blockquotes, code blocks, inline code, emphasis, strong, links,
   horizontal rules, and line breaks.
   =================================================================== */

(function (root) {
  "use strict";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function slugify(text) {
    return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
  }

  function inlineHtml(text) {
    // code `...`
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    // strong **...** or __...__
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    // emphasis *...* or _..._  (but not inside words)
    text = text.replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, "$1<em>$2</em>$3");
    text = text.replace(/(^|[^_])_([^_]+)_([^_]|$)/g, "$1<em>$2</em>$3");
    // links [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    // line breaks
    text = text.replace(/  \n/g, "<br>\n");
    return text;
  }

  function parse(md) {
    const rawLines = md.replace(/\r\n/g, "\n").split("\n");
    const lines = [];
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (line.startsWith("```")) {
        const lang = line.slice(3).trim();
        let code = [];
        i++;
        while (i < rawLines.length && !rawLines[i].startsWith("```")) {
          code.push(rawLines[i]);
          i++;
        }
        lines.push({ type: "code", lang: lang, content: code.join("\n") });
      } else {
        lines.push({ type: "text", content: line });
      }
    }

    const blocks = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      if (line.type === "code") {
        blocks.push(line);
        i++;
        continue;
      }

      const content = line.content;

      // blank
      if (!content.trim()) {
        i++;
        continue;
      }

      // horizontal rule
      if (/^(---|___|\*\*\*)\s*$/.test(content)) {
        blocks.push({ type: "hr" });
        i++;
        continue;
      }

      // heading
      const headingMatch = content.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const id = slugify(text);
        blocks.push({ type: "h" + level, content: inlineHtml(escapeHtml(text)), id: id });
        i++;
        continue;
      }

      // blockquote
      if (content.startsWith(">")) {
        const quoteLines = [];
        while (i < lines.length && lines[i].content.startsWith(">")) {
          quoteLines.push(lines[i].content.replace(/^>\s?/, ""));
          i++;
        }
        blocks.push({ type: "blockquote", content: parse(quoteLines.join("\n")) });
        continue;
      }

      // unordered list
      if (/^[-*+]\s+/.test(content)) {
        const items = [];
        while (i < lines.length && /^[-*+]\s+/.test(lines[i].content)) {
          items.push(lines[i].content.replace(/^[-*+]\s+/, ""));
          i++;
        }
        blocks.push({ type: "ul", items: items.map(item => inlineHtml(escapeHtml(item))) });
        continue;
      }

      // ordered list
      if (/^\d+\.\s+/.test(content)) {
        const items = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].content)) {
          items.push(lines[i].content.replace(/^\d+\.\s+/, ""));
          i++;
        }
        blocks.push({ type: "ol", items: items.map(item => inlineHtml(escapeHtml(item))) });
        continue;
      }

      // paragraph
      const paraLines = [];
      while (i < lines.length && lines[i].content.trim() && lines[i].type === "text") {
        paraLines.push(lines[i].content);
        i++;
      }
      blocks.push({ type: "p", content: inlineHtml(escapeHtml(paraLines.join(" "))) });
    }

    return blocks;
  }

  function render(md) {
    const blocks = parse(md);
    let html = "";
    for (const b of blocks) {
      switch (b.type) {
        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":
        case "h6":
          html += `<${b.type} id="${b.id}">${b.content}</${b.type}>\n`;
          break;
        case "p":
          html += `<p>${b.content}</p>\n`;
          break;
        case "blockquote":
          html += `<blockquote>\n${b.content}</blockquote>\n`;
          break;
        case "ul":
          html += "<ul>\n" + b.items.map(item => `<li>${item}</li>`).join("\n") + "\n</ul>\n";
          break;
        case "ol":
          html += "<ol>\n" + b.items.map(item => `<li>${item}</li>`).join("\n") + "\n</ol>\n";
          break;
        case "code":
          html += `<pre><code${b.lang ? ` class="language-${b.lang}"` : ""}>${escapeHtml(b.content)}</code></pre>\n`;
          break;
        case "hr":
          html += "<hr>\n";
          break;
      }
    }
    return html;
  }

  const Markdown = { parse: parse, render: render };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Markdown;
  }
  root.Markdown = Markdown;
})(typeof window !== "undefined" ? window : this);
