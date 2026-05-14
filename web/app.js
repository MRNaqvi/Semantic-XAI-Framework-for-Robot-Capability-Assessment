const predictUrl = "http://127.0.0.1:5000/predict";
const backendUrl = "http://localhost:11191/api/Query/Insert";
const selectUrl = "http://localhost:11191/api/Query/Select";
const factExplainUrl = "http://localhost:11191/api/Query/FactExplain";
const uploadTtlUrl = "http://localhost:11191/api/Query/UploadTTL";
const uploadRuleUrl = "http://localhost:11191/api/Query/UploadRule";
const modelStatusUrl = "http://127.0.0.1:5000/models/status";
const uploadModelsUrl = "http://127.0.0.1:5000/models/upload";

const robotOrder = ["IRB 1200", "IRB 2400", "Ned 2"];
const robotDisplayName = {
  "Ned 2": "Ned-2",
  "IRB 2400": "IRB 2400",
  "IRB 1200": "IRB 1200",
};

const xyzInput = document.querySelector("#xyzInput");
const datastoreInput = document.querySelector("#datastore");
const clearButton = document.querySelector("#clearButton");
const addButton = document.querySelector("#addButton");
const executeButton = document.querySelector("#executeButton");
const uploadButton = document.querySelector("#uploadButton");
const simulateButton = document.querySelector("#simulateButton");
const applySimulationButton = document.querySelector("#applySimulationButton");
const submitButton = document.querySelector("#submitButton");
const cancelButton = document.querySelector("#cancelButton");
const okButton = document.querySelector("#okButton");
const refreshFactsButton = document.querySelector("#refreshFactsButton");
const exportReportButton = document.querySelector("#exportReportButton");
const resultDialog = document.querySelector("#resultDialog");
const resultText = document.querySelector("#resultText");
const simulationPanel = document.querySelector("#simulationPanel");
const simulationGrid = document.querySelector("#simulationGrid");
const statusText = document.querySelector("#statusText");
const taskPanel = document.querySelector("#taskPanel");
const factsList = document.querySelector("#factsList");
const factGraph = document.querySelector("#factGraph");
const tracePanel = document.querySelector("#tracePanel");
const nlExplanation = document.querySelector("#nlExplanation");
const ruleList = document.querySelector("#ruleList");
const beforeFacts = document.querySelector("#beforeFacts");
const afterFacts = document.querySelector("#afterFacts");
const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));
const ontologyFile = document.querySelector("#ontologyFile");
const rulesFile = document.querySelector("#rulesFile");
const uploadOntologyButton = document.querySelector("#uploadOntologyButton");
const uploadRulesButton = document.querySelector("#uploadRulesButton");
const uploadModelsButton = document.querySelector("#uploadModelsButton");
const modelStatus = document.querySelector("#modelStatus");
const modelFileInputs = {
  "Ned 2": document.querySelector("#modelNed2File"),
  "IRB 2400": document.querySelector("#modelIrb2400File"),
  "IRB 1200": document.querySelector("#modelIrb1200File"),
};
const fileInputs = Array.from(document.querySelectorAll(".file-picker input[type='file']"));

let lastResult = null;
let lastFacts = [];
let baselineFacts = [];
let simulatedFacts = [];
let selectedFact = null;
let simulatedMode = false;

const factTypes = [
  "RCO:BestSuitableDueToRepeatability",
  "RCO:BestSuitableDueToPrecision",
  "RCO:LeastSuitableDueToRepeatability",
  "RCO:LeastSuitableDueToPrecision",
  "RCO:BestRobot",
  "RCO:WorstRobot",
  "RCO:OptimalRobot",
];

const factLabels = {
  "RCO:BestSuitableDueToRepeatability": "Best suitable due to repeatability",
  "RCO:BestSuitableDueToPrecision": "Best suitable due to precision",
  "RCO:LeastSuitableDueToRepeatability": "Least suitable due to repeatability",
  "RCO:LeastSuitableDueToPrecision": "Least suitable due to precision",
  "RCO:BestRobot": "Best robot",
  "RCO:WorstRobot": "Worst robot",
  "RCO:OptimalRobot": "Optimal robot",
};

