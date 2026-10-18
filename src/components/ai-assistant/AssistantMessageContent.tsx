import ReactMarkdown, { type Components } from "react-markdown";
import "./assistant-message.css";

type Props = {
  content: string;
};

type TableBlock = { headers: string[]; rows: string[][] };
type Block = { text: string; table?: never } | { table: TableBlock; text?: never };

function cells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/)
    .map(cell => cell.trim().replace(/\\\|/g, "|"));
}

function splitMarkdownTables(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let textLines: string[] = [];
  let fence: { marker: string; length: number } | null = null;
  const flush = () => {
    if (textLines.length) blocks.push({ text: textLines.join("\n") });
    textLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const marker = lines[i].match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = { marker: marker[1][0], length: marker[1].length };
      else if (marker[1][0] === fence.marker && marker[1].length >= fence.length) fence = null;
    }

    if (!fence && !marker && i + 1 < lines.length && lines[i].includes("|")) {
      const headers = cells(lines[i]);
      const divider = cells(lines[i + 1]);
      if (headers.length > 1 && divider.length === headers.length &&
          divider.every(cell => /^:?-{3,}:?$/.test(cell))) {
        flush();
        const rows: string[][] = [];
        i++;
        while (i + 1 < lines.length && lines[i + 1].includes("|") && lines[i + 1].trim()) {
          const row = cells(lines[i + 1]);
          if (row.length !== headers.length) break;
          rows.push(row);
          i++;
        }
        blocks.push({ table: { headers, rows } });
        continue;
      }
    }
    textLines.push(lines[i]);
  }
  flush();
  return blocks;
}

const markdownComponents: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
};

function InlineMarkdown({ content }: { content: string }) {
  return <ReactMarkdown components={{ p: ({ children }) => <span>{children}</span>, ...markdownComponents }}>{content}</ReactMarkdown>;
}

export default function AssistantMessageContent({ content }: Props) {
  return (
    <div className="assistant-message-content" dir="rtl">
      {splitMarkdownTables(content).map((block, index) => block.table ? (
        <div key={index} className="assistant-message-table" role="region" aria-label="جدول في رد المساعد" tabIndex={0}>
          <table>
            <thead><tr>{block.table.headers.map((header, column) => <th key={column} scope="col"><InlineMarkdown content={header} /></th>)}</tr></thead>
            <tbody>{block.table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>{row.map((cell, column) => <td key={column}><InlineMarkdown content={cell} /></td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      ) : <ReactMarkdown key={index} components={markdownComponents}>{block.text}</ReactMarkdown>)}
    </div>
  );
}
