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
const defaultOntologyName = "MCSk222.ttl";
const defaultRuleName = "c21.dlog";

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
const runPage = document.querySelector("#runPage");
const explanationsPage = document.querySelector("#explanationsPage");
const runPageButton = document.querySelector("#runPageButton");
const explanationsPageButton = document.querySelector("#explanationsPageButton");
const ruleLogPage = document.querySelector("#ruleLogPage");
const ruleLogPageButton = document.querySelector("#ruleLogPageButton");
const ruleLog = document.querySelector("#ruleLog");
const clearRuleLogButton = document.querySelector("#clearRuleLogButton");
const factsList = document.querySelector("#factsList");
const factGraph = document.querySelector("#factGraph");
const graphDetails = document.querySelector("#graphDetails");
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
const ontologyStatus = document.querySelector("#ontologyStatus");
const rulesStatus = document.querySelector("#rulesStatus");
const modelStatus = document.querySelector("#modelStatus");
const modelsFile = document.querySelector("#modelsFile");
const explanationTabs = Array.from(document.querySelectorAll(".explanation-tab"));
const explanationPanels = Array.from(document.querySelectorAll(".explanation-panel"));
const selectedGraphButton = document.querySelector("#selectedGraphButton");
const wholeGraphButton = document.querySelector("#wholeGraphButton");
const graphFiltersPanel = document.querySelector("#graphFilters");
const graphFilterInputs = Array.from(document.querySelectorAll("[data-graph-filter]"));
const selectedRobotOnlyFilter = document.querySelector("#selectedRobotOnlyFilter");

let lastResult = null;
let lastFacts = [];
let baselineFacts = [];
let simulatedFacts = [];
let selectedFact = null;
let simulatedMode = false;
let ruleLogEntries = [];
let activeOntologyName = defaultOntologyName;
let activeRuleName = defaultRuleName;
let activeModelNames = "No models loaded";
let graphMode = "selected";
const graphFilters = {
  robot: true,
  capability: true,
  value: true,
  fact: true,
  selectedRobotOnly: false,
};

function renderAssetStatus(errors = "") {
  ontologyStatus.textContent = `Ontology: ${activeOntologyName}`;
  rulesStatus.textContent = `Datalog rules: ${activeRuleName}`;
  modelStatus.textContent = errors
    ? `Keras models loaded: ${activeModelNames}\nErrors:\n${errors}`
    : `Keras models loaded: ${activeModelNames}`;
}

function showPage(pageName) {
  const showExplanations = pageName === "explanations";
  const showRuleLog = pageName === "ruleLog";
  runPage.hidden = showExplanations || showRuleLog;
  explanationsPage.hidden = !showExplanations;
  ruleLogPage.hidden = !showRuleLog;
  runPageButton.classList.toggle("active", !showExplanations && !showRuleLog);
  explanationsPageButton.classList.toggle("active", showExplanations);
  ruleLogPageButton.classList.toggle("active", showRuleLog);
}

function appendRuleLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  ruleLogEntries.unshift(`[${timestamp}] ${message}`);
  ruleLog.textContent = ruleLogEntries.join("\n");
}

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

function activateExplanationTab(tabId) {
  explanationTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.explanationTab === tabId);
  });

  explanationPanels.forEach((panel) => {
    const isActive = panel.id === tabId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  if (tabId === "graphTab") {
    updateGraphButtons();
  }
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
    const fileName = ontologyFile.files[0]?.name || "custom file";
    const text = await fileToText(ontologyFile.files[0]);
    await uploadOntologyText(text, "Custom ontology uploaded.");
    activeOntologyName = fileName;
    renderAssetStatus();
    appendRuleLog(`Ontology uploaded: ${fileName}.`);
  } catch (error) {
    statusText.textContent = error.message;
    appendRuleLog(`Ontology upload failed: ${error.message}`);
  }
}

async function uploadRulesFromFile() {
  try {
    const fileName = rulesFile.files[0]?.name || "custom file";
    const text = await fileToText(rulesFile.files[0]);
    await uploadRuleText(text, "Custom Datalog rules uploaded.");
    activeRuleName = fileName;
    renderAssetStatus();
    appendRuleLog(`Datalog rule uploaded: ${fileName}.`);
  } catch (error) {
    statusText.textContent = error.message;
    appendRuleLog(`Datalog rule upload failed: ${error.message}`);
  }
}

