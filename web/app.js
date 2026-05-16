const predictUrl = "http://127.0.0.1:5000/predict";
const backendUrl = "http://localhost:11191/api/Query/Insert";
const selectUrl = "http://localhost:11191/api/Query/Select";
const factExplainUrl = "http://localhost:11191/api/Query/FactExplain";
const uploadTtlUrl = "http://localhost:11191/api/Query/UploadTTL";
const uploadRuleUrl = "http://localhost:11191/api/Query/UploadRule";
const modelStatusUrl = "http://127.0.0.1:5000/models/status";
const uploadModelsUrl = "http://127.0.0.1:5000/models/upload";
const limeExplainUrl = "http://127.0.0.1:5000/explain/lime";
const shapExplainUrl = "http://127.0.0.1:5000/explain/shap";
const integratedGradientsUrl = "http://127.0.0.1:5000/explain/integrated-gradients";
const permutationExplainUrl = "http://127.0.0.1:5000/explain/permutation";

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
const refreshLimeButton = document.querySelector("#refreshLimeButton");
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
const limeStatus = document.querySelector("#limeStatus");
const limeResults = document.querySelector("#limeResults");
const selectedFactXai = document.querySelector("#selectedFactXai");
const xaiStabilityPanel = document.querySelector("#xaiStabilityPanel");
const xaiQualityPanel = document.querySelector("#xaiQualityPanel");
const counterfactualSuggestion = document.querySelector("#counterfactualSuggestion");
const refreshShapButton = document.querySelector("#refreshShapButton");
const shapStatus = document.querySelector("#shapStatus");
const shapResults = document.querySelector("#shapResults");
const refreshIgButton = document.querySelector("#refreshIgButton");
const igStatus = document.querySelector("#igStatus");
const igResults = document.querySelector("#igResults");
const refreshPermutationButton = document.querySelector("#refreshPermutationButton");
const permutationStatus = document.querySelector("#permutationStatus");
const permutationResults = document.querySelector("#permutationResults");
const factsQueryText = document.querySelector("#factsQueryText");
const updateQueryText = document.querySelector("#updateQueryText");
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
const exportSvgButton = document.querySelector("#exportSvgButton");
const exportPngButton = document.querySelector("#exportPngButton");
const graphFiltersPanel = document.querySelector("#graphFilters");
const graphFilterInputs = Array.from(document.querySelectorAll("[data-graph-filter]"));
const selectedRobotOnlyFilter = document.querySelector("#selectedRobotOnlyFilter");

let lastResult = null;
let lastCoordinates = [];
let lastLimeResult = null;
let lastShapResult = null;
let lastIgResult = null;
let lastPermutationResult = null;
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

