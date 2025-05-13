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

#### 🧩 Node breakdown

- **Node 1: File enumeration**

  - Lists all files in the repository (local or from GitHub).
  - Filters and returns only those that are relevant for analysis (e.g., `.py`, `.ts`, `.kt`, etc.).
    > **Note:** The tool is able to identify which files are relevant for the analysis and discard irrelevant ones (`node_modules`, `__tests__`, ...).

- **Node 2: Tool extraction**

  - Scans the code to detect MCP tool definitions.
  - Extracts function names and natural language descriptions of the tools.

- **Node 3: Security analysis**

  - Uses the **selected model and provider** (OpenAI, Anthropic, etc.) to evaluate each tool.
  - Detects potential risks and generates a report.

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
scanorama --url <GITHUB_REPO_URL>
```

### Scan from local directory

```bash
scanorama --path <LOCAL_DIRECTORY>
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