async function refreshModelStatus() {
  try {
    const response = await fetch(modelStatusUrl);
    const payload = await response.json();
    activeModelNames = payload.loaded_models?.join(", ") || "No models loaded";
    const errors = Object.entries(payload.errors || {})
      .map(([name, error]) => `${name}: ${error}`)
      .join("\n");
    renderAssetStatus(errors);
  } catch (error) {
    modelStatus.textContent = error.message;
  }
}

async function uploadCustomModels() {
  try {
    const formData = new FormData();
    const files = Array.from(modelsFile.files || []);
    const remaining = [...files];
    const assignments = [
      ["Ned 2", (name) => name.includes("ned") || name.includes("model_robotic_arm_2")],
      ["IRB 2400", (name) => name.includes("2400") || name.includes("model_robotic_arm_3")],
      ["IRB 1200", (name) => name.includes("1200") || name.includes("model_robotic_arm_4")],
    ];

    assignments.forEach(([robot, matcher]) => {
      const index = remaining.findIndex((file) => matcher(file.name.toLowerCase()));
      if (index >= 0) {
        formData.append(robot, remaining[index]);
        remaining.splice(index, 1);
      }
    });

    if (!Array.from(formData.keys()).length && files.length === 3) {
      formData.append("Ned 2", files[0]);
      formData.append("IRB 2400", files[1]);
      formData.append("IRB 1200", files[2]);
    }

    if (!Array.from(formData.keys()).length) {
      throw new Error("Choose .keras files named for Ned-2, IRB 2400, or IRB 1200.");
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

    activeModelNames = payload.loaded_models.join(", ");
    renderAssetStatus();
    statusText.textContent = "Custom Keras models uploaded and reloaded.";
    appendRuleLog(`Keras models uploaded and reloaded: ${payload.loaded_models.join(", ")}.`);
  } catch (error) {
    statusText.textContent = error.message;
    appendRuleLog(`Keras model upload failed: ${error.message}`);
  } finally {
    uploadModelsButton.disabled = false;
    uploadModelsButton.textContent = "Upload Keras Models";
    modelsFile.value = "";
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
        graphMode = "selected";
        updateGraphButtons();
        renderGraph(fact);
        activateExplanationTab("graphTab");
      });

      const explainButton = document.createElement("button");
      explainButton.type = "button";
      explainButton.textContent = "Explain";
      explainButton.addEventListener("click", () => {
        activateExplanationTab("nlTab");
        explainFact(fact);
      });

      row.appendChild(graphButton);
      row.appendChild(explainButton);
      group.appendChild(row);
    });

    factsList.appendChild(group);
  });
}

function wrapGraphLabel(label, maxLength = 18) {
  const words = label.split(" ");
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.join("\n");
}

function wrapOntologyName(label) {
  return label.replace(/([a-z])([A-Z])/g, "$1\n$2");
}

function renderSvgText(parent, lines, x, y, className, lineHeight = 14) {
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", x);
  text.setAttribute("y", y);
  text.setAttribute("class", className);

  lines.forEach((lineText, index) => {
    const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tspan.setAttribute("x", x);
    tspan.setAttribute("dy", index === 0 ? "0" : lineHeight);
    tspan.textContent = lineText;
    text.appendChild(tspan);
  });

  parent.appendChild(text);
  return text;
}

function updateGraphButtons() {
  selectedGraphButton.classList.toggle("active", graphMode === "selected");
  wholeGraphButton.classList.toggle("active", graphMode === "whole");
  const showFilters = graphMode === "whole";
  graphFiltersPanel.hidden = !showFilters;
  graphFiltersPanel.classList.toggle("visible", showFilters);
}

function updateGraphFilters() {
  graphFilterInputs.forEach((input) => {
    graphFilters[input.dataset.graphFilter] = input.checked;
  });
  graphFilters.selectedRobotOnly = selectedRobotOnlyFilter.checked;
}

function svgPointFromEvent(event) {
  const point = factGraph.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(factGraph.getScreenCTM().inverse());
}

function renderTrace(items) {
  tracePanel.innerHTML = "";
  const list = document.createElement("ol");
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
  tracePanel.appendChild(list);
}

function humanizeKind(kind = "default") {
  return {
    robot: "Robot",
    capability: "Capability",
    value: "Measurement value",
    fact: "Reasoned fact",
  }[kind] || "Graph node";
}

