<div align="center">
  <h1>Scanorama</h1>
  <p><strong>A CLI tool to analyze MCP tools for security threats</strong></p>
  <p>
    <a href="https://www.npmjs.com/package/@telefonica/scanorama"><img src="https://img.shields.io/npm/v/@telefonica/scanorama.svg" alt="npm version" /></a>
    <a href="https://github.com/Telefonica/scanorama/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Telefonica/scanorama.svg" alt="license" /></a>
  </p>
</div>

## 📚 Table of contents

- [What is Scanorama?](#what-is-scanorama)
- [What is the Model Context Protocol (MCP)?](#what-is-the-model-context-protocol-mcp)
- [💻 Installation](#-installation)
- [⚙️ Usage](#usage)
- [⭐ Supported providers](#-supported-providers)
- [❗ Disclaimer & Contact](#-disclaimer--contact)

## What is Scanorama?

**Scanorama** is a command-line tool to perform static analysis of any MCP-based tool (built with official MCP SDKs) and detect potential security issues. It generates a human-readable report that flags:

- **Prompt injection**: Attempts to manipulate or exfiltrate data via crafted prompts.
- **[IN PROGRESS] Malicious code**: Suspicious code patterns that may compromise the host.
- **[IN PROGRESS] Incongruent code**: Code that deviates from expected functionality.

</br>

<!-- TODO: Add report image -->
<div align="center">
    <img src="./media/report.png" alt="Scanorama report" width="700"/>
</div>

### 🧠 Technology & Architecture

_Scanorama_ is built using **LangGraph**, a framework for building multi-agent workflows with LLMs. It allows us to define structured and modular flows that mirror the step-by-step reasoning of a human code security auditor.

At the heart of _Scanorama_ is a **specialized agent** designed for **code security audits**, which processes an MCP-based tool repository through a structured flow:

#### 🔄 Architecture diagram

<div align="center">
    <img src="./media/architecture.png" alt="Scanorama architecture" width="700"/>
</div>

#### 🧩 Agent Workflow: How Scanorama Analyzes Your Code

Scanorama uses a multi-step process, like an automated assembly line, to find and analyze your MCP tools:

1.  **Step 1: Find the Code Files (`listFilesNode`)**
    *   First, Scanorama looks through your project to find all the important source code files (like Python, TypeScript, Java files, etc.).

2.  **Step 2: Extract Tool Details - One File at a Time (`scanFileNode`)**
    * Decide what file should scan of the project and if find `MCP tools` it saves its description and name and continue searching through files until it decides to finish.

3.  **Step 3: Analyze Tool Descriptions for Risks (`analyzeToolsNode`)**
    *   Once Scanorama has checked all the files and gathered all the tool names and descriptions, it moves to the final step.
    *   It takes all the tool descriptions it found and search thorughth the tools to find prompt injections to that could modify the default behavior of an agent using the mcp.

## What is the Model Context Protocol (MCP)?

The **Model Context Protocol (MCP)** is an open standard that defines a universal interface for connecting large language models (LLMs) to external data sources, tools, and services—much like USB-C standardizes how hardware devices connect to peripherals. It was open-sourced by Anthropic in November 2024 and has since been adopted by major AI platforms, enabling:

1. **Contextual Data Exchange**
   Applications can share files, database records, or real-time data streams with an LLM via MCP.
2. **Tool Invocation**
   LLMs can call external functions or APIs (e.g., GitHub, search engines) over a standardized protocol.
3. **Interoperability**
   Developers build once against MCP and seamlessly plug into any compliant LLM or data provider, reducing integration overhead.

Together, these capabilities break down silos between AI models and enterprise systems, paving the way for more powerful, secure, and maintainable AI-driven workflows.

## 💻 Installation

You can install _Scanorama_ using one of the following methods:

### ✅ Option 1: Install via NPM (Recommended)

```bash
npm install -g @telefonica/scanorama
```

Check if the installation was successful by running:

```bash
scanorama --help
```

### 📦 Option 2: Clone from GitHub

For local development or offline usage:

```bash
git clone https://github.com/Telefonica/scanorama.git
cd scanorama
```

Install dependencies and build:

```bash
npm install
npm run build
```

Check if the installation was successful by running:

```bash
npm run start --help
```

## ⚙️ Usage

_Scanorama_ supports analysis of MCP tools written in:

> **Python, TypeScript, Kotlin, C#, Rust, Swift, and Java**

You can analyze tools either from a GitHub URL or a local directory:

### Scan from GitHub

```bash
scanorama --clone <GITHUB_REPO_URL>
```

### Scan from local directory

```bash
scanorama --path <LOCAL_DIRECTORY>
```

### Save report
Supports saving into a json format the generated report

```bash
scanorama ... --output <filename>
```

Use the `--help` flag to explore all available options:

```bash
scanorama --help
```

## ⭐ Supported providers

_Scanorama_ can analyze tools using models from the following providers:

- 🧠 **OpenAI**
- ☁️ **Azure OpenAI**
- 🔍 **Google**
- 🤖 **Anthropic**
- 🦙 **Ollama**

## ❗ Disclaimer & Contact

> ⚠️ _Scanorama is currently a Proof of Concept and has **no formal QA process**._

For bugs, feature requests, or general feedback, contact us at [lightinglab@telefonica.com](mailto:lightinglab@telefonica.com).