function formatWeight(value) {
  return Number(value).toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
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

function refreshQueryViewer() {
  factsQueryText.textContent = makeFactsQuery();
  updateQueryText.textContent = lastResult?.ontology_update_query ||
    "Run a prediction to generate the update query.";
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

function renderLimeResults(payload) {
  limeResults.innerHTML = "";
  const explanations = payload?.data?.explanations || [];
  if (!explanations.length) {
    limeResults.textContent = "No LIME explanations available yet.";
    renderSelectedFactXai();
    return;
  }

  explanations.forEach((robotExplanation) => {
    const card = document.createElement("article");
    card.className = "lime-card";
    const title = document.createElement("h3");
    title.textContent = robotDisplayName[robotExplanation.model] || robotExplanation.model;
    card.appendChild(title);

    ["repeatability", "precision"].forEach((capability) => {
      const explanation = robotExplanation.lime?.[capability];
      if (!explanation) {
        return;
      }
      const section = document.createElement("section");
      section.className = "lime-capability";
      const heading = document.createElement("h4");
      heading.textContent = `${capability === "repeatability" ? "Repeatability" : "Precision"} prediction ${formatValue(explanation.prediction)}`;
      section.appendChild(heading);

      const weights = explanation.feature_weights || {};
      const maxAbs = Math.max(...Object.values(weights).map((value) => Math.abs(value)), 0.000001);
      ["X", "Y", "Z"].forEach((feature) => {
        const weight = Number(weights[feature] || 0);
        const row = document.createElement("div");
        row.className = "lime-row";
        row.innerHTML = `
          <span>${feature}</span>
          <div class="lime-bar-track">
            <i class="${weight >= 0 ? "positive" : "negative"}" style="width:${Math.min(100, Math.abs(weight) / maxAbs * 100)}%"></i>
          </div>
          <strong>${formatWeight(weight)}</strong>
        `;
        section.appendChild(row);
      });

      const summary = document.createElement("p");
      summary.className = "lime-summary";
      summary.textContent = makeLimeInterpretation(
        robotDisplayName[robotExplanation.model] || robotExplanation.model,
        capability,
        explanation
      );
      section.appendChild(summary);
      card.appendChild(section);
    });

    limeResults.appendChild(card);
  });
  renderSelectedFactXai();
  renderXaiStability();
  renderExplanationQuality();
}

function resetNnXaiPanels() {
  lastLimeResult = null;
  lastShapResult = null;
  lastIgResult = null;
  lastPermutationResult = null;
  limeResults.innerHTML = "";
  shapResults.innerHTML = "";
  igResults.innerHTML = "";
  permutationResults.innerHTML = "";
  limeStatus.textContent = "LIME is ready. Press Run LIME to run this method for the current XYZ task.";
  shapStatus.textContent = "SHAP is ready. Press Run SHAP to run this method for the current XYZ task.";
  igStatus.textContent = "Integrated Gradients is ready. Press Run IG to run this method for the current XYZ task.";
  permutationStatus.textContent = "Permutation Importance is ready. Press Run Permutation to perturb X, Y, and Z.";
  renderSelectedFactXai();
  renderXaiStability();
  renderExplanationQuality();
}

async function runLimeExplanation() {
  if (!lastCoordinates.length) {
    limeStatus.textContent = "Run a prediction first to generate LIME explanations.";
    return;
  }

  try {
    refreshLimeButton.disabled = true;
    refreshLimeButton.textContent = "Running LIME...";
    limeStatus.textContent = "Generating LIME explanations...";
    const payload = await postJson(limeExplainUrl, { data: lastCoordinates });
    lastLimeResult = payload;
    limeStatus.textContent = "Selected method: LIME. LIME explanations generated for the current XYZ task.";
    renderLimeResults(payload);
    appendRuleLog("LIME NN XAI explanations generated.");
  } catch (error) {
    lastLimeResult = null;
    limeStatus.textContent = error.message;
    limeResults.innerHTML = "";
    renderSelectedFactXai();
    renderXaiStability();
    renderExplanationQuality();
    appendRuleLog(`LIME explanation failed: ${error.message}`);
  } finally {
    refreshLimeButton.disabled = false;
    refreshLimeButton.textContent = "Run LIME";
  }
}

function renderShapResults(payload) {
  shapResults.innerHTML = "";
  const explanations = payload?.data?.explanations || [];
  if (!explanations.length) {
    shapResults.textContent = "No SHAP explanations available.";
    return;
  }

  explanations.forEach((robotExplanation) => {
    const card = document.createElement("article");
    card.className = "lime-card";
    const title = document.createElement("h3");
    title.textContent = robotDisplayName[robotExplanation.model] || robotExplanation.model;
    card.appendChild(title);

    ["repeatability", "precision"].forEach((capability) => {
      const shapExplanation = robotExplanation.shap?.[capability];
      const limeExplanation = getLimeForModel({ model: robotExplanation.model, robot: robotExplanation.robot })?.lime?.[capability];
      if (!shapExplanation) {
        return;
      }

      const section = document.createElement("section");
      section.className = "lime-capability";
      const heading = document.createElement("h4");
      heading.textContent = `${capability === "repeatability" ? "Repeatability" : "Precision"} SHAP attribution`;
      section.appendChild(heading);

      const rows = makeInfluenceRows(shapExplanation);
      const maxAbs = Math.max(...rows.map((item) => Math.abs(item.weight)), 0.000001);
      rows.forEach((item) => {
        const row = document.createElement("div");
        row.className = "lime-row";
        row.innerHTML = `
          <span>${item.feature}</span>
          <div class="lime-bar-track">
            <i class="${item.weight >= 0 ? "positive" : "negative"}" style="width:${Math.min(100, Math.abs(item.weight) / maxAbs * 100)}%"></i>
          </div>
          <strong>${formatWeight(item.weight)}</strong>
        `;
        section.appendChild(row);
      });

      const comparison = document.createElement("p");
      comparison.className = "lime-summary";
      comparison.textContent = limeExplanation
        ? `LIME uses a local surrogate around the given XYZ and highlights ${limeExplanation.strongest_feature}. SHAP attributes this NN output and highlights ${shapExplanation.strongest_feature}. Different methods can select different features.`
        : `SHAP attributes this NN output and highlights ${shapExplanation.strongest_feature}.`;
      section.appendChild(comparison);
      card.appendChild(section);
    });

    shapResults.appendChild(card);
  });
}

async function runShapExplanation() {
  if (!lastCoordinates.length) {
    shapStatus.textContent = "Run a prediction first to generate SHAP explanations.";
    return;
  }

  try {
    refreshShapButton.disabled = true;
    refreshShapButton.textContent = "Running SHAP...";
    shapStatus.textContent = "Selected method: SHAP. Generating SHAP explanations...";
    const payload = await postJson(shapExplainUrl, { data: lastCoordinates });
    lastShapResult = payload;
    shapStatus.textContent = "Selected method: SHAP. SHAP explanations generated for the current XYZ task.";
    renderShapResults(payload);
    renderExplanationQuality();
    appendRuleLog("SHAP NN XAI explanations generated.");
  } catch (error) {
    lastShapResult = null;
    shapStatus.textContent = error.message;
    shapResults.innerHTML = "";
    renderExplanationQuality();
    appendRuleLog(`SHAP explanation unavailable: ${error.message}`);
  } finally {
    refreshShapButton.disabled = false;
    refreshShapButton.textContent = "Run SHAP";
  }
}

function renderAttributionResults(payload, resultKey, container, methodLabel, compareWithLime = true) {
  container.innerHTML = "";
  const explanations = payload?.data?.explanations || [];
  if (!explanations.length) {
    container.textContent = `No ${methodLabel} explanations available.`;
    return;
  }

  explanations.forEach((robotExplanation) => {
    const card = document.createElement("article");
    card.className = "lime-card";
    const title = document.createElement("h3");
    title.textContent = robotDisplayName[robotExplanation.model] || robotExplanation.model;
    card.appendChild(title);

    ["repeatability", "precision"].forEach((capability) => {
      const methodExplanation = robotExplanation[resultKey]?.[capability];
      const limeExplanation = getLimeForModel({ model: robotExplanation.model, robot: robotExplanation.robot })?.lime?.[capability];
      if (!methodExplanation) {
        return;
      }

      const section = document.createElement("section");
      section.className = "lime-capability";
      const heading = document.createElement("h4");
      heading.textContent = `${capability === "repeatability" ? "Repeatability" : "Precision"} ${methodLabel} attribution`;
      section.appendChild(heading);

      const rows = makeInfluenceRows(methodExplanation);
      const maxAbs = Math.max(...rows.map((item) => Math.abs(item.weight)), 0.000001);
      rows.forEach((item) => {
        const row = document.createElement("div");
        row.className = "lime-row";
        row.innerHTML = `
          <span>${item.feature}</span>
          <div class="lime-bar-track">
            <i class="${item.weight >= 0 ? "positive" : "negative"}" style="width:${Math.min(100, Math.abs(item.weight) / maxAbs * 100)}%"></i>
          </div>
          <strong>${formatWeight(item.weight)}</strong>
        `;
        section.appendChild(row);
      });

      const comparison = document.createElement("p");
      comparison.className = "lime-summary";
      comparison.textContent = compareWithLime && limeExplanation
        ? `LIME uses a local surrogate around the given XYZ and highlights ${limeExplanation.strongest_feature}. ${methodLabel} explains the NN with its own attribution logic and highlights ${methodExplanation.strongest_feature}.`
        : `${methodLabel} strongest feature: ${methodExplanation.strongest_feature}.`;
      section.appendChild(comparison);
      card.appendChild(section);
    });

    container.appendChild(card);
  });
}

async function runIntegratedGradientsExplanation() {
  if (!lastCoordinates.length) {
    igStatus.textContent = "Run a prediction first to generate Integrated Gradients explanations.";
    return;
  }

  try {
    refreshIgButton.disabled = true;
    refreshIgButton.textContent = "Running IG...";
    igStatus.textContent = "Selected method: Integrated Gradients. Generating explanations...";
    const payload = await postJson(integratedGradientsUrl, { data: lastCoordinates });
    lastIgResult = payload;
    igStatus.textContent = "Selected method: Integrated Gradients. Explanations generated for the current XYZ task.";
    renderAttributionResults(payload, "integrated_gradients", igResults, "Integrated Gradients");
    renderExplanationQuality();
    appendRuleLog("Integrated Gradients NN XAI explanations generated.");
  } catch (error) {
    lastIgResult = null;
    igStatus.textContent = error.message;
    igResults.innerHTML = "";
    renderExplanationQuality();
    appendRuleLog(`Integrated Gradients explanation failed: ${error.message}`);
  } finally {
    refreshIgButton.disabled = false;
    refreshIgButton.textContent = "Run IG";
  }
}

async function runPermutationExplanation() {
  if (!lastCoordinates.length) {
    permutationStatus.textContent = "Run a prediction first to generate Permutation Importance explanations.";
    return;
  }

  try {
    refreshPermutationButton.disabled = true;
    refreshPermutationButton.textContent = "Running...";
    permutationStatus.textContent = "Selected method: Permutation Importance. Perturbing X, Y, and Z...";
    const payload = await postJson(permutationExplainUrl, { data: lastCoordinates });
    lastPermutationResult = payload;
    permutationStatus.textContent = "Selected method: Permutation Importance. Explanations generated for the current XYZ task.";
    renderAttributionResults(payload, "permutation_importance", permutationResults, "Permutation Importance");
    renderExplanationQuality();
    appendRuleLog("Permutation Importance NN XAI explanations generated.");
  } catch (error) {
    lastPermutationResult = null;
    permutationStatus.textContent = error.message;
    permutationResults.innerHTML = "";
    renderExplanationQuality();
    appendRuleLog(`Permutation Importance explanation failed: ${error.message}`);
  } finally {
    refreshPermutationButton.disabled = false;
    refreshPermutationButton.textContent = "Run Permutation";
  }
}

function findModelResultForFact(fact) {
  if (!fact || !lastResult?.model_outputs?.length) {
    return null;
  }

  const robot = shortName(fact.robot).toLowerCase();
  return lastResult.model_outputs.find((item) =>
    shortName(item.robot || item.model).toLowerCase() === robot
  ) || null;
}

function getFactCapabilityKeys(fact) {
  const factName = shortName(fact?.type).toLowerCase();
  if (factName.includes("repeatability")) {
    return ["repeatability"];
  }
  if (factName.includes("precision")) {
    return ["precision"];
  }
  return ["repeatability", "precision"];
}

function getLimeForModel(modelResult) {
  if (!modelResult || !lastLimeResult?.data?.explanations?.length) {
    return null;
  }

  const modelName = modelResult.model;
  const robotName = shortName(modelResult.robot || modelResult.model).toLowerCase();
  return lastLimeResult.data.explanations.find((item) =>
    item.model === modelName || shortName(item.robot || item.model).toLowerCase() === robotName
  ) || null;
}

function makeInfluenceRows(explanation) {
  const weights = explanation?.feature_weights || {};
  return ["X", "Y", "Z"]
    .map((feature) => ({
      feature,
      weight: Number(weights[feature] || 0),
    }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

function capabilityName(capability) {
  return capability === "repeatability" ? "repeatability" : "precision";
}

function explainInfluenceDirection(weight, capability) {
  const capabilityLabel = capabilityName(capability);
  if (Math.abs(Number(weight || 0)) < 0.000001) {
    return `has almost no local effect on the predicted ${capabilityLabel} value.`;
  }

  return Number(weight) > 0
    ? `locally increases the predicted ${capabilityLabel} value when it increases near this task point.`
    : `locally decreases the predicted ${capabilityLabel} value when it increases near this task point.`;
}

function makeLimeInterpretation(robot, capability, explanation) {
  const strongest = explanation?.strongest_feature || "X";
  const strongestWeight = Number(explanation?.feature_weights?.[strongest] || 0);
  return `Near this Cartesian task point, ${robot} ${capabilityName(capability)} is most sensitive to ${strongest}. ${strongest} ${explainInfluenceDirection(strongestWeight, capability)}`;
}

function getInfluenceStability(explanation) {
  const rows = makeInfluenceRows(explanation);
  const strongest = rows[0] || { feature: "X", weight: 0 };
  const second = rows[1] || { feature: "Y", weight: 0 };
  const strongestAbs = Math.abs(strongest.weight);
  const secondAbs = Math.abs(second.weight);
  const ratio = strongestAbs / Math.max(secondAbs, 0.000001);
  const label = strongestAbs < 0.000001
    ? "Low"
    : ratio >= 1.6
      ? "High"
      : ratio >= 1.15
        ? "Medium"
        : "Low";

  return {
    label,
    strongest: strongest.feature,
    ratio,
  };
}

function renderXaiStability() {
  if (!xaiStabilityPanel) {
    return;
  }

  xaiStabilityPanel.innerHTML = "<h3>XAI Confidence / Stability</h3>";
  const explanations = lastLimeResult?.data?.explanations || [];
  if (!explanations.length) {
    const message = document.createElement("p");
    message.textContent = "Run LIME to estimate whether the strongest local feature is stable for this XYZ task.";
    xaiStabilityPanel.appendChild(message);
    return;
  }

  const list = document.createElement("ul");
  explanations.forEach((robotExplanation) => {
    ["repeatability", "precision"].forEach((capability) => {
      const explanation = robotExplanation.lime?.[capability];
      if (!explanation) {
        return;
      }
      const stability = getInfluenceStability(explanation);
      const item = document.createElement("li");
      item.textContent = `${robotDisplayName[robotExplanation.model] || robotExplanation.model} ${capabilityName(capability)}: ${stability.label} stability, strongest feature ${stability.strongest}.`;
      list.appendChild(item);
    });
  });
  xaiStabilityPanel.appendChild(list);
}

function renderExplanationQuality() {
  if (!xaiQualityPanel) {
    return;
  }

  const rows = [
    ["Ontology fact", lastFacts.length ? "available" : "refresh facts"],
    ["Datalog rule result", selectedFact ? "selected fact available" : "select a fact"],
    ["NN prediction", lastResult ? "available" : "run prediction"],
    ["LIME local explanation", lastLimeResult ? "available" : "run LIME"],
    ["SHAP attribution", lastShapResult ? "available" : "optional or unavailable"],
    ["Integrated Gradients attribution", lastIgResult ? "available" : "run IG"],
    ["Permutation Importance", lastPermutationResult ? "available" : "run permutation"],
    ["OpenAI NL explanation", nlExplanation.textContent && !nlExplanation.textContent.includes("Add your OpenAI API key") ? "available" : "add API key / explain fact"],
  ];

  xaiQualityPanel.innerHTML = "<h3>Explanation Quality</h3>";
  const list = document.createElement("dl");
  rows.forEach(([name, status]) => {
    const dt = document.createElement("dt");
    dt.textContent = name;
    const dd = document.createElement("dd");
    dd.textContent = status;
    list.append(dt, dd);
  });
  xaiQualityPanel.appendChild(list);
}

function renderCounterfactualSuggestion() {
  if (!counterfactualSuggestion) {
    return;
  }

  counterfactualSuggestion.innerHTML = "<h3>What Must Change?</h3>";
  if (!selectedFact || !lastResult?.model_outputs?.length) {
    const message = document.createElement("p");
    message.textContent = "Select a reasoned fact to see which capability value would need to change for a different suitability result.";
    counterfactualSuggestion.appendChild(message);
    return;
  }

  const factName = shortName(selectedFact.type).toLowerCase();
  const modelResult = findModelResultForFact(selectedFact);
  if (!modelResult) {
    const message = document.createElement("p");
    message.textContent = "No model result is available for the selected fact.";
    counterfactualSuggestion.appendChild(message);
    return;
  }

  const capability = factName.includes("precision") ? "precision" : "repeatability";
  const lowerIsBetter = capability === "repeatability";
  const sorted = [...lastResult.model_outputs].sort((a, b) =>
    lowerIsBetter ? a[capability] - b[capability] : b[capability] - a[capability]
  );
  const selectedIndex = sorted.findIndex((item) => item.model === modelResult.model);
  const competitor = sorted[selectedIndex === 0 ? 1 : 0];
  const selectedValue = Number(modelResult[capability]);
  const competitorValue = Number(competitor?.[capability]);
  const epsilon = 0.000001;
  const target = lowerIsBetter
    ? competitorValue + (selectedIndex === 0 ? epsilon : -epsilon)
    : competitorValue - (selectedIndex === 0 ? epsilon : -epsilon);
  const direction = target > selectedValue ? "increase" : "decrease";
  const delta = Math.abs(target - selectedValue);

  const message = document.createElement("p");
  message.textContent = `${robotDisplayName[modelResult.model] || modelResult.model} would need to ${direction} its ${capabilityName(capability)} value by about ${formatWeight(delta)} mm to cross the nearest decision boundary against ${robotDisplayName[competitor?.model] || competitor?.model}.`;
  counterfactualSuggestion.appendChild(message);
}

function renderSelectedFactXai(fact = selectedFact) {
  if (!selectedFactXai) {
    return;
  }

  selectedFactXai.innerHTML = "";
  const heading = document.createElement("h3");
  heading.textContent = "Selected Fact NN Contribution";
  selectedFactXai.appendChild(heading);

  if (!fact) {
    const message = document.createElement("p");
    message.textContent = "Select a reasoned fact to see which neural-network prediction and XYZ feature influences contributed to it.";
    selectedFactXai.appendChild(message);
    renderCounterfactualSuggestion();
    renderExplanationQuality();
    return;
  }

  const modelResult = findModelResultForFact(fact);
  const limeResult = getLimeForModel(modelResult);
  const robot = shortName(fact.robot);
  const factName = shortName(fact.type);

  const summary = document.createElement("p");
  summary.textContent = `Selected fact: ${robot} rdf:type ${factName}.`;
  selectedFactXai.appendChild(summary);

  if (!modelResult) {
    const message = document.createElement("p");
    message.textContent = "No model prediction is available for this robot yet.";
    selectedFactXai.appendChild(message);
    renderCounterfactualSuggestion();
    renderExplanationQuality();
    return;
  }

  if (!limeResult) {
    const message = document.createElement("p");
    message.textContent = "Run or refresh LIME to see the XYZ feature influences for this selected fact.";
    selectedFactXai.appendChild(message);
    renderCounterfactualSuggestion();
    renderExplanationQuality();
    return;
  }

  const list = document.createElement("div");
  list.className = "selected-xai-grid";
  getFactCapabilityKeys(fact).forEach((capability) => {
    const explanation = limeResult.lime?.[capability];
    if (!explanation) {
      return;
    }

    const card = document.createElement("article");
    card.className = "selected-xai-card";
    const title = document.createElement("h4");
    title.textContent = `${capability === "repeatability" ? "Repeatability" : "Precision"} value ${formatValue(modelResult[capability])}`;
    card.appendChild(title);

    const source = document.createElement("p");
    source.textContent = `Source: ${modelResult.source || "NN Model prediction"}. Strongest local influence: ${explanation.strongest_feature}.`;
    card.appendChild(source);

    const interpretation = document.createElement("p");
    interpretation.className = "selected-xai-interpretation";
    interpretation.textContent = makeLimeInterpretation(robot, capability, explanation);
    card.appendChild(interpretation);

    const rows = document.createElement("ol");
    makeInfluenceRows(explanation).forEach((item) => {
      const row = document.createElement("li");
      row.textContent = `${item.feature}: ${formatWeight(item.weight)}`;
      rows.appendChild(row);
    });
    card.appendChild(rows);
    list.appendChild(card);
  });

  selectedFactXai.appendChild(list);
  renderCounterfactualSuggestion();
  renderExplanationQuality();
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
  if (tabId === "sparqlTab") {
    refreshQueryViewer();
  }
  if (tabId === "nnXaiTab") {
    renderXaiStability();
    renderExplanationQuality();
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
        renderSelectedFactXai(fact);
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
  const heading = document.createElement("h3");
  heading.textContent = "Reasoning Trace";
  tracePanel.appendChild(heading);
  const list = document.createElement("ol");
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
  tracePanel.appendChild(list);
}

function buildSelectedFactTrace(fact, modelResult) {
  const xyz = lastCoordinates.length ? lastCoordinates.join(", ") : "not available";
  const source = modelResult?.source || (simulatedMode ? "User simulated value" : "NN Model prediction");
  const repeatability = formatValue(modelResult?.repeatability ?? 0);
  const precision = formatValue(modelResult?.precision ?? 0);
  const baselineRepeatability = modelResult?.modelBaseline ? formatValue(modelResult.modelBaseline.repeatability) : null;
  const baselinePrecision = modelResult?.modelBaseline ? formatValue(modelResult.modelBaseline.precision) : null;
  const factName = shortName(fact.type);
  const robotName = shortName(fact.robot);
  const capabilityFocus = factName.toLowerCase().includes("precision")
    ? `precision value ${precision}`
    : factName.toLowerCase().includes("repeatability")
      ? `repeatability value ${repeatability}`
      : `repeatability ${repeatability} and precision ${precision}`;

  return [
    `1. User task: Cartesian Coordinates X, Y, Z = ${xyz}.`,
    `2. Robot considered: ${robotName}.`,
    `3. NN or simulated measurement: repeatability ${repeatability} mm and precision ${precision} mm. Source: ${source}.`,
    ...(modelResult?.modelBaseline
      ? [`4. Counterfactual baseline: original NN values before simulation were repeatability ${baselineRepeatability} mm and precision ${baselinePrecision} mm.`]
      : []),
    "5. KG update: the measurements are written using RCO:has_Measurement_Value.",
    `6. Datalog reasoning: rules compare robot capability measurements; this fact is supported by the ${capabilityFocus}.`,
    `7. Reasoned fact: ${robotName} rdf:type ${factName}.`,
    "8. Explanation layer: graph, facts, LIME/SHAP, counterfactuals, and NL explanation describe the same reasoning path.",
  ];
}

function humanizeKind(kind = "default") {
  return {
    robot: "Robot",
    capability: "Capability",
    value: "Measurement value",
    simulated: "User simulated measurement value",
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
  if (node.kind === "value" || node.kind === "simulated") {
    rows.push(["Measurement value", cleanLabel]);
    rows.push(["Source", node.source || "NN Model prediction"]);
    if (node.baselineValue) {
      rows.push(["Original NN value", node.baselineValue]);
    }
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

function renderGraphCanvas(nodes, edges, traceItems, options = {}) {
  const graphWidth = options.width || 1100;
  const graphHeight = options.height || 420;
  factGraph.setAttribute("viewBox", `0 0 ${graphWidth} ${graphHeight}`);
  factGraph.style.minHeight = `${graphHeight}px`;
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
      node.x = Math.max(50, Math.min(graphWidth - 50, point.x - offset.x));
      node.y = Math.max(55, Math.min(graphHeight - 55, point.y - offset.y));
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
    {
      id: "repeatabilityValue",
      label: formatValue(modelResult?.repeatability ?? 0),
      x: 730,
      y: 95,
      kind: modelResult?.source === "User simulated value" ? "simulated" : "value",
      source: modelResult?.source || "NN Model prediction",
      baselineValue: modelResult?.modelBaseline ? formatValue(modelResult.modelBaseline.repeatability) : "",
    },
    {
      id: "precisionValue",
      label: formatValue(modelResult?.precision ?? 0),
      x: 730,
      y: 325,
      kind: modelResult?.source === "User simulated value" ? "simulated" : "value",
      source: modelResult?.source || "NN Model prediction",
      baselineValue: modelResult?.modelBaseline ? formatValue(modelResult.modelBaseline.precision) : "",
    },
    { id: "fact", label: ontologyFactName, x: 730, y: 210, kind: "fact", selected: true },
  ];

  const edges = [
    { from: "robot", to: "repeatabilityCapability", label: ["RCO:hasCapability"] },
    { from: "robot", to: "precisionCapability", label: ["RCO:hasCapability"] },
    { from: "repeatabilityCapability", to: "repeatabilityValue", label: ["RCO:has_Measurement_Value"] },
    { from: "precisionCapability", to: "precisionValue", label: ["RCO:has_Measurement_Value"] },
    { from: "robot", to: "fact", label: ["rdf:type"] },
  ];

  renderGraphCanvas(nodes, edges, buildSelectedFactTrace(fact, modelResult));
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
  const factsByRobot = new Map();
  lastFacts.forEach((fact) => {
    const robot = shortName(fact.robot).toLowerCase();
    if (!factsByRobot.has(robot)) {
      factsByRobot.set(robot, []);
    }
    factsByRobot.get(robot).push(fact);
  });
  const visibleRobotIndexes = new Set();
  const robotYByIndex = new Map();
  const selectedRobotName = selectedFact ? shortName(selectedFact.robot).toLowerCase() : "";
  const robotX = 130;
  const capabilityX = 390;
  const valueX = 650;
  const factX = 930;
  const rowGap = graphFilters.fact ? 170 : 135;
  let visibleRow = 0;
  let maxY = 420;

  lastResult.model_outputs.forEach((result, index) => {
    const robot = shortName(result.robot || result.model);
    if (graphFilters.selectedRobotOnly && robot.toLowerCase() !== selectedRobotName) {
      return;
    }
    visibleRobotIndexes.add(index);
    const y = 95 + visibleRow * rowGap;
    visibleRow += 1;
    robotYByIndex.set(index, y);
    const robotId = `robot-${index}`;
    const repeatabilityId = `repeatability-${index}`;
    const precisionId = `precision-${index}`;
    const repeatabilityValueId = `repeatability-value-${index}`;
    const precisionValueId = `precision-value-${index}`;
    const isSelectedRobot = selectedFact &&
      robot.toLowerCase() === selectedRobotName;

    if (graphFilters.robot) {
      nodes.push({ id: robotId, label: robot, x: robotX, y, kind: "robot", selected: isSelectedRobot });
    }
    if (graphFilters.capability) {
      nodes.push(
        { id: repeatabilityId, label: "Operational\nRepeatability\nCapability", x: capabilityX, y: y - 35, kind: "capability", selected: isSelectedRobot },
        { id: precisionId, label: "Operational\nPrecision\nCapability", x: capabilityX, y: y + 35, kind: "capability", selected: isSelectedRobot }
      );
    }
    if (graphFilters.value) {
      const valueKind = result.source === "User simulated value" ? "simulated" : "value";
      nodes.push(
        {
          id: repeatabilityValueId,
          label: formatValue(result.repeatability),
          x: valueX,
          y: y - 35,
          kind: valueKind,
          source: result.source || "NN Model prediction",
          baselineValue: result.modelBaseline ? formatValue(result.modelBaseline.repeatability) : "",
          selected: isSelectedRobot,
        },
        {
          id: precisionValueId,
          label: formatValue(result.precision),
          x: valueX,
          y: y + 35,
          kind: valueKind,
          source: result.source || "NN Model prediction",
          baselineValue: result.modelBaseline ? formatValue(result.modelBaseline.precision) : "",
          selected: isSelectedRobot,
        }
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
    let factIndex = 0;
    lastFacts.forEach((fact) => {
      const robot = shortName(fact.robot);
      const robotIndex = lastResult.model_outputs.findIndex((result) =>
        shortName(result.robot || result.model).toLowerCase() === robot.toLowerCase()
      );
      if (robotIndex < 0 || !visibleRobotIndexes.has(robotIndex)) {
        return;
      }
      const robotFacts = factsByRobot.get(robot.toLowerCase()) || [];
      const robotFactPosition = robotFacts.findIndex(
        (item) => item.type === fact.type && item.robot === fact.robot
      );
      const baseY = robotYByIndex.get(robotIndex) || 95;
      const factY = baseY + (robotFactPosition - (robotFacts.length - 1) / 2) * 48;
      maxY = Math.max(maxY, factY + 80);
      const factId = `fact-${factIndex}`;
      factIndex += 1;
      const robotId = `robot-${robotIndex}`;
      nodes.push({
        id: factId,
        label: wrapOntologyName(shortName(fact.type)),
        x: factX,
        y: factY,
        kind: "fact",
        selected: selectedFact?.type === fact.type && selectedFact?.robot === fact.robot,
      });
      if (graphFilters.robot) {
        edges.push({ from: robotId, to: factId, label: ["rdf:type"] });
      }
    });
  }

  maxY = Math.max(maxY, 95 + Math.max(visibleRow - 1, 0) * rowGap + 100);
  const graphHeight = Math.max(420, maxY);

  renderGraphCanvas(nodes, edges, [
    "This whole graph shows the current robots, capability measurement values, and reasoned facts.",
    "Drag nodes to inspect the relationships.",
    "The whole graph layout groups reasoned facts beside their robot.",
  ], { height: graphHeight });
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
    renderCounterfactualSuggestion();
    renderExplanationQuality();
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
    renderSelectedFactXai(fact);
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
    renderExplanationQuality();
  } catch (error) {
    nlExplanation.textContent = error.message;
    renderExplanationQuality();
  }
}

function limeCapabilityToText(robotExplanation, capability, robot) {
  const explanation = robotExplanation?.lime?.[capability];
  if (!explanation) {
    return "";
  }

  const title = capability === "repeatability" ? "Repeatability" : "Precision";
  const influences = makeInfluenceRows(explanation)
    .map((item) => `    ${item.feature}: ${formatWeight(item.weight)}`)
    .join("\n");

  return [
    `  ${title} prediction: ${formatValue(explanation.prediction)}`,
    `  Strongest local influence: ${explanation.strongest_feature}`,
    `  Interpretation: ${makeLimeInterpretation(robot, capability, explanation)}`,
    "  XYZ feature weights:",
    influences,
  ].join("\n");
}

function limeReportText() {
  const explanations = lastLimeResult?.data?.explanations || [];
  if (!explanations.length) {
    return "No LIME explanations generated.";
  }

  return explanations
    .map((robotExplanation) => {
      const robot = robotDisplayName[robotExplanation.model] || robotExplanation.model;
      return [
        `${robot}:`,
        limeCapabilityToText(robotExplanation, "repeatability", robot),
        limeCapabilityToText(robotExplanation, "precision", robot),
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

function selectedFactXaiReportText() {
  if (!selectedFact) {
    return "No selected fact.";
  }

  const modelResult = findModelResultForFact(selectedFact);
  const limeResult = getLimeForModel(modelResult);
  const lines = [
    `Selected fact: ${shortName(selectedFact.robot)} rdf:type ${shortName(selectedFact.type)}.`,
  ];

  if (!modelResult) {
    lines.push("No model prediction is available for this robot.");
    return lines.join("\n");
  }

  if (!limeResult) {
    lines.push("No LIME explanation is available for this selected fact.");
    return lines.join("\n");
  }

  getFactCapabilityKeys(selectedFact).forEach((capability) => {
    const explanation = limeResult.lime?.[capability];
    if (!explanation) {
      return;
    }
    const title = capability === "repeatability" ? "Repeatability" : "Precision";
    lines.push(`${title} value: ${formatValue(modelResult[capability])}`);
    lines.push(`Source: ${modelResult.source || "NN Model prediction"}.`);
    lines.push(`Strongest local influence: ${explanation.strongest_feature}.`);
    lines.push(`Interpretation: ${makeLimeInterpretation(shortName(selectedFact.robot), capability, explanation)}`);
    makeInfluenceRows(explanation).forEach((item) => {
      lines.push(`  ${item.feature}: ${formatWeight(item.weight)}`);
    });
  });

  return lines.join("\n");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shapReportText() {
  const explanations = lastShapResult?.data?.explanations || [];
  if (!explanations.length) {
    return "No SHAP explanations generated or SHAP is unavailable.";
  }

  return explanations
    .map((robotExplanation) => {
      const robot = robotDisplayName[robotExplanation.model] || robotExplanation.model;
      const rows = ["repeatability", "precision"].map((capability) => {
        const explanation = robotExplanation.shap?.[capability];
        if (!explanation) {
          return "";
        }
        return [
          `  ${capability === "repeatability" ? "Repeatability" : "Precision"} strongest feature: ${explanation.strongest_feature}`,
          ...makeInfluenceRows(explanation).map((item) => `    ${item.feature}: ${formatWeight(item.weight)}`),
        ].join("\n");
      }).filter(Boolean);
      return [`${robot}:`, ...rows].join("\n");
    })
    .join("\n\n");
}

function buildReportHtml() {
  const graphSvg = selectedFact ? getGraphSvgText() : "";
  const sections = [
    ["Current task", xyzInput.value || "No task entered."],
    ["Capability values", lastResult ? formatResults(lastResult.model_outputs) : "No model results."],
    ["Before simulation facts", factsToText(baselineFacts)],
    ["After simulation facts", factsToText(simulatedFacts)],
    ["NN XAI LIME feature influence", limeReportText()],
    ["Optional SHAP attribution", shapReportText()],
    ["Selected fact NN contribution", selectedFactXaiReportText()],
    ["Selected natural language explanation", nlExplanation.textContent],
    ["SPARQL reasoned facts query", makeFactsQuery()],
    ["Knowledge Graph update query", lastResult?.ontology_update_query || "No update query generated."],
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>S-XAI Robot Operational Capability Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #1f2633; }
    h1 { margin-top: 0; }
    section { margin: 22px 0; padding: 16px; border: 1px solid #ccd4df; border-radius: 8px; }
    pre { white-space: pre-wrap; background: #f5f7fb; padding: 12px; border-radius: 6px; overflow: auto; }
    svg { max-width: 100%; height: auto; background: #202638; border-radius: 6px; }
  </style>
</head>
<body>
  <h1>S-XAI Robot Operational Capability Report</h1>
  <p>Generated from the current S-XAI task, Knowledge Graph facts, Datalog reasoning, and NN XAI explanations.</p>
  ${graphSvg ? `<section><h2>Graph Snapshot</h2>${graphSvg}</section>` : ""}
  ${sections.map(([title, content]) => `<section><h2>${escapeHtml(title)}</h2><pre>${escapeHtml(content)}</pre></section>`).join("\n")}
</body>
</html>`;
}

function exportReport() {
  const blob = new Blob([buildReportHtml()], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "s-xai-robot-operational-capability-report.html";
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function getGraphSvgText() {
  const clone = factGraph.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const styles = Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules || []);
      } catch {
        return [];
      }
    })
    .map((rule) => rule.cssText)
    .filter((rule) => rule.includes("graph-") || rule.includes("factGraph"))
    .join("\n");
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = styles;
  clone.insertBefore(style, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}

function exportGraphSvg() {
  const svgText = getGraphSvgText();
  downloadBlob(new Blob([svgText], { type: "image/svg+xml" }), `s-xai-${graphMode}-graph.svg`);
}

function exportGraphPng() {
  const svgText = getGraphSvgText();
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml" }));
  const viewBox = factGraph.viewBox.baseVal;
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewBox.width * 2));
    canvas.height = Math.max(1, Math.ceil(viewBox.height * 2));
    const context = canvas.getContext("2d");
    context.fillStyle = "#202739";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `s-xai-${graphMode}-graph.png`);
      }
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    statusText.textContent = "Graph PNG export failed.";
  };
  image.src = url;
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
  if (!result.modelBaseline) {
    result.modelBaseline = {
      repeatability: result.repeatability,
      precision: result.precision,
    };
  }
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
  refreshQueryViewer();
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
  renderCounterfactualSuggestion();
  renderExplanationQuality();
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
    lastCoordinates = coordinates;
    selectedFact = null;
    resetNnXaiPanels();
    lastResult.model_outputs.forEach((result) => {
      result.source = "NN Model prediction";
    });
    refreshQueryViewer();
    renderExplanationQuality();
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
refreshLimeButton.addEventListener("click", runLimeExplanation);
refreshShapButton.addEventListener("click", runShapExplanation);
refreshIgButton.addEventListener("click", runIntegratedGradientsExplanation);
refreshPermutationButton.addEventListener("click", runPermutationExplanation);
selectedGraphButton.addEventListener("click", () => renderGraph(selectedFact));
wholeGraphButton.addEventListener("click", renderWholeGraph);
exportSvgButton.addEventListener("click", exportGraphSvg);
exportPngButton.addEventListener("click", exportGraphPng);
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
renderXaiStability();
renderCounterfactualSuggestion();
renderExplanationQuality();
refreshModelStatus();
uploadKnowledgeBase();
