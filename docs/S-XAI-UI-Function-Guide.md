# S-XAI Interface Function Guide

This guide explains the visible pages, hidden panels, buttons, dialogs, and reasoning workflow in the S-XAI application. It is written for someone who needs to understand what the system does from the browser interface, without reading the source code first.

The application has three main pages in the left sidebar:

- `Run Model`: the main page where the user loads assets, enters Cartesian coordinates, runs the neural models, and submits values to the knowledge graph.
- `Explanations`: the analysis page where the user inspects reasoned facts, graphs, counterfactual simulation, XAI outputs, natural language explanations, ontology structure, Datalog rules, and SPARQL queries.
- `System Logs`: the audit page where operational events are listed in timestamp order.

## 1. Main Page

The Main page is the starting point of the workflow. It prepares the knowledge assets, receives the task coordinates, calls the neural network models, and sends the resulting capability values to the knowledge graph.

### 1.1 Header and Reload Defaults

At the top of the page, the interface displays the project title:

```text
A Human-Centric Semantic XAI Framework for Robot Suitability and Capability Assessment in Manufacturing
```

The hidden datastore value is:

```text
S-XAI
```

The `Reload Defaults` button loads the default project assets again:

- Default ontology: `MCSk222.ttl`
- Default Datalog rule file: `c21.dlog`
- Default datastore: `S-XAI`
- Bundled Keras model configuration from the Flask model API

When clicked, the button sends the default ontology and Datalog rule content to the .NET API, which loads them into RDFox. It also resets the active ontology/rule names in the interface and writes a log entry in `System Logs`.

Use this button when:

- A custom ontology or custom rule was uploaded and the user wants to return to the project defaults.
- RDFox was restarted and the default knowledge base needs to be loaded again.
- The user wants a clean known state before testing prediction, facts, and explanations.

### 1.2 Default Knowledge Assets Panel

The default assets panel explains what is loaded by the application.

`Data Store in use: S-XAI`

This tells the user that RDFox reasoning is performed in the `S-XAI` datastore.

`* using default settings`

This means the application is using the bundled project configuration unless the user uploads custom files.

`Robot Capability Ontology`

The system includes the Robot Capability Ontology. This ontology provides the semantic vocabulary for robots, operational capabilities, measurements, and RDF predicates such as:

- `RCO:hasCapability`
- `RCO:has_Measurement_Value`
- `rdf:type`
- robot instances such as `IRB-1200`, `IRB-2400`, and `Ned-2`

Ontology source shown in the UI:

```text
https://industryportal.enit.fr/ontologies/RCO/
```

`Manufacturing Commonsense Knowledge Rules`

The system loads manufacturing commonsense driven Datalog rules. These rules compare robot operational capability values after the neural model values are written to the knowledge graph.

Rule source shown in the UI:

```text
https://csk.chaikmat-anr.uttop.fr
```

`Neural Network Models`

The system uses neural network models trained on three different robot datasets:

- Ned-2 Niryo
- ABB IRB 1200
- ABB IRB 2400

The models are Keras models served by the Flask API.

### 1.3 Upload Ontology Card

The `Upload your OWL/RDF ontology` card lets the user replace the active ontology file.

Accepted file types:

- `.owl`
- `.rdf`
- `.ttl`
- `.txt`

Button: `Upload Ontology`

What it does:

1. Opens a file picker.
2. Reads the selected ontology file.
3. Encodes the file content and sends it to the .NET API.
4. The .NET API loads the ontology into RDFox.
5. The interface updates the displayed ontology filename.
6. The Ontology Viewer state is reset so it can load the new ontology graph.
7. A system log entry is created.

Button: `Ontology Viewer`

What it does:

1. Opens the Explanations page.
2. Shows the hidden Ontology Viewer panel.
3. Lets the user load and inspect ontology classes, subclasses, instances, properties, and predicates as a graph.

Status text:

The ontology status line shows the active ontology file name. By default, it shows:

```text
Ontology: MCSk222.ttl
```

### 1.4 Upload Datalog Rule Card

The `Upload your Datalog rule` card lets the user replace the active Datalog rule file.

Accepted file types:

- `.dlog`
- `.txt`

Button: `Upload Rule`

