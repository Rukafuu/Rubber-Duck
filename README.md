# Rubber Duck

Rubber Duck is an AI-assisted debugging workspace that helps developers investigate problems methodically: capture the problem and environment, gather evidence, form and test hypotheses, and document a clear solution.

## MVP

The first version is a client-side web app built with Vite, React 18, TypeScript (strict mode), and Tailwind CSS v4.

- Sessions track messages, environment details, hypotheses, tests, evidence, and solutions.
- A provider interface keeps the AI layer swappable between Qwen, OpenAI, Anthropic, or a deterministic mock.
- Browser storage provides local persistence for the MVP.
- Sensitive values are masked before they are stored.

## Goal

Make debugging less like guessing and more like an explicit, repeatable investigation:

`Problem → Evidence → Hypothesis → Test → Result → Conclusion`

## Status

The project foundation is being implemented incrementally.

