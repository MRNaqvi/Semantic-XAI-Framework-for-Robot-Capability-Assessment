# Robot Operational Capability Demo

This project runs a robot operational capability workflow:

- Flask loads Keras models for Ned-2, IRB 1200, and IRB 2400.
- The browser UI accepts Cartesian coordinates `X, Y, Z` for a new task.
- Predicted or simulated capability values are written to the RDFox knowledge graph as `RCO:has_Measurement_Value`.
- RDFox 7.5b stores the ontology, Datalog rules, and facts.
- Natural language explanations are optional and require the user's own OpenAI API key.

## Requirements

- Windows
- Python with TensorFlow/Keras dependencies available
- .NET SDK 8 or newer
- RDFox 7.5b license file
- Optional: OpenAI API key for natural language explanations

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

## One Command Run

From the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File ".\Start-Project.ps1"
```

Then open:

```text
http://127.0.0.1:8001
```

The page auto-loads the default `S-XAI` datastore, ontology, Datalog rules, and uses the bundled Keras models.

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

Natural language explanation requires `OPENAI_API_KEY`. Without it, facts and graph view still work.

## Custom Inputs

The UI includes tabs for:

- Custom ontology files
- Custom Datalog rules
- Custom `.keras` robot models

Default resources are still loaded automatically for the `S-XAI` store.