function renderNodeDetails(node, edges, nodeMap) {
  const cleanLabel = node.label.replace(/\n/g, " ");
  const connected = edges
    .filter((edge) => edge.from === node.id || edge.to === node.id)
    .map((edge) => {
      const predicate = edge.label?.join(" ") || "related to";
      const otherId = edge.from === node.id ? edge.to : edge.from;
      const other = nodeMap.get(otherId);
      const direction = edge.from === node.id ? "outgoing" : "incoming";
      return `${direction}: ${predicate} ${edge.from === node.id ? "->" : "<-"} ${other?.label.replace(/\n/g, " ") || otherId}`;
    });

  graphDetails.innerHTML = "";
  const title = document.createElement("h3");
  title.textContent = cleanLabel;
  graphDetails.appendChild(title);

  const meta = document.createElement("dl");
  const rows = [
    ["Node type", humanizeKind(node.kind)],
    ["Identifier", node.id],
  ];
  if (node.kind === "value") {
    rows.push(["Measurement value", cleanLabel]);
  }
  if (node.kind === "fact") {
    rows.push(["Ontology fact", cleanLabel]);
  }

  rows.forEach(([term, description]) => {
    const dt = document.createElement("dt");
    dt.textContent = term;
    const dd = document.createElement("dd");
    dd.textContent = description;
    meta.append(dt, dd);
  });
  graphDetails.appendChild(meta);

  const relatedTitle = document.createElement("h4");
  relatedTitle.textContent = "Connected predicates";
  graphDetails.appendChild(relatedTitle);

  const list = document.createElement("ul");
  (connected.length ? connected : ["No connected predicates."]).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
  graphDetails.appendChild(list);
}

function renderGraphCanvas(nodes, edges, traceItems) {
  factGraph.innerHTML = "";
  tracePanel.innerHTML = "";
  graphDetails.innerHTML = "<h3>Node Details</h3><p>Click a graph node to inspect its type, value, and connected predicates.</p>";
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edgeRefs = [];

  function updateEdges() {
    edgeRefs.forEach(({ edge, line, label }) => {
      const a = nodeMap.get(edge.from);
      const b = nodeMap.get(edge.to);
      line.setAttribute("x1", a.x);
      line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x);
      line.setAttribute("y2", b.y);
      if (label) {
        label.setAttribute("x", (a.x + b.x) / 2);
        label.setAttribute("y", (a.y + b.y) / 2 - 10);
        label.querySelectorAll("tspan").forEach((tspan) => {
          tspan.setAttribute("x", (a.x + b.x) / 2);
        });
      }
    });
  }

  edges.forEach((edge) => {
    const a = nodeMap.get(edge.from);
    const b = nodeMap.get(edge.to);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("class", "graph-edge");
    factGraph.appendChild(line);

    const label = edge.label?.length
      ? renderSvgText(
          factGraph,
          edge.label,
          (a.x + b.x) / 2,
          (a.y + b.y) / 2 - 10,
          "graph-edge-label"
        )
      : null;
    edgeRefs.push({ edge, line, label });
  });

  nodes.forEach((node) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const classes = ["graph-node", node.kind || "default"];
    if (node.selected) {
      classes.push("selected");
    }
    group.setAttribute("class", classes.join(" "));
    group.setAttribute("transform", `translate(${node.x} ${node.y})`);
    group.setAttribute("tabindex", "0");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", 0);
    circle.setAttribute("cy", 0);
    circle.setAttribute("r", node.selected ? "50" : node.radius || "42");
    group.appendChild(circle);

    const lines = node.label.split("\n");
    lines.forEach((lineText, index) => {
      renderSvgText(
        group,
        [lineText],
        0,
        (index - (lines.length - 1) / 2) * 16,
        "graph-node-label",
        16
      );
    });

    let offset = null;
    let moved = false;
    group.addEventListener("pointerdown", (event) => {
      const point = svgPointFromEvent(event);
      offset = { x: point.x - node.x, y: point.y - node.y };
      moved = false;
      group.setPointerCapture(event.pointerId);
    });
    group.addEventListener("pointermove", (event) => {
      if (!offset) {
        return;
      }
      const point = svgPointFromEvent(event);
      node.x = Math.max(50, Math.min(1050, point.x - offset.x));
      node.y = Math.max(55, Math.min(365, point.y - offset.y));
      moved = true;
      group.setAttribute("transform", `translate(${node.x} ${node.y})`);
      updateEdges();
    });
    group.addEventListener("pointerup", () => {
      if (!moved) {
        renderNodeDetails(node, edges, nodeMap);
      }
      offset = null;
    });
    group.addEventListener("pointercancel", () => {
      offset = null;
    });

    factGraph.appendChild(group);
  });

  updateEdges();
  renderTrace(traceItems);
}

