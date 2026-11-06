import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Text is stored per language so Spanish and a language toggle can be added later.
const localized = z.object({ en: z.string(), es: z.string().optional() });

const projects = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/projects" }),
  schema: z.object({
    title: localized,
    summary: localized,
    kind: z.enum(["web-app", "client-work", "content-tool"]),
    status: z.enum(["live", "in-development"]),
    image: z
      .object({ src: z.string(), alt: z.string(), width: z.number(), height: z.number() })
      .optional(),
    // Display order only. Scores stay in the private audits.
    order: z.number().int(),
    pinned: z.boolean().default(false),
    hidden: z.boolean().default(false),
    builtWith: z.string(),
    stack: z.array(z.string()),
    skills: z.array(z.string()),
    links: z
      .object({
        demo: z.string().optional(),
        code: z.string().url().optional(),
      })
      .default({}),
    // Public GitHub repo used to show the last update date at build time.
    repo: z.string().optional(),
  }),
});

export const collections = { projects };
