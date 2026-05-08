#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const languagesDir = path.resolve("languages");
const textDomain = "minimal-map";
const handles = [
  "minimal-map-block-editor",
  "minimal-map-admin",
  "minimal-map-frontend",
];

for (const entry of fs.readdirSync(languagesDir, { withFileTypes: true })) {
  if (
    !entry.isFile() ||
    !entry.name.startsWith(`${textDomain}-`) ||
    !entry.name.endsWith(".po")
  ) {
    continue;
  }

  const poPath = path.join(languagesDir, entry.name);
  const locale = entry.name
    .replace(new RegExp(`^${textDomain}-`), "")
    .replace(/\.po$/, "");
  const messages = extractJsMessages(poPath);

  const payload = JSON.stringify({
    "translation-revision-date":
      getHeaderValue(poPath, "PO-Revision-Date") || "",
    generator: "Emilian Scheel",
    source: "src",
    domain: "messages",
    locale_data: {
      messages: {
        "": {
          domain: "messages",
          lang: locale,
          "plural-forms":
            getHeaderValue(poPath, "Plural-Forms") ||
            "nplurals=2; plural=(n != 1);",
        },
        ...messages,
      },
    },
  });

  for (const handle of handles) {
    const outputPath = path.join(
      languagesDir,
      `${textDomain}-${locale}-${handle}.json`,
    );
    fs.writeFileSync(outputPath, `${payload}\n`);
    console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
  }
}

function extractJsMessages(poPath) {
  const text = fs.readFileSync(poPath, "utf8");
  const blocks = text.split(/\n\n+/).filter(Boolean);
  /** @type {Record<string, string[]>} */
  const messages = {};

  for (const block of blocks) {
    const lines = block.split("\n").filter(Boolean);
    const references = lines
      .filter((line) => line.startsWith("#: "))
      .map((line) => line.slice(3))
      .join(" ");

    if (!references.includes("src/")) {
      continue;
    }

    let index = 0;
    let msgid = null;
    let msgidPlural = null;
    let msgstr = "";
    let msgstr0 = "";
    let msgstr1 = "";

    while (index < lines.length) {
      if (lines[index].startsWith("msgid ")) {
        const parsed = parsePoString(lines, index);
        msgid = parsed.value;
        index = parsed.next;
        continue;
      }

      if (lines[index].startsWith("msgid_plural ")) {
        const parsed = parsePoString(lines, index);
        msgidPlural = parsed.value;
        index = parsed.next;
        continue;
      }

      if (lines[index].startsWith("msgstr ")) {
        const parsed = parsePoString(lines, index);
        msgstr = parsed.value;
        index = parsed.next;
        continue;
      }

      if (lines[index].startsWith("msgstr[0] ")) {
        const parsed = parsePoString(lines, index);
        msgstr0 = parsed.value;
        index = parsed.next;
        continue;
      }

      if (lines[index].startsWith("msgstr[1] ")) {
        const parsed = parsePoString(lines, index);
        msgstr1 = parsed.value;
        index = parsed.next;
        continue;
      }

      index += 1;
    }

    if (!msgid) {
      continue;
    }

    messages[msgid] = msgidPlural ? [msgstr0, msgstr1] : [msgstr];
  }

  return messages;
}

function parsePoString(lines, start) {
  let value = "";
  let index = start;

  value += JSON.parse(lines[index].replace(/^[^\"]*\"/, '"'));
  index += 1;

  while (index < lines.length && lines[index].startsWith('"')) {
    value += JSON.parse(lines[index]);
    index += 1;
  }

  return { value, next: index };
}

function getHeaderValue(poPath, headerName) {
  const text = fs.readFileSync(poPath, "utf8");
  const match = text.match(new RegExp(`"${headerName}: ([^\\\\n]+)\\\\n"`));

  return match ? match[1] : "";
}
