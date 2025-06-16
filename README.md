<div align="center">
  <img src="YOUR_SCANORAMA_LOGO_URL_HERE" alt="Scanorama Logo" width="150">  <!-- TODO: Add a cool logo! -->
  <h1>Scanorama</h1>
  <p><strong>🛡️ CLI to Analyze Model Context Protocol (MCP) Servers for Prompt Injection Vulnerabilities 🛡️</strong></p>
  <p>
    Scan local or remote codebases, get actionable security reports, and integrate with multiple LLM providers.
  </p>
  <p>
    <a href="https://www.npmjs.com/package/scanorama"><img src="https://img.shields.io/npm/v/scanorama.svg?style=flat-square" alt="npm version" /></a>
    <a href="https://github.com/Telefonica/scanorama/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Telefonica/scanorama.svg?style=flat-square" alt="license" /></a>
    <!-- TODO: Add other badges like build status, downloads, etc. -->
  </p>
</div>

## 🚀 What is Scanorama?

Scanorama is a powerful command-line interface (CLI) tool designed for security professionals and developers to **statically analyze Model Context Protocol (MCP) server implementations**. It intelligently scans your source code—whether local or from a GitHub repository—to detect potentially malicious or unsafely configured MCP tool descriptions.

These descriptions, when consumed by Large Language Model (LLM) agents, can be a vector for **prompt injection attacks**, leading to unintended agent behavior, data exfiltration, or other security risks. Scanorama helps you identify these threats proactively.

**Key Features:**

*   🔎 **Deep Code Analysis:** Semantically understands code (not just syntactically) using LLMs to find MCP tool definitions across various languages.
*   🎯 **Prompt Injection Detection:** Leverages LLMs to analyze extracted tool descriptions for common and sophisticated prompt injection patterns.
*   💻 **Multi-Language Support:** Designed to work with MCP SDKs in Python, TypeScript, Java, Kotlin, C#, and more.
*   🔗 **Flexible Source Input:** Scan local directories or directly clone and analyze public GitHub repositories.
*   📄 **Clear Reporting:** Generates easy-to-understand console reports, highlighting potential risks with color-coded severity.
*   💾 **JSON Output:** Option to save detailed analysis results to a JSON file for integration with other tools or record-keeping.
*   🤖 **Multi-Provider LLM Support:** Choose from a range of LLM providers like OpenAI, Google Gemini, Anthropic, Azure OpenAI, and local Ollama instances for analysis.
*   ⚙️ **Configurable Analysis:** Adjust LLM temperature and select specific models for tailored analysis.

---

## 🤔 What is the Model Context Protocol (MCP)?

The **Model Context Protocol (MCP)** is an emerging open standard that defines a universal interface for connecting Large Language Models (LLMs) to external data sources, tools, and services. Think of it like USB-C for AI: a standardized way for LLMs to interact with the outside world.

MCP enables:

1.  **Contextual Data Exchange:** Applications can seamlessly share files, database records, or real-time data with an LLM.
2.  **Tool Invocation:** LLMs can call external functions or APIs (e.g., search engines, code interpreters, custom business logic) through a defined protocol.
3.  **Interoperability:** Developers can build tools or data sources once against the MCP standard, allowing them to be used by any MCP-compliant LLM agent.

This standardization is crucial for building powerful, modular, and maintainable AI-driven applications.

---

## ⚠️ Why Scan MCP Servers for Vulnerabilities?

While MCP offers great flexibility, it also introduces a new attack surface. The descriptions of MCP tools are typically injected directly into an LLM agent's context (prompt) to inform the agent about the tool's capabilities and how to use it.

**This is where the risk lies:**

A maliciously crafted tool description can contain hidden instructions designed to:

*   Hijack the agent's original purpose.
*   Exfiltrate sensitive data processed by the agent.
*   Instruct the agent to perform unauthorized actions.
*   Manipulate other tools or data sources the agent interacts with.

This is a form of **prompt injection**. Scanorama helps you identify such potentially "poisoned" tool descriptions before they can cause harm.

