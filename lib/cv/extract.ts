import mammoth from "mammoth";
import { extractLinks, extractText, getDocumentProxy } from "unpdf";
import { ApiError } from "@/lib/api";
import { config } from "@/lib/config";

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fromPdf(data: Uint8Array): Promise<{ text: string; links: string[] }> {
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: true });
  const { links } = await extractLinks(pdf);
  return { text, links: links.flat() };
}

async function fromDocx(data: Uint8Array): Promise<{ text: string; links: string[] }> {
  const buffer = Buffer.from(data);
  const { value: text } = await mammoth.extractRawText({ buffer });
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const links = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  return { text, links };
}

/**
 * CVs often show a word like "GitHub" with the URL only behind the hyperlink,
 * so link targets are appended to keep them visible to the rest of the pipeline.
 */
export async function extractCvText(
  data: Uint8Array,
  fileName: string,
): Promise<{ cvText: string; fullText: string }> {
  let extracted: { text: string; links: string[] };
  try {
    extracted = fileName.toLowerCase().endsWith(".pdf") ? await fromPdf(data) : await fromDocx(data);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    throw new ApiError("unreadable_file", `Could not read ${fileName}: ${reason}`, 422);
  }

  const body = normalize(extracted.text);
  if (body.length < config.cv.minChars) {
    throw new ApiError("scanned_pdf", "Too little text; the file is probably a scan", 422);
  }

  const links = [...new Set(extracted.links)]
    .filter((link) => /^https?:/i.test(link))
    .slice(0, config.cv.maxLinks);
  const linkBlock = links.length ? `\n\nLinks:\n${links.join("\n")}` : "";

  return {
    cvText: body.slice(0, config.cv.maxChars - linkBlock.length) + linkBlock,
    fullText: body + linkBlock,
  };
}