const ruleDefinitions = [
  {
    title: "Maximum Repeatability Capability",
    text: "Finds the largest operational repeatability value among all robots.",
  },
  {
    title: "Maximum Precision Capability",
    text: "Finds the largest operational precision value among all robots.",
  },
  {
    title: "Minimum Repeatability Capability",
    text: "Finds the smallest operational repeatability value among all robots.",
  },
  {
    title: "Minimum Precision Capability",
    text: "Finds the smallest operational precision value among all robots.",
  },
  {
    title: "Best Suitable Due To Repeatability",
    text: "Classifies the robot with the minimum operational repeatability value as best suitable due to repeatability.",
  },
  {
    title: "Best Suitable Due To Precision",
    text: "Classifies the robot with the maximum operational precision value as best suitable due to precision.",
  },
  {
    title: "Least Suitable Due To Repeatability",
    text: "Classifies the robot with the maximum operational repeatability value as least suitable due to repeatability.",
  },
  {
    title: "Least Suitable Due To Precision",
    text: "Classifies the robot with the minimum operational precision value as least suitable due to precision.",
  },
  {
    title: "Optimal Robot",
    text: "Classifies a robot as optimal when it satisfies the secondary capability condition among robots already best in repeatability or precision.",
  },
];

function parseCoordinates(value) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length !== 3) {
    throw new Error("Please enter exactly three values: X, Y, Z.");
  }

  const numbers = parts.map(Number);
  if (numbers.some((number) => Number.isNaN(number))) {
    throw new Error("XYZ values must be numbers.");
  }

  return numbers;
}

function formatValue(value) {
  return `[${Number(value).toFixed(8).replace(/0+$/, "").replace(/\.$/, "")}]`;
}