What it does:

1. Opens a file picker.
2. Reads the selected Datalog rule file.
3. Encodes the rule content and sends it to the .NET API.
4. The .NET API loads the rules into RDFox.
5. The interface updates the active rule filename.
6. The Rule Viewer is refreshed so it displays the latest rule content.
7. A system log entry is created.

Button: `Rule Viewer`

What it does:

1. Opens the Explanations page.
2. Shows the hidden Rule Viewer panel.
3. Displays the active Datalog source exactly as loaded from the `.dlog` file.

Status text:

The rules status line shows the active Datalog rule file. By default, it shows:

```text
Datalog rules: c21.dlog
```

### 1.5 Upload Keras Models Card

The `Upload your ML models as Keras` card lets the user upload replacement Keras models for the robot capability prediction API.

Accepted file type:

- `.keras`

Button: `Upload Keras Models`

What it does:

1. Opens a multi-file picker.
2. Sends the selected `.keras` files to the Flask API.
3. Flask stores or reloads the active Keras models.
4. The model status line is updated with loaded model names.
5. Upload errors, missing models, or reload problems are shown in the status text.
6. A system log entry is created.

Default loaded models:

```text
IRB 1200, IRB 2400, Ned 2
```

The exact mapping between uploaded files and robot names is handled by the Flask model API.

### 1.6 Cartesian Coordinate Input

The task input panel is labeled:

```text
Add XYZ Cartesian coordinates for the new task:
```

The note below the label is important:

```text
Only X, Y, and Z are used to calculate repeatability and precision; roll, pitch, and yaw are not considered in this assessment.
```

Input format:

```text
X, Y, Z
```

Example:

```text
0.809084032, 0.996536649, 0.758164456
```

Button: `Add XYZ`

What it does:

- Focuses the coordinate input field.
- Helps the user start entering a new Cartesian task.

Button: `x`

What it does:

- Clears the coordinate input.
- Clears any current task status message.

Button: `Execute`

What it does:

1. Reads the input text.
2. Validates that exactly three numeric values were provided.
3. Sends the coordinates to the Flask `/predict` endpoint.
4. Flask runs the Keras robot models.
5. The interface stores the prediction result and the current coordinates.
6. Existing selected fact, natural language explanation, and XAI state are reset.
7. The prediction result dialog opens.
8. A system log entry is created.

If the coordinate input is invalid, the page shows a validation message and no model call is made.

### 1.7 Prediction Result Dialog

After `Execute`, the result dialog displays:

```text
Based on Cartesian Coordinates X, Y, Z for a new task, the robot operational capabilities are following:
```

For each robot, it shows:

- Repeatability Capability Value (mm)
- Precision Capability Value (mm)
- Source

Robots displayed:

- `IRB 1200`
- `IRB 2400`
- `Ned-2`

Default source after neural model prediction:

```text
Source: NN Model prediction
```

The dialog also shows:

```text
Note: once you execute, these values will be updated in the Knowledge Graph for the further reasoning process.
```

and:

```text
If you want to add a hypothetical value for counterfactual simulation, press the Simulated Value button.
```

Button: `Simulated Value`

What it does:

1. Opens the simulation panel inside the dialog.
2. Displays editable repeatability and precision fields for each robot.
3. Lets the user replace NN predictions with hypothetical values.

Button: `Apply Simulated Values`

What it does:

1. Validates all simulated values.
2. Replaces the current operational capability values in the browser state.
3. Changes the source to:

```text
User simulated value
```

4. Rebuilds the KG update query that will be used on submit.
5. Marks the current run as simulated mode.
6. Re-renders the result dialog with the updated values.

Button: `Submit`

What it does:

1. Builds a SPARQL delete/insert update query.
2. Deletes old `RCO:has_Measurement_Value` values for the operational capability instances.
3. Inserts the latest predicted or simulated values as `RCO:has_Measurement_Value`.
4. Sends the update query to the .NET API.
5. The .NET API updates RDFox.
6. RDFox applies the loaded Datalog rules.
7. The interface refreshes reasoned facts.
8. The dialog closes.
9. The Explanations page opens.
10. A system log entry is created.

