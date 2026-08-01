/**
 * Renders a subset of markdown to React elements.
 * Handles: headings (#/##/###), horizontal rules (---), paragraphs,
 * bold (**), inline links ([text](url)), and bullet lists (- item).
 */

function parseInline(text, keyBase) {
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\))/g;
  let last = 0;
  let m;
  let idx = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    if (m[0].startsWith("**")) {
      parts.push(<strong key={`${keyBase}-s${idx}`}>{m[2]}</strong>);
    } else {
      const href = m[4];
      const isExternal = href.startsWith("http");
      parts.push(
        <a
          key={`${keyBase}-a${idx}`}
          href={href}
          {...(isExternal
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className="text-accent underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          {m[3]}
        </a>
      );
    }
    last = m.index + m[0].length;
    idx++;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}

export function MarkdownRenderer({ content }) {
  const lines = content.split("\n");
  const elements = [];
  let paraLines = [];
  let listItems = [];
  let key = 0;

  function flushList() {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1 mb-5 text-[#44403C] dark:text-[#D6D3D1]">
        {listItems.map((item, i) => (
          <li key={i} className="font-space-grotesk text-base leading-relaxed">
            {parseInline(item, `li-${key}-${i}`)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  function flushPara() {
    if (paraLines.length === 0) return;
    const text = paraLines.join(" ");
    paraLines = [];
    elements.push(
      <p key={`p-${key++}`} className="font-space-grotesk text-base leading-relaxed mb-5 text-[#44403C] dark:text-[#D6D3D1]">
        {parseInline(text, `pi-${key}`)}
      </p>
    );
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      flushPara(); flushList();
      elements.push(
        <h3 key={`h3-${key++}`} className="font-space-grotesk font-semibold text-lg mt-8 mb-3 text-[#1C1917] dark:text-[#E7E5E4]">
          {parseInline(line.slice(4), `h3-${key}`)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      flushPara(); flushList();
      elements.push(
        <h2 key={`h2-${key++}`} className="font-instrument-serif text-2xl sm:text-3xl mt-10 mb-4 text-[#1C1917] dark:text-[#E7E5E4]">
          {parseInline(line.slice(3), `h2-${key}`)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      flushPara(); flushList();
      elements.push(
        <h1 key={`h1-${key++}`} className="font-instrument-serif text-3xl sm:text-4xl lg:text-5xl mb-6 text-[#1C1917] dark:text-[#E7E5E4] leading-tight tracking-[-0.5px]">
          {parseInline(line.slice(2), `h1-${key}`)}
        </h1>
      );
    } else if (line.trim() === "---") {
      flushPara(); flushList();
      elements.push(
        <hr key={`hr-${key++}`} className="my-8 border-[#D1CDC7] dark:border-[#2C2825]" />
      );
    } else if (line.startsWith("- ")) {
      flushPara();
      listItems.push(line.slice(2));
    } else if (line.trim() === "") {
      if (listItems.length > 0) {
        flushList();
      } else {
        flushPara();
      }
    } else {
      if (listItems.length > 0) {
        flushList();
      }
      paraLines.push(line);
    }
  }

  flushPara();
  flushList();

  return <div>{elements}</div>;
}
