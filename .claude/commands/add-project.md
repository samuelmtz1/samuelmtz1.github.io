---
description: Audit a project, score it, and draft its portfolio entry for Samuel's approval
argument-hint: <repo-or-project-name>
---

Add this project to the portfolio: $ARGUMENTS

Follow `CLAUDE.md`. Answer Samuel in Spanish. Write the site text in English.

1. **Read the project** from its code and docs, not only its README. Don't run anything that could change it, and never print secret values.
2. **Check what's safe to publish.** Look for credentials, personal data and client data in the code and its history. If you find any, stop and tell Samuel before continuing.
3. **Write the private audit** in Spanish at `../Resume and job/reports/project-audits/<project>.md`, using the same sections as the existing reports: project reading, current stack, improvements, Claude Code skills, how to defend it, and financial valuation. Cite sources. State what you didn't run or verify.
4. **Score it** from 0 to 100: relevance 35, skills 25, visual 20, working demo 20. Add it to the ranking in that folder's `README.md`.
5. **Propose new facts.** List anything the entry needs that isn't in `facts.md`, with its evidence. Add it to `facts.md` only after Samuel confirms it.
6. **Draft the entry** in `src/content/projects/`. Include no prices, scores or weaknesses. Mark unfinished work as in development.
7. **Stop and show Samuel** the draft, the score and the proposed facts. Commit or push only when he confirms.