function renderGraph(fact) {
  graphMode = "selected";
  updateGraphButtons();

  if (!fact) {
    factGraph.innerHTML = "";
    tracePanel.innerHTML = "";
    tracePanel.textContent = "Select a fact to see the reasoning path.";
    return;
  }

  const robot = shortName(fact.robot);
  const ontologyFactName = wrapOntologyName(shortName(fact.type));
  const modelResult = lastResult?.model_outputs?.find((item) =>
    shortName(item.robot).toLowerCase().includes(robot.toLowerCase())
  );

  const nodes = [
    { id: "robot", label: robot, x: 150, y: 210, kind: "robot" },
    { id: "repeatabilityCapability", label: "Operational\nRepeatability\nCapability", x: 390, y: 95, kind: "capability" },
    { id: "precisionCapability", label: "Operational\nPrecision\nCapability", x: 390, y: 325, kind: "capability" },
    { id: "repeatabilityValue", label: formatValue(modelResult?.repeatability ?? 0), x: 730, y: 95, kind: "value" },
    { id: "precisionValue", label: formatValue(modelResult?.precision ?? 0), x: 730, y: 325, kind: "value" },
    { id: "fact", label: ontologyFactName, x: 730, y: 210, kind: "fact", selected: true },
  ];

  const edges = [
    { from: "robot", to: "repeatabilityCapability", label: ["RCO:hasCapability"] },
    { from: "robot", to: "precisionCapability", label: ["RCO:hasCapability"] },
    { from: "repeatabilityCapability", to: "repeatabilityValue", label: ["RCO:has_Measurement_Value"] },
    { from: "precisionCapability", to: "precisionValue", label: ["RCO:has_Measurement_Value"] },
    { from: "robot", to: "fact", label: ["rdf:type"] },
  ];

  renderGraphCanvas(nodes, edges, [
    "Based on Cartesian Coordinates X, Y, Z for a new task.",
    "Predicted or simulated values are stored as RCO:has_Measurement_Value.",
    `The selected fact is ${shortName(fact.robot)} rdf:type ${shortName(fact.type)}.`,
  ]);
}