If the submitted values came from the neural model, the refreshed facts are stored as the baseline `before` state. If the submitted values came from simulation, the refreshed facts are stored as the simulated `after` state.

Button: `OK`

What it does:

- Closes the dialog without submitting values to the knowledge graph.

Button: `Cancel`

What it does:

- Closes the dialog without submitting values to the knowledge graph.

### 1.8 Further Reads

The Main page includes a collapsible `Further Reads` section with thesis and publication references related to:

- Semantic XAI
- Manufacturing commonsense knowledge
- MACS-KG
- Robot capability modeling
- Ontology-based explainable AI in manufacturing

This section is informational and does not affect prediction, RDFox, or reasoning.

## 2. Explanations Page

The Explanations page is the analysis area of the system. It shows what RDFox inferred, why the facts were selected, how NN predictions contributed to them, and how explanations can be generated as graphs, XAI attributions, SPARQL queries, and natural language.

### 2.1 Page Actions

Button: `Refresh Facts`

What it does:

1. Runs the reasoned facts SPARQL query against RDFox.
2. Loads current suitability facts into the browser.
3. Updates the Reasoned Facts tab.
4. Updates the selected/whole graph if needed.
5. Updates the counterfactual comparison section.
6. Updates XAI quality indicators.
7. Writes a system log entry with the number of loaded facts.

Button: `Export Report`

What it does:

Exports an HTML report containing the current explanation state. Depending on what the user has already run, the report can include:

- Selected fact
- Reasoned facts
- Graph SVG
- Prediction values
- Simulated values
- Counterfactual comparison
- LIME output
- SHAP output
- Integrated Gradients output
- Permutation Importance output
- Natural language explanation
- SPARQL fact query
- SPARQL KG update query

The report reflects the current UI state, so the user should run the desired explanations before exporting.

### 2.2 Source Strip

The source strip explains the possible origin of values shown in the explanation workflow:

- `Ontology original value`
- `Model prediction`
- `User simulated value`

The strip helps the user distinguish between values already present in the ontology, values predicted by neural models, and values manually entered for simulation.

### 2.3 Reasoned Facts Tab

The `Reasoned Facts` tab lists the suitability facts produced by the rule-based decision mechanism.

Typical fact types include:

- `BestSuitableDueToRepeatability`
- `BestSuitableDueToPrecision`
- `LeastSuitableDueToRepeatability`
- `LeastSuitableDueToPrecision`
- `OptimalRobot`

For each fact row, the interface shows:

- Robot name
- Fact type
- Capability focus when available
- Action buttons

Button: `View Graph`

What it does:

1. Selects that fact.
2. Opens the Graph tab.
3. Shows the selected fact graph.
4. Highlights the selected reasoned fact and its related robot/capability/measurement evidence.

Button: `Explain`

What it does:

1. Selects that fact.
2. Opens the Natural Language Explanations tab.
3. Prepares the selected fact context for OpenAI or Ollama explanation.

The Reasoned Facts tab is the main entry point for fact-specific explanation.

### 2.4 Graph Tab

The `Graph` tab visualizes the semantic reasoning context.

Graph modes:

- `Selected Fact`
- `Whole Graph`

Button: `Selected Fact`

What it does:

- Shows the graph for the currently selected reasoned fact.
- Displays the selected robot, relevant operational capability nodes, measurement values, RDF predicates, and the selected reasoned fact.
- Hides whole-graph filters because they only apply to the complete graph view.

Button: `Whole Graph`

What it does:

- Shows the broader graph representation for the current KG state.
- Includes robots, capabilities, measurement values, and reasoned facts.
- Enables graph filters.

Button: `Export SVG`

What it does:

- Downloads the current graph visualization as an SVG file.

Button: `Export PNG`

What it does:

- Converts the current SVG graph to a PNG image and downloads it.

Whole Graph filters:

- `Robots`: shows or hides robot nodes.
- `Capabilities`: shows or hides operational capability nodes.
- `Measurements`: shows or hides measurement value nodes.
- `Reasoned Facts`: shows or hides inferred suitability fact nodes.
- `Selected Robot Only`: when a fact is selected, narrows the whole graph to the selected robot.

Graph legend:

- Robot
- Capability
- NN prediction value
- User simulated value
- Selected reasoned fact
- RDF predicate

