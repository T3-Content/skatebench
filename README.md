# skatebench

A benchmark that tests LLMs on skateboarding trick terminology - whether they can correctly name tricks based on technical descriptions.

## What it tests

The benchmark evaluates if AI models can identify skateboard tricks from their descriptions. For example:

**Test prompt**: "Board spins 360 degrees backside and flips in the kickflip direction. The skater does not spin."  
**Correct answers**: "tre flip" or "360 flip"  
**Failure if contains**: "backside 360 kickflip", "360 heelflip" (common mistakes)

## Installation

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.0. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