function renderWholeGraph() {
  graphMode = "whole";
  updateGraphButtons();
  updateGraphFilters();

  if (!lastResult?.model_outputs?.length) {
    factGraph.innerHTML = "";
    tracePanel.textContent = "Run a prediction first to build the current graph.";
    return;
  }

  const nodes = [];
  const edges = [];
  const visibleRobotIndexes = new Set();
  const selectedRobotName = selectedFact ? shortName(selectedFact.robot).toLowerCase() : "";
  const robotX = 130;
  const capabilityX = 390;
  const valueX = 650;
  const factX = 930;

  lastResult.model_outputs.forEach((result, index) => {
    const robot = shortName(result.robot || result.model);
    if (graphFilters.selectedRobotOnly && robot.toLowerCase() !== selectedRobotName) {
      return;
    }
    visibleRobotIndexes.add(index);
    const y = 90 + index * 120;
    const robotId = `robot-${index}`;
    const repeatabilityId = `repeatability-${index}`;
    const precisionId = `precision-${index}`;
    const repeatabilityValueId = `repeatability-value-${index}`;
    const precisionValueId = `precision-value-${index}`;

    if (graphFilters.robot) {
      nodes.push({ id: robotId, label: robot, x: robotX, y, kind: "robot" });
    }
    if (graphFilters.capability) {
      nodes.push(
        { id: repeatabilityId, label: "Operational\nRepeatability\nCapability", x: capabilityX, y: y - 35, kind: "capability" },
        { id: precisionId, label: "Operational\nPrecision\nCapability", x: capabilityX, y: y + 35, kind: "capability" }
      );
    }
    if (graphFilters.value) {
      nodes.push(
        { id: repeatabilityValueId, label: formatValue(result.repeatability), x: valueX, y: y - 35, kind: "value" },
        { id: precisionValueId, label: formatValue(result.precision), x: valueX, y: y + 35, kind: "value" }
      );
    }

    if (graphFilters.robot && graphFilters.capability) {
      edges.push(
        { from: robotId, to: repeatabilityId, label: ["RCO:hasCapability"] },
        { from: robotId, to: precisionId, label: ["RCO:hasCapability"] }
      );
    }
    if (graphFilters.capability && graphFilters.value) {
      edges.push(
        { from: repeatabilityId, to: repeatabilityValueId, label: ["RCO:has_Measurement_Value"] },
        { from: precisionId, to: precisionValueId, label: ["RCO:has_Measurement_Value"] }
      );
    }
  });

  if (graphFilters.fact) {
    lastFacts.forEach((fact, index) => {
      const robot = shortName(fact.robot);
      const robotIndex = lastResult.model_outputs.findIndex((result) =>
        shortName(result.robot || result.model).toLowerCase() === robot.toLowerCase()
      );
      if (robotIndex < 0 || !visibleRobotIndexes.has(robotIndex)) {
        return;
      }
      const factId = `fact-${index}`;
      const robotId = `robot-${robotIndex}`;
      nodes.push({
        id: factId,
        label: wrapOntologyName(shortName(fact.type)),
        x: factX,
        y: 70 + index * 52,
        kind: "fact",
        selected: selectedFact?.type === fact.type && selectedFact?.robot === fact.robot,
      });
      if (graphFilters.robot) {
        edges.push({ from: robotId, to: factId, label: ["rdf:type"] });
      }
    });
  }

  renderGraphCanvas(nodes, edges, [
    "This whole graph shows the current robots, capability measurement values, and reasoned facts.",
    "Drag nodes to inspect the relationships.",
    "Use filters to simplify the graph without changing the Knowledge Graph.",
  ]);
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
    appendRuleLog(`Facts refreshed: ${lastFacts.length} fact(s) loaded for ${target} view.`);
  } catch (error) {
    statusText.textContent = error.message;
    appendRuleLog(`Facts refresh failed: ${error.message}`);
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
    activeOntologyName = defaultOntologyName;
    activeRuleName = defaultRuleName;
    renderAssetStatus();
    statusText.textContent = "";
    appendRuleLog(`Default S-XAI ontology (${defaultOntologyName}) and Datalog rules (${defaultRuleName}) reloaded.`);
  } catch (error) {
    statusText.textContent = error.message;
    appendRuleLog(`Default reload failed: ${error.message}`);
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
    appendRuleLog(`NN model prediction completed for XYZ: ${coordinates.join(", ")}.`);
    simulatedMode = false;
    resultText.textContent = formatResults(lastResult.model_outputs);
    simulationPanel.hidden = true;
    taskPanel.classList.add("dimmed");
    resultDialog.showModal();
  } catch (error) {
    statusText.textContent = error.message;
    appendRuleLog(`Prediction failed: ${error.message}`);
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
    appendRuleLog("Operational capability values updated in the Knowledge Graph.");
    await refreshFacts(simulatedMode ? "after" : "before");
    showPage("explanations");
  } catch (error) {
    statusText.textContent = error.message;
    appendRuleLog(`Knowledge Graph update failed: ${error.message}`);
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
runPageButton.addEventListener("click", () => showPage("run"));
explanationsPageButton.addEventListener("click", () => showPage("explanations"));
ruleLogPageButton.addEventListener("click", () => showPage("ruleLog"));
clearRuleLogButton.addEventListener("click", () => {
  ruleLogEntries = [];
  ruleLog.textContent = "System events will appear here when ontology, Datalog rules, model values, or inferred facts are updated.";
});
executeButton.addEventListener("click", executePrediction);
simulateButton.addEventListener("click", toggleSimulationPanel);
applySimulationButton.addEventListener("click", applySimulationValues);
submitButton.addEventListener("click", submitOntologyUpdate);
refreshFactsButton.addEventListener("click", () => refreshFacts("after"));
exportReportButton.addEventListener("click", exportReport);
selectedGraphButton.addEventListener("click", () => renderGraph(selectedFact));
wholeGraphButton.addEventListener("click", renderWholeGraph);
graphFilterInputs.forEach((input) => {
  input.addEventListener("change", () => {
    updateGraphFilters();
    if (graphMode === "whole") {
      renderWholeGraph();
    }
  });
});
selectedRobotOnlyFilter.addEventListener("change", () => {
  updateGraphFilters();
  if (graphMode === "whole") {
    renderWholeGraph();
  }
});
cancelButton.addEventListener("click", closeDialog);
okButton.addEventListener("click", closeDialog);
uploadOntologyButton.addEventListener("click", () => ontologyFile.click());
uploadRulesButton.addEventListener("click", () => rulesFile.click());
uploadModelsButton.addEventListener("click", () => modelsFile.click());
ontologyFile.addEventListener("change", uploadOntologyFromFile);
rulesFile.addEventListener("change", uploadRulesFromFile);
modelsFile.addEventListener("change", uploadCustomModels);
tabButtons.forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});
explanationTabs.forEach((button) => {
  button.addEventListener("click", () => activateExplanationTab(button.dataset.explanationTab));
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