Graph interactions:

- Nodes can be clicked.
- Nodes can be dragged.
- Clicking a node updates the `Node Details` panel.

Node Details panel:

The panel explains the selected graph node. Depending on node type, it can show:

- Node label
- Node type
- Robot
- Capability
- Measurement value
- Source
- Connected RDF predicates
- Connected neighbor nodes

Trace panel:

The trace panel gives a compact explanation of the selected fact. It includes:

1. The task was assessed from Cartesian coordinates `X, Y, Z`.
2. Predicted or simulated values were stored as `RCO:has_Measurement_Value`.
3. The selected fact name, such as `IRB-1200 rdf:type BestSuitableDueToRepeatability`.
4. The rule-based mechanism used the relevant Datalog rule and KG values to select the fact.

Important semantic point:

Properties such as `RCO:hasCapability` and `RCO:has_Measurement_Value` are shown as edge labels, not as ordinary nodes, because they connect entities and values in the graph.

### 2.5 Simulated / Counterfactual Comparison Tab

The `Simulated / Counterfactual Comparison` tab compares baseline facts and simulated facts.

Before Simulation Facts:

- Shows the facts produced after a normal NN prediction submit.
- Represents the original model-driven decision state.

After Simulation Facts:

- Shows the facts produced after the user entered hypothetical values through the `Simulated Value` dialog and submitted them.
- Represents the changed decision state.

What Must Change?

This panel explains which operational capability would need to change for the selected robot to reach or lose a suitability status. It uses the selected fact, current measurements, and the closest relevant comparison boundary.

Examples of what the panel can explain:

- A robot is best due to repeatability because it has the minimum repeatability value.
- A robot is best due to precision because it has the maximum precision value.
- A simulated value would need to increase or decrease to change a selected suitability result.

This tab does not create the simulation itself. Simulation values are entered in the result dialog on the Main page. This tab explains the before/after effect.

### 2.6 XAI Tab

The `XAI` tab explains the neural model behavior around the current Cartesian task point.

The XAI methods operate on:

- Current `X, Y, Z`
- Robot-specific neural model outputs
- Repeatability prediction
- Precision prediction

The methods do not replace RDFox reasoning. They explain the neural values that later become KG measurement values.

#### 2.6.1 Selected Fact NN Contribution

This panel links a selected semantic fact to the neural explanation.

Fact dropdown:

- Lets the user choose a reasoned fact directly from the XAI page.
- The user does not need to return to the graph to select a different fact.

The panel can show:

- Selected fact
- Related robot
- Related capability focus
- Prediction source
- Strongest local coordinate influence from LIME after LIME has been run

If LIME has not been run yet, the panel tells the user to run or refresh LIME.

#### 2.6.2 Run LIME

Button: `Run LIME`

What it does:

1. Sends the current `X, Y, Z` to the Flask LIME endpoint.
2. Generates local samples around the task point.
3. Runs the Keras models on those nearby samples.
4. Fits a local surrogate explanation.
5. Returns feature weights for `X`, `Y`, and `Z`.
6. Displays LIME cards per robot and capability.
7. Updates the selected fact NN contribution panel.
8. Updates XAI confidence/stability.
9. Writes a system log entry.

LIME output explains:

- Which coordinate most influences the local NN prediction.
- Whether increasing that coordinate locally increases or decreases the predicted value.
- Separate explanations for repeatability and precision.

#### 2.6.3 XAI Confidence / Stability

This panel estimates whether the strongest local feature is stable for the current task.

It uses the relationship between the strongest and second strongest LIME feature weights. If one feature is clearly stronger, the explanation is treated as more stable. If feature weights are close, the explanation is treated as less stable.

This is a UI-level explanation quality indicator, not a replacement for formal model validation.

#### 2.6.4 Explanation Quality

This panel summarizes which explanation layers are currently available.

It can reflect availability of:

- Ontology fact
- Datalog rule
- NN prediction
- LIME
- SHAP
- Integrated Gradients
- Permutation Importance
- Natural language explanation

The purpose is to show whether the selected conclusion is supported by semantic, neural, and language explanation evidence.

#### 2.6.5 LIME Local Explanation

