#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const DOMAIN = "minimal-map";
const SOURCE_ROOT = path.resolve("src");
const outputPath = path.resolve(
  process.argv[2] || "/tmp/minimal-map-js.pot",
);

/**
 * @typedef {{
 *   singular: string;
 *   plural: string | null;
 *   references: Set<string>;
 * }} PotEntry
 */

/** @type {Map<string, PotEntry>} */
const entries = new Map();

walkDirectory(SOURCE_ROOT);
writePotFile(outputPath, Array.from(entries.values()));

function walkDirectory(directoryPath) {
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      walkDirectory(fullPath);
      continue;
    }

    if (!fullPath.endsWith(".ts") && !fullPath.endsWith(".tsx")) {
      continue;
    }

    parseSourceFile(fullPath);
  }
}

function parseSourceFile(filePath) {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const scriptKind = filePath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );

  visitNode(sourceFile, sourceFile);
}

function visitNode(node, sourceFile) {
  if (ts.isCallExpression(node)) {
    collectCallExpression(node, sourceFile);
  }

  ts.forEachChild(node, (child) => visitNode(child, sourceFile));
}

function collectCallExpression(node, sourceFile) {
  if (!ts.isIdentifier(node.expression)) {
    return;
  }

  const functionName = node.expression.text;
  const args = node.arguments;

  if (functionName === "__") {
    const singular = getStringLiteralValue(args[0]);
    const domain = getStringLiteralValue(args[1]);

    if (!singular || domain !== DOMAIN) {
      return;
    }

    addEntry(singular, null, sourceFile, node);
    return;
  }

  if (functionName === "_n") {
    const singular = getStringLiteralValue(args[0]);
    const plural = getStringLiteralValue(args[1]);
    const domain = getStringLiteralValue(args[3]);

    if (!singular || !plural || domain !== DOMAIN) {
      return;
    }

    addEntry(singular, plural, sourceFile, node);
  }
}

function getStringLiteralValue(node) {
  if (!node) {
    return null;
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  return null;
}

function addEntry(singular, plural, sourceFile, node) {
  const key = `${singular}\u0000${plural || ""}`;
  const line =
    ts.getLineAndCharacterOfPosition(sourceFile, node.getStart(sourceFile))
      .line + 1;
  const reference = `${path.relative(
    process.cwd(),
    sourceFile.fileName,
  )}:${line}`;
  const existing = entries.get(key);

  if (existing) {
    existing.references.add(reference);
    return;
  }

  entries.set(key, {
    singular,
    plural,
    references: new Set([reference]),
  });
}

function writePotFile(filePath, potEntries) {
  const now = new Date().toISOString();
  const lines = [
    'msgid ""',
    'msgstr ""',
    '"Content-Type: text/plain; charset=UTF-8\\n"',
    '"Content-Transfer-Encoding: 8bit\\n"',
    `"POT-Creation-Date: ${now}\\n"`,
    `"X-Domain: ${DOMAIN}\\n"`,
    "",
  ];

  potEntries
    .sort((left, right) => left.singular.localeCompare(right.singular))
    .forEach((entry) => {
      lines.push(`#: ${Array.from(entry.references).sort().join(" ")}`);
      lines.push(`msgid ${formatPoString(entry.singular)}`);

      if (entry.plural) {
        lines.push(`msgid_plural ${formatPoString(entry.plural)}`);
        lines.push('msgstr[0] ""');
        lines.push('msgstr[1] ""');
      } else {
        lines.push('msgstr ""');
      }

      lines.push("");
    });

  fs.writeFileSync(filePath, lines.join("\n"));
}

function formatPoString(value) {
  return `"${escapePoString(value)}"`;
}

function escapePoString(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}
