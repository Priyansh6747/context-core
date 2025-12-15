# context-core

Semantic breakdown and information extraction from raw text.

`context-core` is a minimal library that takes an unstructured string and returns a structured JSON representation by semantically analyzing the text and extracting relevant information.

## What it does

- Performs semantic breakdown of input text
- Extracts meaningful information (facts, attributes, relations)
- Outputs normalized, structured JSON

Pure input → output. No state, no side effects.

## What it does not do

- No data storage or memory
- No embeddings or vector search
- No agents, workflows, or orchestration
- No UI or product-level logic

This is a single-purpose extraction layer.

## Intended use

Designed to sit at the boundary between language and systems:

- Preprocessing for AI and ML pipelines
- Context extraction for SaaS backends
- Structured input generation for RAG systems
- Any system that needs predictable data from text

## Installation

```bash
npm install context-core
```

## Basic usage

```javascript
const { extractContext } = require("context-core");

const result = extractContext(
  "I prefer dark mode and live in Bangalore."
);

console.log(result);
```

**Output:**

```json
{
  "preferences": {
    "ui_theme": "dark"
  },
  "location": {
    "city": "Bangalore"
  }
}
```

Output schema is intentionally minimal and may evolve during `0.1.x`.

## Project status

Early development.

- API and schema may change
- Feedback welcome
- Stability will come after usage

## License

MIT