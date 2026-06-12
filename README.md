# A Human-Centric Semantic XAI Framework for Robot Capability and Suitability Assessment in Manufacturing Demo

This project runs a robot operational capability workflow:

- Flask loads Keras models for Ned-2, IRB 1200, and IRB 2400.
- The browser UI accepts Cartesian coordinates `X, Y, Z` for a new task.
- Predicted or simulated capability values are written to the RDFox knowledge graph as `RCO:has_Measurement_Value`.
- RDFox 7.5b stores the ontology, Datalog rules, and facts.
- LIME and SHAP provide local NN XAI feature influence for `X`, `Y`, and `Z`.
- Natural language explanations can use either the user's own OpenAI API key or a free local Ollama model.

## Version Note

This S-XAI version includes Natural Language explanations. In the Natural Language tab, choose `OpenAI` and paste your OpenAI API key for the current browser session, or choose `Ollama` to run a local open model. Without either provider, model prediction, KG updates, facts, and graph explanations still work.

## Interface Function Guide

A detailed page-by-page guide for the Main page, Explanations page, and System Logs is available here:

```text
docs\S-XAI-UI-Function-Guide.md
```

## Requirements

- Windows
- Python with TensorFlow/Keras dependencies available
- .NET SDK 8 or newer
- RDFox 7.5b license file
- Optional: OpenAI API key for natural language explanations
- Optional: Ollama for free local open-model reasoning in the Natural Language tab
- Python packages from `App\requirements.txt`, including TensorFlow, LIME, and SHAP

RDFox 7.5b runtime files are included under:

```text
tools\RDFox-win64-x86_64-7.5b
```

The RDFox license is not included. Add your valid license here:

```text
license\RDFox.lic
```

## Optional Local Config

Copy:

```text
config.template.ps1
```

to:

```text
config.local.ps1
```

Then add your OpenAI key:

```powershell
$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY"
```

You can also point to a license outside the project:

```powershell
$env:RDFOX_LICENSE_FILE = "C:\Path\To\RDFox.lic"
```

`config.local.ps1` is ignored by Git.

## Fresh Local Setup

Run these commands once on a new Windows machine from the project folder.

Install Python dependencies:

```powershell
python -m pip install -r ".\App\requirements.txt"
```

Check that Flask, TensorFlow, LIME, and SHAP are installed:

```powershell
python ".\App\check_dependencies.py"
```

If the dependency check prints nothing, the Python environment is ready. If it prints package names, install again with:

```powershell
python -m pip install -r ".\App\requirements.txt"
```

Check the .NET API can build:

```powershell
dotnet build ".\RdfoxWebApi\RdfoxWebApi\RdfoxWebApi.csproj"
```

Place the RDFox license at:

```text
license\RDFox.lic
```

or set it in `config.local.ps1`:

```powershell
$env:RDFOX_LICENSE_FILE = "C:\Path\To\RDFox.lic"
```

For persistent Natural Language explanations with OpenAI, add your OpenAI key to `config.local.ps1`:

```powershell
$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY"
```

For the Natural Language tab without OpenAI, install Ollama and pull a local model:

```powershell
ollama pull llama3.2:3b
```

By default the Flask app calls:

```text
http://127.0.0.1:11434
```

You can choose another local Ollama model in the UI, or set these optional values in `config.local.ps1`:

```powershell
$env:OLLAMA_URL = "http://127.0.0.1:11434"
$env:OLLAMA_MODEL = "llama3.2:3b"
```

## One Command Run

If Python dependencies are missing on a fresh machine, install the Flask model API requirements first:

```powershell
python -m pip install -r ".\App\requirements.txt"
```

From the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Start-Project.ps1"
```

Then open:

```text
http://127.0.0.1:8001
```

The page auto-loads the default `S-XAI` datastore, ontology, Datalog rules, and uses the bundled Keras models.

After the app opens, SHAP is available from:

```text
Explanations -> XAI -> Run SHAP
```

If SHAP fails on a new machine, rerun:

```powershell
python -m pip install -r ".\App\requirements.txt"
```

## Manual Run

Use these only if you want to start each service separately.

```powershell
powershell -ExecutionPolicy Bypass -File ".\Start-RDFox.ps1"
powershell -ExecutionPolicy Bypass -File ".\Start-Backend.ps1"
powershell -ExecutionPolicy Bypass -File ".\Start-Flask.ps1"
powershell -ExecutionPolicy Bypass -File ".\Start-Web.ps1"
```

## Ports

- RDFox REST endpoint: `http://localhost:12110/`
- .NET API endpoint: `http://localhost:11191/`
- Flask model API: `http://127.0.0.1:5000/`
- Web UI: `http://127.0.0.1:8001/`

## App Flow

1. Open the web UI.
2. Enter Cartesian coordinates as `X, Y, Z`.
3. Click `Execute`.
4. Review predicted values.
5. Optional: use `Simulated Value` to enter your own hypothetical capability values.
6. Click `Submit` to update `RCO:has_Measurement_Value` in the knowledge graph.
7. Use `Refresh Facts`, `View Graph`, and `Explain`.

Natural language explanation can use either an OpenAI key pasted in the UI or Ollama running locally. Without either provider, facts and graph view still work.

The `Natural Language` tab can also use Ollama with a free local open model. It reads RDFox explanation evidence and sends a compact reasoning summary to the local model through Flask; it does not call OpenAI.

## Custom Inputs

The UI includes controls for:

- Custom ontology files
- Custom Datalog rules
- Custom `.keras` robot models

Default resources are still loaded automatically for the `S-XAI` store.