function formatResults(modelOutputs) {
  const byName = new Map(modelOutputs.map((item) => [item.model, item]));

  return robotOrder
    .map((robot) => {
      const result = byName.get(robot);
      if (!result) {
        return "";
      }

      return `${robotDisplayName[robot]}:
  Repeatability Capability Value (mm): ${formatValue(result.repeatability)}
  Precision Capability Value (mm): ${formatValue(result.precision)}
  Source: ${result.source || "NN Model prediction"}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function shortName(value) {
  return String(value || "")
    .replace(/^RCO:/, "")
    .replace(/[<>]/g, "")
    .replace("http://RCO.enit.fr/", "");
}

function factsToText(facts) {
  if (!facts.length) {
    return "No facts loaded.";
  }

  return facts
    .map((fact) => `${shortName(fact.robot)} -> ${factLabels[fact.type] || shortName(fact.type)}`)
    .join("\n");
}

function makeFactsQuery() {
  return `PREFIX RCO: <http://RCO.enit.fr/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?robot ?classification ?marker WHERE {
  VALUES ?classification {
    ${factTypes.join("\n    ")}
  }
  ?robot rdf:type ?classification .
  BIND("fact" AS ?marker)
}`;
}

function makeFactSyntax(fact) {
  return `${fact.type}[${fact.robot}]`;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === false) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

function renderRules() {
  ruleList.innerHTML = "";
  ruleDefinitions.forEach((rule) => {
    const card = document.createElement("article");
    card.className = "rule-card";
    card.innerHTML = `<h3>${rule.title}</h3><p>${rule.text}</p>`;
    ruleList.appendChild(card);
  });
}

function refreshFileName(input) {
  const label = document.querySelector(`.file-name[data-for="${input.id}"]`);
  if (!label) {
    return;
  }

  label.textContent = input.files[0]?.name || "No file selected";
}

function activateTab(tabId) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.id === tabId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
}

async function fileToText(file) {
  if (!file) {
    throw new Error("Please choose a file first.");
  }

  return file.text();
}

async function uploadOntologyFromFile() {
  try {
    const text = await fileToText(ontologyFile.files[0]);
    await uploadOntologyText(text, "Custom ontology uploaded.");
  } catch (error) {
    statusText.textContent = error.message;
  }
}

async function uploadRulesFromFile() {
  try {
    const text = await fileToText(rulesFile.files[0]);
    await uploadRuleText(text, "Custom Datalog rules uploaded.");
  } catch (error) {
    statusText.textContent = error.message;
  }
}

async function refreshModelStatus() {
  try {
    const response = await fetch(modelStatusUrl);
    const payload = await response.json();
    const loaded = payload.loaded_models?.join(", ") || "No models loaded";
    const errors = Object.entries(payload.errors || {})
      .map(([name, error]) => `${name}: ${error}`)
      .join("\n");
    modelStatus.textContent = errors ? `Loaded: ${loaded}\nErrors:\n${errors}` : `Loaded: ${loaded}`;
  } catch (error) {
    modelStatus.textContent = error.message;
  }
}

async function uploadCustomModels() {
  try {
    const formData = new FormData();
    Object.entries(modelFileInputs).forEach(([robot, input]) => {
      if (input.files[0]) {
        formData.append(robot, input.files[0]);
      }
    });

    if (!Array.from(formData.keys()).length) {
      throw new Error("Choose at least one .keras model file.");
    }

    uploadModelsButton.disabled = true;
    uploadModelsButton.textContent = "Uploading...";

    const response = await fetch(uploadModelsUrl, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();

    if (!response.ok || !payload.status) {
      throw new Error(payload.message || "Model upload failed.");
    }

    modelStatus.textContent = `Loaded: ${payload.loaded_models.join(", ")}`;
    statusText.textContent = "Custom Keras models uploaded and reloaded.";
  } catch (error) {
    statusText.textContent = error.message;
  } finally {
    uploadModelsButton.disabled = false;
    uploadModelsButton.textContent = "Upload Models";
  }
}

function renderFacts(facts) {
  factsList.innerHTML = "";

  if (!facts.length) {
    factsList.textContent = "No facts found. Load ontology/rules, submit capabilities, then refresh.";
    renderGraph(null);
    return;
  }

  const grouped = new Map();
  facts.forEach((fact) => {
    const label = factLabels[fact.type] || shortName(fact.type);
    if (!grouped.has(label)) {
      grouped.set(label, []);
    }
    grouped.get(label).push(fact);
  });

  grouped.forEach((items, label) => {
    const group = document.createElement("section");
    group.className = "fact-group";
    const heading = document.createElement("h3");
    heading.textContent = label;
    group.appendChild(heading);

    items.forEach((fact) => {
      const row = document.createElement("div");
      row.className = "fact-row";
      row.innerHTML = `<span>${shortName(fact.robot)}</span>`;

      const graphButton = document.createElement("button");
      graphButton.type = "button";
      graphButton.textContent = "View Graph";
      graphButton.addEventListener("click", () => {
        selectedFact = fact;
        renderGraph(fact);
      });

      const explainButton = document.createElement("button");
      explainButton.type = "button";
      explainButton.textContent = "Explain";
      explainButton.addEventListener("click", () => explainFact(fact));

      row.appendChild(graphButton);
      row.appendChild(explainButton);
      group.appendChild(row);
    });

    factsList.appendChild(group);
  });
}

function renderGraph(fact) {
  factGraph.innerHTML = "";
  tracePanel.innerHTML = "";

  if (!fact) {
    tracePanel.textContent = "Select a fact to see the reasoning path.";
    return;
  }

  const robot = shortName(fact.robot);
  const classification = factLabels[fact.type] || shortName(fact.type);
  const modelResult = lastResult?.model_outputs?.find((item) =>
    shortName(item.robot).toLowerCase().includes(robot.toLowerCase())
  );

  const nodes = [
    { id: "robot", label: robot, x: 90, y: 180 },
    { id: "repeatability", label: `Repeatability\n${formatValue(modelResult?.repeatability ?? 0)}`, x: 275, y: 100 },
    { id: "precision", label: `Precision\n${formatValue(modelResult?.precision ?? 0)}`, x: 275, y: 260 },
    { id: "rule", label: classification, x: 500, y: 180 },
    { id: "fact", label: "Fact", x: 680, y: 180 },
  ];

  const edges = [
    ["robot", "repeatability"],
    ["robot", "precision"],
    ["repeatability", "rule"],
    ["precision", "rule"],
    ["rule", "fact"],
  ];

  edges.forEach(([from, to]) => {
    const a = nodes.find((node) => node.id === from);
    const b = nodes.find((node) => node.id === to);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", a.x);
    line.setAttribute("y1", a.y);
    line.setAttribute("x2", b.x);
    line.setAttribute("y2", b.y);
    line.setAttribute("class", "graph-edge");
    factGraph.appendChild(line);
  });

  nodes.forEach((node) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", node.id === "fact" ? "graph-node selected" : "graph-node");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", node.id === "rule" ? "48" : "42");
    group.appendChild(circle);

    const lines = node.label.split("\n");
    lines.forEach((lineText, index) => {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", node.x);
      text.setAttribute("y", node.y + (index - (lines.length - 1) / 2) * 16);
      text.textContent = lineText;
      group.appendChild(text);
    });

    factGraph.appendChild(group);
  });

  tracePanel.innerHTML = `
    <ol>
      <li>Based on Cartesian Coordinates X, Y, Z for a new task.</li>
      <li>Predicted or simulated values are stored as <code>RCO:has_Measurement_Value</code>.</li>
      <li>The selected fact is <code>${fact.type}</code> for <code>${fact.robot}</code>.</li>
    </ol>`;
}

async function refreshFacts(target = "after") {
  try {
    statusText.textContent = "";
    const payload = await postJson(selectUrl, {
      store_name: datastoreInput.value.trim() || "S-XAI",
      p_query: encodeURIComponent(makeFactsQuery()),
    });

    const rows = payload?.data?.queryResult || [];
    lastFacts = rows
      .map((row) => ({
        robot: row.word1,
        type: row.word2,
        marker: row.word3,
      }))
      .filter((fact) => fact.robot && fact.type);

    if (target === "before") {
      baselineFacts = [...lastFacts];
    } else {
      simulatedFacts = [...lastFacts];
    }

    beforeFacts.textContent = factsToText(baselineFacts);
    afterFacts.textContent = factsToText(simulatedFacts);
    renderFacts(lastFacts);
  } catch (error) {
    statusText.textContent = error.message;
  }
}

async function explainFact(fact) {
  try {
    selectedFact = fact;
    renderGraph(fact);
    nlExplanation.textContent = "Explaining...";

    const payload = await postJson(factExplainUrl, {
      store_name: datastoreInput.value.trim() || "S-XAI",
      fact_query: makeFactSyntax(fact),
      explanation_type: "shortest",
    });

    const explanation =
      payload?.data?.additionalExplanation ||
      payload?.data?.originalResponse?.additionalExplanation ||
      payload?.message ||
      "No natural language explanation returned.";

    nlExplanation.textContent = explanation;
  } catch (error) {
    nlExplanation.textContent = error.message;
  }
}

function exportReport() {
  const report = [
    "Robot Operational Capability Report",
    "",
    "Current task:",
    xyzInput.value || "No task entered.",
    "",
    "Capability values:",
    lastResult ? formatResults(lastResult.model_outputs) : "No model results.",
    "",
    "Before simulation facts:",
    factsToText(baselineFacts),
    "",
    "After simulation facts:",
    factsToText(simulatedFacts),
    "",
    "Selected explanation:",
    nlExplanation.textContent,
  ].join("\n");

  const blob = new Blob([report], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "robot-operational-capability-report.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function buildOntologyUpdateQuery(modelOutputs) {
  const updates = modelOutputs.flatMap((result) => result.ontology_updates);
  const values = updates
    .map(
      (update) =>
        `        (${update.robot} ${update.capability} "${update.value}"^^xsd:decimal)`
    )
    .join("\n");

  return `PREFIX RCO: <http://RCO.enit.fr/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

DELETE {
    ?capability RCO:has_Measurement_Value ?oldValue .
}
INSERT {
    ?capability RCO:has_Measurement_Value ?newValue .
}
WHERE {
    VALUES (?robot ?capability ?newValue) {
${values}
    }
    ?robot RCO:hasCapability ?capability .
    OPTIONAL { ?capability RCO:has_Measurement_Value ?oldValue . }
}
`;
}

function updateCapabilityValue(result, capabilityLabel, value) {
  result[capabilityLabel] = value;
  result.outputs[capabilityLabel] = value;
  result.source = "User simulated value";

  const suffix =
    capabilityLabel === "repeatability"
      ? "OperationalRepeatabilityCapability"
      : "OperationalPrecisionCapability";

  const update = result.ontology_updates.find((item) =>
    item.capability.includes(suffix)
  );

  if (update) {
    update.value = value;
  }
}

function refreshResultFromCurrentValues() {
  resultText.textContent = formatResults(lastResult.model_outputs);
  lastResult.ontology_updates = lastResult.model_outputs.flatMap(
    (result) => result.ontology_updates
  );
  lastResult.ontology_update_query = buildOntologyUpdateQuery(
    lastResult.model_outputs
  );
}

function renderSimulationPanel() {
  simulationGrid.innerHTML = "";

  robotOrder.forEach((robot) => {
    const result = lastResult.model_outputs.find((item) => item.model === robot);
    if (!result) {
      return;
    }

    const group = document.createElement("fieldset");
    group.className = "simulation-group";

    const title = document.createElement("legend");
    title.textContent = robotDisplayName[robot];
    group.appendChild(title);

    ["repeatability", "precision"].forEach((capability) => {
      const label = document.createElement("label");
      label.textContent =
        capability === "repeatability"
          ? "Repeatability Capability Value (mm)"
          : "Precision Capability Value (mm)";

      const input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.value = result[capability];
      input.dataset.robot = robot;
      input.dataset.capability = capability;

      label.appendChild(input);
      group.appendChild(label);
    });

    simulationGrid.appendChild(group);
  });
}

function toggleSimulationPanel() {
  if (!lastResult) {
    statusText.textContent = "Run a prediction first.";
    return;
  }

  if (simulationPanel.hidden) {
    renderSimulationPanel();
    simulationPanel.hidden = false;
  } else {
    simulationPanel.hidden = true;
  }
}

function applySimulationValues() {
  const inputs = Array.from(simulationGrid.querySelectorAll("input"));

  for (const input of inputs) {
    const value = Number(input.value);
    if (Number.isNaN(value)) {
      statusText.textContent = "Simulated capability values must be numbers.";
      return;
    }

    const result = lastResult.model_outputs.find(
      (item) => item.model === input.dataset.robot
    );
    updateCapabilityValue(result, input.dataset.capability, value);
  }

  refreshResultFromCurrentValues();
  simulatedMode = true;
  simulationPanel.hidden = true;
  statusText.textContent =
    "Simulated operational capability values are ready to submit.";
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function uploadKnowledgeBase() {
  try {
    statusText.textContent = "";
    uploadButton.disabled = true;
    uploadButton.textContent = "Uploading...";

    const [ttlText, dlogText] = await Promise.all([
      fetch("assets/custom/MCSk222.ttl").then((response) => response.text()),
      fetch("assets/custom/c21.dlog").then((response) => response.text()),
    ]);

    await uploadOntologyText(ttlText);
    await uploadRuleText(dlogText);
    statusText.textContent = "S-XAI ontology, rules, and Keras models are ready.";
  } catch (error) {
    statusText.textContent = error.message;
  } finally {
    uploadButton.disabled = false;
    uploadButton.textContent = "Reload Defaults";
  }
}

async function uploadOntologyText(text, successMessage = "") {
  const storeName = datastoreInput.value.trim() || "S-XAI";
  const response = await fetch(uploadTtlUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filePath: toBase64(text),
      storeName,
      graphName: "",
    }),
  });

  if (!response.ok) {
    throw new Error("TTL ontology upload failed.");
  }

  if (successMessage) {
    statusText.textContent = successMessage;
  }
}

async function uploadRuleText(text, successMessage = "") {
  const storeName = datastoreInput.value.trim() || "S-XAI";
  const response = await fetch(uploadRuleUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filePath: toBase64(text),
      storeName,
      graphName: "",
    }),
  });

  if (!response.ok) {
    throw new Error("Datalog rule upload failed.");
  }

  if (successMessage) {
    statusText.textContent = successMessage;
  }
}

async function executePrediction() {
  try {
    statusText.textContent = "";
    const coordinates = parseCoordinates(xyzInput.value);

    executeButton.disabled = true;
    executeButton.textContent = "Running...";

    const response = await fetch(predictUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [coordinates] }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.status) {
      throw new Error(payload.message || "Prediction failed.");
    }

    lastResult = payload.data[0];
    lastResult.model_outputs.forEach((result) => {
      result.source = "NN Model prediction";
    });
    simulatedMode = false;
    resultText.textContent = formatResults(lastResult.model_outputs);
    simulationPanel.hidden = true;
    taskPanel.classList.add("dimmed");
    resultDialog.showModal();
  } catch (error) {
    statusText.textContent = error.message;
  } finally {
    executeButton.disabled = false;
    executeButton.textContent = "Execute";
  }
}

async function submitOntologyUpdate() {
  if (!lastResult?.ontology_update_query) {
    statusText.textContent = "Run a prediction first.";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_name: datastoreInput.value.trim() || "S-XAI",
        p_query: encodeURIComponent(lastResult.ontology_update_query),
      }),
    });

    if (!response.ok) {
      throw new Error("Prediction succeeded, but ontology update failed.");
    }

    closeDialog();
    statusText.textContent = "Operational capability values updated.";
    await refreshFacts(simulatedMode ? "after" : "before");
  } catch (error) {
    statusText.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Submit";
  }
}

function closeDialog() {
  resultDialog.close();
  taskPanel.classList.remove("dimmed");
}

clearButton.addEventListener("click", () => {
  xyzInput.value = "";
  statusText.textContent = "";
});

addButton.addEventListener("click", () => {
  xyzInput.focus();
});

uploadButton.addEventListener("click", uploadKnowledgeBase);
executeButton.addEventListener("click", executePrediction);
simulateButton.addEventListener("click", toggleSimulationPanel);
applySimulationButton.addEventListener("click", applySimulationValues);
submitButton.addEventListener("click", submitOntologyUpdate);
refreshFactsButton.addEventListener("click", () => refreshFacts("after"));
exportReportButton.addEventListener("click", exportReport);
cancelButton.addEventListener("click", closeDialog);
okButton.addEventListener("click", closeDialog);
uploadOntologyButton.addEventListener("click", uploadOntologyFromFile);
uploadRulesButton.addEventListener("click", uploadRulesFromFile);
uploadModelsButton.addEventListener("click", uploadCustomModels);
tabButtons.forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});
fileInputs.forEach((input) => {
  input.addEventListener("change", () => refreshFileName(input));
});

xyzInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    executePrediction();
  }
});

renderRules();
renderGraph(null);
refreshModelStatus();
uploadKnowledgeBase();