The LIME results section stays separate from other XAI methods.

For each robot and capability, it shows:

- Prediction value
- X feature weight
- Y feature weight
- Z feature weight
- Short method-specific explanation

LIME answers:

```text
Around this exact Cartesian task point, which coordinate locally matters most for this NN output?
```

#### 2.6.6 SHAP Comparison

Button: `Run SHAP`

What it does:

1. Sends the current `X, Y, Z` to the Flask SHAP endpoint.
2. Computes SHAP-style attributions for the neural prediction.
3. Displays method-specific SHAP attribution cards.
4. Writes a system log entry.

SHAP answers:

```text
How should the current NN prediction be attributed across X, Y, and Z according to SHAP?
```

SHAP output is shown in its own section and does not move or overwrite the LIME cards.

#### 2.6.7 Integrated Gradients

Button: `Run IG`

What it does:

1. Sends the current `X, Y, Z` to the Flask Integrated Gradients endpoint.
2. Uses a zero XYZ baseline.
3. Accumulates gradients from the baseline to the current task point.
4. Displays attribution values for `X`, `Y`, and `Z`.
5. Writes a system log entry.

Integrated Gradients answers:

```text
From a baseline task point to this task point, which coordinates contribute most to the NN output?
```

#### 2.6.8 Permutation Importance

Button: `Run Permutation`

What it does:

1. Sends the current `X, Y, Z` to the Flask permutation endpoint.
2. Perturbs one coordinate at a time.
3. Measures how much the prediction changes.
4. Displays coordinate importance values.
5. Writes a system log entry.

Permutation Importance answers:

```text
If one coordinate is changed while the others stay fixed, how much does the NN output move?
```

### 2.7 Natural Language Explanations Tab

The `Natural Language Explanations` tab converts the selected RDFox/Datalog fact context into a human-readable explanation.

Provider dropdown:

- `OpenAI`
- `Ollama`
- `Mistral`
- `Gemini`

Button: `Generate Explanation`

What it does depends on the selected provider.

#### 2.7.1 OpenAI Provider

When `OpenAI` is selected:

1. The UI checks whether an OpenAI API key is already stored for the current browser session.
2. If no key is available, the OpenAI key dialog opens.
3. The user pastes a key and clicks `Use Key`.
4. The app requests RDFox explanation evidence from the .NET API.
5. The .NET API uses the selected key to generate a natural language explanation.
6. The result is displayed in the tab.
7. A system log entry is created.

The OpenAI key is stored in browser session storage only. It is not committed to Git.

#### 2.7.2 Ollama Provider

When `Ollama` is selected:

1. The app requests raw RDFox explanation JSON from the .NET API.
2. The browser builds a compact selected-fact context.
3. The context is sent to the Flask `/llm/reasoning` endpoint.
4. Flask calls local Ollama.
5. Ollama returns a short natural language explanation.
6. The result is displayed in the tab.
7. A system log entry is created.

Default local model:

```text
llama3.2:3b
```

Ollama must be installed and the model must be pulled locally before this provider works.

#### 2.7.3 Mistral and Gemini Providers

`Mistral` and `Gemini` are present in the provider dropdown for planned provider support.

Current behavior:

- Selecting either provider does not call an external API.
- The interface reports that the provider is not configured.
- A system log entry records the unsupported provider selection.

#### 2.7.4 Natural Language Output

The generated output includes:

- Selected Fact
- Capability Focus
- KG / NN Measurements
- Before Simulation Facts
- After Simulation Facts
- Natural Language Explanation
- RDFox Explanation JSON Used

The natural language paragraph is designed to be formal and decision-focused. For example, instead of saying RDFox makes a decision, it explains that the rule-based decision mechanism applies the Datalog rule and identifies the robot using the compared operational capability values.

### 2.8 SPARQL Tab

The `SPARQL` tab shows the queries used by the system.

`Reasoned Facts Query`

This query asks RDFox for the current suitability facts, such as best/least suitable robots and optimal robot facts.

`Latest KG Update Query`

This query is generated after prediction or simulation. It shows the delete/insert update used to replace old capability measurement values with the latest values.

The update query writes values as:

```text
RCO:has_Measurement_Value
```

