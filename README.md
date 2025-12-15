# context-core

Semantic breakdown and structured information extraction from raw text.

`context-core` is a minimal, black-box library that takes an unstructured string and returns a **normalized, typed JSON representation** describing what the user said: events, tools, goals, identity, skills, and other semantic signals.

Input in. Structure out. Nothing else.

---

## What it does

- Performs semantic analysis of raw text
- Extracts **explicitly stated information** into well-defined buckets
- Outputs a deterministic, machine-usable JSON structure

The library is **pure**:

- no state
- no memory
- no persistence
- no side effects

---

## What it extracts

Depending on the input, `context-core` may extract:

- **Identity** – self-declared roles or labels
- **Goals** – desired future states expressed by the user
- **Events** – things happening, happened, or planned
- **Tools** – hardware, software, or services in use
- **Skills** – user capabilities
- **Jobs** – long-running work, projects, or commitments
- **Preferences** – likes, dislikes, defaults
- **Experiences** – past events with lasting relevance
- **Facts** – asserted truths (with confidence)
- **Results** – outcomes produced by events
- **Intents** – what the user is trying to do
- **Constraints** – temporary limitations or blockers
- **Warnings** – risk signals (e.g. data loss, security)

Each item is returned with **confidence** and, where applicable, **temporal decay**.

---

## What it does NOT do

- No data storage or long-term memory
- No embeddings or vector search
- No agents, planners, or workflows
- No UI or product logic
- No hallucinated or inferred identity

This is a **semantic compiler**, not an assistant.

---

## Output format (v0.1)

`context-core` always returns the same top-level structure:

```json
{
  "identity": [],
  "goals": [],
  "events": [],
  "tools": [],
  "skills": [],
  "jobs": [],
  "preferences": [],
  "experiences": [],
  "facts": [],
  "results": [],
  "intents": [],
  "constraints": [],
  "warnings": [],
  "meta": {}
}
```

- All fields are arrays (except `meta`)
- Empty arrays mean "nothing extracted"
- No bucket overlaps
- No hidden state

---

## Installation

```bash
npm install context-core
```

---

## Basic usage

```javascript
const { extractContext } = require("context-core");

const result = extractContext(
  "I want to reset my PC without losing my Chrome data."
);

console.log(result);
```

**Example output (simplified):**

```json
{
  "goals": [
    {
      "description": "reset pc without losing chrome data",
      "horizon": "short",
      "status": "active",
      "confidence": 0.85
    }
  ],
  "tools": [
    {
      "type": "software",
      "name": "google_chrome",
      "confidence": 0.9
    }
  ],
  "events": [],
  "identity": [],
  "meta": {
    "source": "text"
  }
}
```

> Exact schemas may evolve during `0.1.x`, but bucket meanings are stable.

---

## Intended use

`context-core` is designed to sit **between language and systems**, acting as a normalization layer for:

- SaaS backends that need structured user context
- AI / ML preprocessing pipelines
- RAG systems that require explicit signals, not chat logs
- Any product that needs **predictable structure from text**

---

## Project status

Early development (`0.1.x`).

- APIs may change
- Schemas may expand
- Breaking changes possible

Stability will come after real usage and feedback.

---

## License

MIT