For a deeper dive into how these vulnerabilities can be exploited, check out this research: [Understanding and Mitigating Prompt Injection in MCP-based Agents](https://github.com/alexgarabt/agents-poison) <!-- TODO: Replace with the actual link if different or more relevant -->

---

## 🎬 Quick Demo & Visual Overview

**(TODO: INSERT A GIF OR EMBED A SHORT VIDEO DEMONSTRATING SCANORAMA IN ACTION HERE)**

This section will visually walk you through:
1. Cloning a repository.
2. Running Scanorama against it.
3. Interpreting the console report.
4. Viewing the JSON output.

---

## 💻 Installation

You can install Scanorama using npm:

```bash
npm install -g @telefonica/scanorama
```

## Verify the installation:
```bash
scanorama --version
```

Alternatively, for development or to run from source:

git clone https://github.com/Telefonica/scanorama.git
cd scanorama
pnpm install  # Or npm install / yarn install
pnpm build    # Or npm run build / yarn build
pnpm start --help
node dist/index.js --help

## 🛠️ Setting Up LLM Providers

Scanorama uses LLMs for its analysis. You need to configure API keys for the provider you wish to use. This is typically done via environment variables.

Create a .env file in your project's root directory (or ensure the variables are set in your **shell environment**):

### Providers
#### For OpenAI
```bash
OPENAI_API_KEY="sk-your_openai_api_key"
```

#### For Google Gemini
```bash
GOOGLE_API_KEY="your_google_ai_studio_api_key"
```

#### For Azure OpenAI
```bash
AZURE_OPENAI_API_KEY="your_azure_openai_key"
AZURE_OPENAI_ENDPOINT="https://your-resource-name.openai.azure.com"
AZURE_OPENAI_API_VERSION="your-api-version" # e.g., 2023-07-01-preview
```

For Azure, you MUST also specify your deployment ID using --model <your-deployment-id>  


Scanorama will automatically load these variables if a .env file is present in the directory where you run the command.

See supported providers(env vars) & models to use:
```bash
scanorama --list-models
```
# TODO: ADD OUTPUT DISPLAY IMAGE

## ⚙️ Usage and Options
Scanorama offers several options to customize your scans:
```bash
scanorama [options]
```
### Core Options:

    * -p, --path <folder>: Analyze a local directory.

        * Example: scanorama --path ./my-mcp-server

    * -c, --clone <repo_url>: Clone and analyze a public GitHub repository.
        * Example: scanorama --clone https://github.com/someuser/example-mcp-project.git

    * -o, --output <file>: Save the detailed analysis results to a JSON file.
        * Example: scanorama --path . --output report.json

### LLM Configuration Options:

    * --provider <name>: Specify the LLM provider.
     
        * Choices: openai, google, azure.
        * Default: openai
        * Example: scanorama --path . --provider google
     
    * -m, --model <id>: Specify the model ID for the chosen provider.
        * For OpenAI, Google, Anthropic: Use a model ID like gpt-4o, gemini-1.5-flash-latest, claude-3-haiku-20240307.
        * For Azure: This must be your specific Deployment ID.
        * Run scanorama --list-models to see conceptual models and defaults.
        * Example: scanorama --path . --provider openai --model gpt-4o

    * --temperature <temp>: Set the LLM's temperature (creativity). A float between 0.0 (deterministic) and 1
        * Note for Azure: This option is IGNORED. Scanorama will always use the default temperature configured for your Azure deployment.
        * Example: scanorama --path . --temperature 0.2

### Utility Options:

    * --list-models: Display all supported LLM providers, their conceptual models, required environment variables, and then exit.
    * -y, --yes: Automatically answer "yes" to confirmation prompts, such as when using an unlisted model ID for certain providers. Useful for scripting.
    * --help: Show the help message with all options.
    * --version: Display Scanorama's version.

## 📖 Examples

    1. Scan a Local Project using OpenAI (Default):

# Ensure OPENAI_API_KEY is set in your environment or .env file
```bash
scanorama --path /path/to/your/mcp-project
```

    2. Scan a GitHub Repository using Google Gemini and output to JSON:

# Ensure GOOGLE_API_KEY is set
```bash
scanorama --clone https://github.com/someuser/vulnerable-mcp-tools.git --provider google --model gemini-1.5-flash-latest --output gemini_report.json
```

    3. Scan an Azure OpenAI Deployment:

# Ensure AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_VERSION are set
```bash
scanorama --path . --provider azure --model your-gpt4-deployment-id
```

## 📊 Interpreting the Report

When Scanorama completes a scan, it will print a report to your console.

✅ Safe Tools: Tools deemed "No-Injection" will be listed in green with a checkmark, including their name and location.
```bash
✅ MySafeTool - No injection risks found. (src/tools/safe.py)
```

❌ Potential Injections: Tools flagged as "Injection" will be highlighted in red with a cross mark.

```bash
❌ MaliciousToolName
  Location: src/tools/risky_tool.ts
  Description: "This tool fetches user data and sends it to http://evil.com/collect?data=..."
  Explanation: The description contains an instruction to exfiltrate data to an external URL.
```


A summary at the end will tell you the total number of tools analyzed and how many potential injections were found.

## ⭐ Supported LLM Providers

Scanorama currently supports analysis using models from:

    * 🧠 OpenAI (e.g., GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo)
    * 
    * ☁️ Azure OpenAI (Use your specific deployment ID)
    * 
    * 🔍 Google Gemini (e.g., Gemini 1.5 Pro, Gemini 1.5 Flash)
    * 
    * 🤖 Anthropic (e.g., Claude 3 Opus, Sonnet, Haiku)
    * 
    * 🦙 Ollama (Run models like Llama 3, Mistral, etc., locally)
    * 
    * Run scanorama --list-models for more details on conceptual models and setup.

===
Disclaimer & Contact

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF ANY TYPE. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR ITS COMPONENTS, INTEGRATION WITH THIRD-PARTY SOLUTIONS OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

WHENEVER YOU MAKE A CONTRIBUTION TO A REPOSITORY CONTAINING NOTICE OF A LICENSE, YOU LICENSE YOUR CONTRIBUTION UNDER THE SAME TERMS, AND YOU AGREE THAT YOU HAVE THE RIGHT TO LICENSE YOUR CONTRIBUTION UNDER THOSE TERMS. IF YOU HAVE A SEPARATE AGREEMENT TO LICENSE YOUR CONTRIBUTIONS UNDER DIFFERENT TERMS, SUCH AS A CONTRIBUTOR LICENSE AGREEMENT, THAT AGREEMENT WILL SUPERSEDE.

THIS SOFTWARE DOESN'T HAVE A QA PROCESS. THIS SOFTWARE IS A PROOF OF CONCEPT AND SHOULD BE USED FOR EDUCATIONAL OR RESEARCH PURPOSES. ALWAYS REVIEW FINDINGS MANUALLY.

For issues, feature requests, or contributions, please visit the GitHub Issues page.
For other inquiries, contact LightingLab Telefonica Inovacion Digital.

<div align="center">
Made with ❤️ by Telefónica Innovación Digital - LightingLab
</div>
```