This tab is useful for debugging and for showing exactly how the browser updates the knowledge graph.

### 2.9 Ontology Viewer Panel

The `Ontology Viewer` is opened from the Main page `Upload your OWL/RDF ontology` card. It is displayed inside the Explanations page but is not part of the normal explanation tab row.

Button: `Load Ontology`

What it does:

1. Queries RDFox for ontology triples.
2. Loads classes, subclass relationships, instances, properties, and predicates.
3. Builds an interactive graph.
4. Writes a system log entry.

Ontology graph legend:

- Class
- Instance
- Property
- Ontology predicate

Search bar:

Filters the ontology graph by:

- Class label
- Instance label
- Property label
- Predicate label

Dropdown filter:

- `All ontology elements`
- `Classes`
- `subClassOf`
- `Instances`
- `Properties`

Graph interactions:

- Nodes can be clicked.
- Nodes can be dragged.
- Clicking a node updates `Ontology Node Details`.

Ontology Node Details can show:

- Node type
- Identifier
- Connected predicates
- Neighboring ontology entities

The Ontology Viewer is for inspecting the loaded ontology structure. It does not run reasoning and does not change KG values.

### 2.10 Rule Viewer Panel

The `Rule Viewer` is opened from the Main page `Upload your Datalog rule` card. It is displayed inside the Explanations page but is not part of the normal explanation tab row.

Button: `Refresh Rules`

What it does:

1. Reloads the currently active Datalog rule text into the viewer.
2. If no custom rule text is active, it loads the default `c21.dlog` source.
3. Displays the source exactly as loaded.

The Rule Viewer is used to inspect the Datalog rules that drive suitability conclusions. It does not edit rules directly. To change rules, use `Upload Rule` on the Main page.

## 3. System Logs Page

The `System Logs` page is the operational audit trail of the interface.

It answers:

```text
What happened in the application, and when?
```

The log is useful when testing because RDFox, Flask, the .NET API, and the browser all interact. If a result looks wrong, the log helps identify which step succeeded or failed.

### 3.1 Log Display

The page shows log entries in reverse chronological order. The newest event appears at the top.

Each entry includes:

- Local timestamp
- Short event message

Default placeholder:

```text
System events will appear here when ontology, Datalog rules, model values, or inferred facts are updated.
```

### 3.2 Clear Log

Button: `Clear Log`

What it does:

- Removes all current log entries from the browser.
- Restores the placeholder text.

It does not clear RDFox data, model state, uploaded files, facts, predictions, or explanations. It only clears the visible UI log.

### 3.3 Events Recorded in Logs

The system writes log entries for successful and failed operations.

Knowledge asset events:

- Default ontology and Datalog rules reloaded.
- Default reload failed.
- Custom ontology uploaded.
- Custom ontology upload failed.
- Custom Datalog rule uploaded.
- Custom Datalog rule upload failed.
- Custom Keras models uploaded and reloaded.
- Keras model upload failed.

Prediction and KG events:

- NN model prediction completed for a specific `X, Y, Z`.
- Prediction failed.
- Operational capability values updated in the Knowledge Graph.
- Knowledge Graph update failed.
- Facts refreshed with a count of loaded facts.
- Facts refresh failed.

Graph and ontology events:

- Ontology viewer loaded a number of triples.
- Ontology viewer failed.
- Rule viewer failed.

XAI events:

- LIME explanations generated.
- LIME explanation failed.
- SHAP explanations generated.
- SHAP explanation unavailable or failed.
- Integrated Gradients explanations generated.
- Integrated Gradients explanation failed.
- Permutation Importance explanations generated.
- Permutation Importance explanation failed.

Natural language events:

- OpenAI natural language explanation generated.
- OpenAI natural language explanation failed.
- Ollama natural language explanation generated.
- Ollama natural language explanation failed.
- Mistral provider selected but not configured.
- Gemini provider selected but not configured.

### 3.4 How to Use Logs During Testing

A normal successful test produces this kind of sequence:

1. Default ontology and Datalog rules are reloaded.
2. NN model prediction completes for the entered `X, Y, Z`.
3. Operational capability values are updated in the Knowledge Graph.
4. Facts are refreshed.
5. Optional graph, XAI, ontology, rule, or natural language events appear depending on what the user runs.

