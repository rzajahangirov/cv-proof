import { generateStructured } from "@/lib/ai/generate";
import { mockCvExtract } from "@/lib/ai/mock";
import { getPrimaryModel } from "@/lib/ai/models";
import { cvExtractPrompt, cvExtractSystem } from "@/lib/ai/prompts/cv-extract";
import { ApiError, route } from "@/lib/api";
import { config } from "@/lib/config";
import { extractCvText } from "@/lib/cv/extract";
import { detectInjection } from "@/lib/cv/injection";
import { resolveGithubUsername } from "@/lib/github/username";
import { cvExtractOutputSchema, langSchema } from "@/lib/schemas";
import type { CvParseResponse } from "@/lib/types";

export const maxDuration = 60;

function validateFile(file: FormDataEntryValue | null): File {
  if (!(file instanceof File)) throw new ApiError("invalid_input", "Field 'file' is required");

  const name = file.name.toLowerCase();
  if (!config.files.extensions.some((extension) => name.endsWith(extension))) {
    throw new ApiError("unsupported_file", "Only .pdf and .docx files are accepted");
  }
  if (file.size > config.files.maxBytes) {
    throw new ApiError("file_too_large", "File exceeds the size limit", 413);
  }
  return file;
}

export const POST = route(async (request): Promise<CvParseResponse> => {
  const form = await request.formData().catch(() => {
    throw new ApiError("invalid_input", "Body must be multipart form data");
  });
  const file = validateFile(form.get("file"));
  const lang = langSchema.parse(form.get("lang"));

  const data = new Uint8Array(await file.arrayBuffer());
  const { cvText, fullText } = await extractCvText(data, file.name);
  const regexInjection = detectInjection(fullText);

  const { injectionDetected, ...profile } = await generateStructured({
    model: getPrimaryModel()?.model ?? null,
    system: cvExtractSystem(lang),
    prompt: cvExtractPrompt(cvText),
    schema: cvExtractOutputSchema,
    mock: () => mockCvExtract(cvText),
  });

  return {
    cvText,
    profile: {
      ...profile,
      githubUsername: resolveGithubUsername(fullText, profile.githubUsername),
    },
    injection: {
      detected: regexInjection.detected || injectionDetected,
      snippets: regexInjection.snippets,
    },
  };
});
