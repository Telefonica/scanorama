<div align="center">
  <img src="YOUR_SCANORAMA_LOGO_URL_HERE" alt="Scanorama Logo" width="150">  <!-- TODO: Add a cool logo! -->
  <h1>Scanorama</h1>
  <p><strong>🛡️ CLI tool to Analyze MCP servers searching for prompt injection vulnerabilities 🛡️</strong></p>
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

Scanorama is a powerful command-line interface (CLI) tool designed for security professionals and developers to **statically analyze MCP server**. It intelligently scans `MCP server` source code *searching* for **malicious** or **unsafely** MCP servers.

MCP tools descriptions, when consumed by Large Language Model (LLM) agents, can be a vector for **prompt injection attacks**, leading to unintended agent behavior, data exfiltration, or other security risks. Scanorama helps you identify these threats proactively.

TODO: INSERT VIDEO HERE

**Key Features:**

*   🔎 **Deep Code Analysis:** Semantically understands code (not just syntactically)
*   🎯 **Prompt Injection Detection:** Leverages LLMs to analyze extracted tool descriptions for common and sophisticated prompt injection patterns.
*   💻 **Multi-Language Support:** Designed to work with all MCP SDKs: Python, TypeScript, Java, Kotlin, C# and ...
```bash
scanorama --clone https://github.com/someuser/vulnerable-mcp-tools.git --provider google --model gemini-1.5-flash-latest --output gemini_report.json
```
*   🔗 **Flexible Source Input:** Scan local directories or directly clone and analyze public GitHub repositories.
```bash
scanorama --path /path/to/your/mcp-project
```
*   📄 **Clear Reporting:** Generates easy-to-understand console reports
*   💾 **JSON Output:** `--ouput filename`
*   🤖 **Multi-Provider LLM Support:** Choose from a range of LLM providers `--list-models`
    *   -m, --model <id>: Specify the model ID for the chosen provider.

        * For OpenAI, Google, Anthropic: Use a model ID like gpt-4o, gemini-1.5-flash-latest, claude-3-haiku-20240307.
        * For Azure: This must be your specific Deployment ID.

*   ⚙️ **Configurable Analysis:** Adjust LLM temperature and select specific models.

---

## 🤔 What MCP?

The **Model Context Protocol (MCP)** is an emerging open standard that defines a universal interface for connecting Large Language Models (LLMs) to external data sources, tools, and services. The most popular standardized way for LLMs to interact with the outside world. [You can see more here](https://modelcontextprotocol.io/introduction)

## ⚠️ Why scan MCP servers ?

While MCP offers great flexibility, it also introduces a new attack surface. The descriptions of MCP tools can be injected directly into an LLM agent's context (prompt) and it allows third party agents take control of your agents.

A maliciously crafted tool description can contain hidden instructions designed to:

*   Hijack the agent's original purpose.
*   Exfiltrate sensitive data processed by the agent.
*   Instruct the agent to perform unauthorized actions.
*   Manipulate other tools or data sources the agent interacts with.

This is a form of **prompt injection**. Scanorama helps you identify such potentially "poisoned" tool descriptions before they can cause harm.

Research about how MCP tool description can be exploited to take control of LLM agents: [Understanding and Mitigating Prompt Injection in MCP-based Agents](https://github.com/alexgarabt/agents-poison) 

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

```bash
git clone https://github.com/Telefonica/scanorama.git
cd scanorama
pnpm install  # Or npm install / yarn install
pnpm build    # Or npm run build / yarn build
pnpm start --help
```

## 🛠️ Supported LLM providers

Scanorama currently supports analysis using models from:

*   🧠 OpenAI (e.g., GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo)
*   ☁️ Azure OpenAI (Use your specific deployment ID)
*   🔍 Google Gemini (e.g., Gemini 1.5 Pro, Gemini 1.5 Flash)
*   🤖 Anthropic (e.g., Claude 3 Opus, Sonnet, Haiku)
*   Run scanorama --list-models for more details on conceptual models and setup.

### Setting up Providers

Scanorama uses LLMs for its intelligent analysis. You need to configure API keys for the provider you wish to use.

Create a .env file in your project's root directory (or ensure the variables are set in your **shell environment**):

#### For Google Gemini
```bash
GOOGLE_API_KEY="your_google_ai_studio_api_key"
```

Google provide free api keys for personal use. You can check it in [aistudio.google.com](https://aistudio.google.com/apiKey)

#### For OpenAI
```bash
OPENAI_API_KEY="your_openai_api_key"
```

#### For Azure OpenAI
```bash
AZURE_OPENAI_API_KEY="your_azure_openai_key"
AZURE_OPENAI_ENDPOINT="https://your-resource-name.openai.azure.com"
AZURE_OPENAI_API_VERSION="your-api-version" 
```
For Azure, you MUST also specify your deployment ID using --model <your-deployment-id>  


Scanorama will automatically load these variables if a .env file is present in the directory where you run the command.

See supported providers(env vars) & models to use:
```bash
scanorama --list-models
```

## ⚙️ Usage and Options
Scanorama offers several options to customize your scans:
```bash
scanorama [options]
```
### Core Options:

    -p, --path <folder>: Analyze a local directory.
        Example: scanorama --path ./my-mcp-server

    -c, --clone <repo_url>: Clone and analyze a public GitHub repository.
        Example: scanorama --clone https://github.com/someuser/example-mcp-project.git

    -o, --output <file>: Save the detailed analysis results to a JSON file.
        Example: scanorama --path . --output report.json

### LLM Configuration Options:

    --provider <name>: Specify the LLM provider.
        Choices: openai, google, azure.
        Default: openai
        Example: scanorama --path . --provider google
     
    -m, --model <id>: Specify the model ID for the chosen provider.
        For OpenAI, Google, Anthropic: Use a model ID like gpt-4o, gemini-1.5-flash-latest, claude-3-haiku-20240307.
        For Azure: This must be your specific Deployment ID.
        Run scanorama --list-models to see conceptual models and defaults.
        Example: scanorama --path . --provider openai --model gpt-4o

    --temperature <temp>: Set the LLM's temperature (creativity). A float between 0.0 (deterministic) and 1
        Note for Azure: This option is IGNORED. Scanorama will always use the default temperature configured for your Azure deployment.
        Example: scanorama --path . --temperature 0.2

### Utility Options:

    * --list-models: Display all supported LLM providers, their conceptual models, required environment variables, and then exit.
    * -y, --yes: Automatically answer "yes" to confirmation prompts, such as when using an unlisted model ID for certain providers. Useful for scripting.
    * --help: Show the help message with all options.
    * --version: Display Scanorama's version.




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