If something fails:

- Prediction failures usually point to Flask/model/API issues.
- KG update failures usually point to the .NET API, RDFox, datastore, or SPARQL update.
- Fact refresh failures usually point to RDFox query or datastore loading issues.
- XAI failures usually point to missing Python dependencies such as LIME or SHAP, or to Flask endpoint errors.
- OpenAI failures usually point to an invalid or missing API key.
- Ollama failures usually point to Ollama not running, the model not being pulled, or a local model timeout.

## 4. End-to-End Workflow

A complete normal workflow is:

1. Start the project.
2. Open the web UI.
3. Click `Reload Defaults` if the RDFox datastore needs a clean load.
4. Optionally upload a custom ontology, Datalog rule, or Keras models.
5. Enter Cartesian coordinates as `X, Y, Z`.
6. Click `Execute`.
7. Review NN-predicted repeatability and precision values for each robot.
8. Optionally click `Simulated Value` and enter hypothetical values.
9. Click `Submit`.
10. The latest values are written to the knowledge graph as `RCO:has_Measurement_Value`.
11. RDFox applies the Datalog rules.
12. The Explanations page opens.
13. Inspect `Reasoned Facts`.
14. Click `View Graph` to inspect semantic evidence.
15. Use `Whole Graph` for the broader graph representation.
16. Use `Simulated / Counterfactual Comparison` to compare baseline and simulated outcomes.
17. Use `XAI` to inspect neural feature influence from LIME, SHAP, Integrated Gradients, and Permutation Importance.
18. Use `Natural Language Explanations` to generate a formal text explanation with OpenAI or Ollama.
19. Use `SPARQL` to inspect the generated query and update.
20. Use `Export Report` to save the current explanation state.
21. Use `System Logs` to verify what happened and troubleshoot failures.

## 5. Backend Responsibilities by Function

The browser coordinates three services.

RDFox:

- Stores ontology triples.
- Stores capability measurement values.
- Applies Datalog rules.
- Returns reasoned facts.
- Returns explanation JSON for selected facts.

.NET API:

- Loads ontology and Datalog files into RDFox.
- Sends SPARQL select/update requests to RDFox.
- Requests RDFox explanation JSON.
- Supports OpenAI-based natural language explanation when a user key is supplied.

Flask API:

- Loads Keras robot models.
- Runs prediction for `X, Y, Z`.
- Accepts uploaded Keras models.
- Runs LIME explanations.
- Runs SHAP explanations.
- Runs Integrated Gradients explanations.
- Runs Permutation Importance explanations.
- Calls local Ollama for open-model natural language reasoning.

The browser UI:

- Collects user input.
- Displays predictions.
- Builds the KG update query.
- Displays facts, graphs, XAI results, natural language explanations, ontology views, Datalog rules, SPARQL, and logs.
- Keeps temporary state such as selected fact, prediction source, simulated values, and current explanation results.

## 6. What Does Not Happen Automatically

Some actions require explicit user clicks:

- The knowledge graph is not updated when the user clicks `Execute`; it updates only after `Submit`.
- Simulation values do not affect RDFox until `Apply Simulated Values` and then `Submit` are used.
- XAI methods do not run automatically when facts refresh; the user clicks `Run LIME`, `Run SHAP`, `Run IG`, or `Run Permutation`.
- Natural language explanation does not run automatically when a fact is selected; the user selects a provider and clicks `Generate Explanation`.
- Ontology Viewer does not load automatically after opening; the user clicks `Load Ontology`.
- Rule Viewer displays active rule text, but rule changes are made from the Main page upload control.
- Mistral and Gemini are shown as provider options but are not connected yet.

## 7. Main Concepts in One View

```text
Cartesian task X, Y, Z
        |
        v
Keras robot models
        |
        v
Predicted repeatability and precision values
        |
        v
RCO:has_Measurement_Value in RDFox knowledge graph
        |
        v
Datalog rule-based decision mechanism
        |
        v
Reasoned facts such as BestSuitableDueToRepeatability
        |
        v
Graph explanation, XAI explanation, Natural Language explanation, SPARQL query, and System Logs
```

