(function () {
  const STORAGE_KEY = "oi-calculator:v6";
  const LEGACY_STORAGE_KEYS = ["oi-calculator:v5"];
  const SCENARIOS_STORAGE_KEY = "oi-calculator:saved-scenarios:v1";
  const config = window.OI_CALCULATOR_CONFIG;

  const elements = {
    logicNotes: document.getElementById("logic-notes"),
    resultTableHead: document.getElementById("result-table-head"),
    resultTableBody: document.getElementById("result-table-body"),
    readyMadeSpecOptions: document.getElementById("ready-made-spec-options"),
    cogsSearchInput: document.getElementById("cogs-search-input"),
    cogsSearchResults: document.getElementById("cogs-search-results"),
    cogsSearchSelection: document.getElementById("cogs-search-selection"),
    warehouseSearchInput: document.getElementById("warehouse-search-input"),
    warehouseSearchResults: document.getElementById("warehouse-search-results"),
    warehouseSearchSelection: document.getElementById("warehouse-search-selection"),
    pricePlanSearchInput: document.getElementById("price-plan-search-input"),
    pricePlanSearchResults: document.getElementById("price-plan-search-results"),
    pricePlanSelection: document.getElementById("price-plan-selection"),
    oiRateSummary: document.getElementById("oi-rate-summary"),
    saveScenarioButton: document.getElementById("save-scenario-button"),
    viewHistoryButton: document.getElementById("view-history-button"),
    saveStatus: document.getElementById("save-status"),
    savedScenarioCount: document.getElementById("saved-scenario-count"),
    savedScenariosList: document.getElementById("saved-scenarios-list"),
    historyDrawer: document.getElementById("history-drawer"),
    historyDrawerBackdrop: document.getElementById("history-drawer-backdrop"),
    closeHistoryButton: document.getElementById("close-history-button"),
    scenarioPreviewModal: document.getElementById("scenario-preview-modal"),
    scenarioPreviewBackdrop: document.getElementById("scenario-preview-backdrop"),
    scenarioPreviewTitle: document.getElementById("scenario-preview-title"),
    scenarioPreviewMeta: document.getElementById("scenario-preview-meta"),
    scenarioPreviewContent: document.getElementById("scenario-preview-content"),
    closeScenarioPreviewButton: document.getElementById("close-scenario-preview-button"),
    utilityPanelBackdrop: document.getElementById("utility-panel-backdrop"),
    cogsPanel: document.getElementById("cogs-panel"),
    warehousePanel: document.getElementById("warehouse-panel"),
    pricePlanPanel: document.getElementById("price-plan-panel"),
    logicPanel: document.getElementById("logic-panel"),
    openCogsPanelButton: document.getElementById("open-cogs-panel-button"),
    openWarehousePanelButton: document.getElementById("open-warehouse-panel-button"),
    openPricePlanPanelButton: document.getElementById("open-price-plan-panel-button"),
    openLogicPanelButton: document.getElementById("open-logic-panel-button"),
    tableWrap: document.getElementById("table-wrap"),
    addComparisonButton: document.getElementById("add-comparison-button"),
    resetButton: document.getElementById("reset-button"),
    copyButton: document.getElementById("copy-button"),
  };

  const state = loadState();
  let savedScenarios = loadSavedScenarios();
  let saveStatus = {
    tone: "info",
    text: "保存后可在历史方案中随时读取或加入当前对比。",
  };
  let isHistoryDrawerOpen = false;
  let previewScenarioId = null;
  let activeUtilityPanel = null;
  let lastRenderedColumnCount = null;
  let activeReadyMadeSuggestionColumnId = null;

  function loadState() {
    const fallback = {
      columns: [createComparisonColumn(1)],
      activeScenarioId: null,
    };

    const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];

    for (const key of keys) {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) {
          continue;
        }

        const parsed = JSON.parse(raw);
        return {
          columns: hydrateColumns(parsed.columns),
          activeScenarioId:
            typeof parsed.activeScenarioId === "string" ? parsed.activeScenarioId : null,
        };
      } catch (error) {
        // Continue to the next storage key.
      }
    }

    return fallback;
  }

  function createColumnId() {
    return `comparison-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function createScenarioId() {
    return `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function hydrateColumns(columns) {
    const parsedColumns = Array.isArray(columns) ? columns : [];
    if (parsedColumns.length === 0) {
      return [createComparisonColumn(1)];
    }

    return parsedColumns.map((column, index) => ({
      id: createColumnId(),
      title: column.title || `对比${index + 1}`,
      mode: column.mode || config.defaults.mode || "special",
      inputs: {
        ...config.defaults.inputs,
        ...(column.inputs || {}),
      },
    }));
  }

  function cloneColumnsForStorage(columns) {
    return columns.map((column, index) => ({
      id: column.id || createColumnId(),
      title: column.title || `对比${index + 1}`,
      mode: column.mode || config.defaults.mode || "special",
      inputs: {
        ...config.defaults.inputs,
        ...(column.inputs || {}),
      },
    }));
  }

  function createComparisonColumn(index) {
    return {
      id: createColumnId(),
      title: `对比${index}`,
      mode: config.defaults.mode || "special",
      inputs: { ...config.defaults.inputs },
    };
  }

  function cloneComparisonColumn(sourceColumn, index) {
    return {
      id: createColumnId(),
      title: `对比${index}`,
      mode: sourceColumn?.mode || config.defaults.mode || "special",
      inputs: {
        ...config.defaults.inputs,
        ...(sourceColumn?.inputs || {}),
      },
    };
  }

  function cloneScenarioColumnsForComparison(columns, scenarioName) {
    const hydratedColumns = hydrateColumns(columns);
    return hydratedColumns.map((column, index) => ({
      id: createColumnId(),
      title:
        hydratedColumns.length === 1
          ? scenarioName
          : `${scenarioName}-${column.title || `对比${index + 1}`}`,
      mode: column.mode || config.defaults.mode || "special",
      inputs: {
        ...config.defaults.inputs,
        ...(column.inputs || {}),
      },
    }));
  }

  function persistState() {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        columns: cloneColumnsForStorage(state.columns),
        activeScenarioId: state.activeScenarioId || null,
      }),
    );
  }

  function loadSavedScenarios() {
    try {
      const raw = window.localStorage.getItem(SCENARIOS_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          return {
            id: typeof item.id === "string" ? item.id : createScenarioId(),
            name: typeof item.name === "string" ? item.name : "未命名方案",
            savedAt: typeof item.savedAt === "string" ? item.savedAt : new Date().toISOString(),
            columns: cloneColumnsForStorage(Array.isArray(item.columns) ? item.columns : []),
          };
        })
        .filter(Boolean)
        .sort((left, right) => String(right.savedAt).localeCompare(String(left.savedAt)));
    } catch (error) {
      return [];
    }
  }

  function persistSavedScenarios() {
    window.localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(savedScenarios));
  }

  function setSaveStatus(text, tone = "info") {
    saveStatus = { text, tone };
    renderSaveCenter();
  }

  function formatSavedAt(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function getScenarioNamingColumn() {
    return (
      state.columns.find((column) => {
        const inputs = column.inputs || {};
        return inputs.productSpec || inputs.unitArrivalPrice || inputs.frontDiscountRate;
      }) || state.columns[0]
    );
  }

  function formatScenarioNameValue(value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    return new Intl.NumberFormat("zh-CN", {
      maximumFractionDigits: 2,
    }).format(sanitizeNumber(value));
  }

  function getAutoScenarioName() {
    const column = getScenarioNamingColumn();
    const inputs = column?.inputs || {};
    const spec = String(inputs.productSpec || "").trim() || "未填规格";
    const arrivalPrice = getInputNumericValue("unitArrivalPrice", inputs.unitArrivalPrice);
    const frontDiscountRate = getInputNumericValue("frontDiscountRate", inputs.frontDiscountRate);
    const suffix = state.columns.length > 1 ? ` 等${state.columns.length}组` : "";
    return `${spec}｜到手价${formatScenarioNameValue(arrivalPrice)}｜前折${formatValue(
      frontDiscountRate,
      "percent",
    )}${suffix}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function evaluateArithmeticExpression(value) {
    const rawExpression = String(value).trim();
    if (!rawExpression) {
      return null;
    }

    const expression = rawExpression.replace(/^=\s*/, "").trim();
    if (!expression) {
      return null;
    }

    if (!/^[\d\s()+\-*/.]+$/.test(expression)) {
      return null;
    }

    if (/[*]{2,}/.test(expression)) {
      return null;
    }

    try {
      const result = Function(`"use strict"; return (${expression});`)();
      return Number.isFinite(result) ? result : null;
    } catch (error) {
      return null;
    }
  }

  function sanitizeNumber(value) {
    if (value === "" || value === null || value === undefined) {
      return 0;
    }

    if (typeof value === "string") {
      const evaluated = evaluateArithmeticExpression(value);
      if (evaluated !== null) {
        return evaluated;
      }
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function optionalNumber(value) {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    if (typeof value === "string") {
      const evaluated = evaluateArithmeticExpression(value);
      if (evaluated !== null) {
        return evaluated;
      }
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function inputDisplayValue(input, storedValue) {
    if (input.type === "text") {
      return storedValue ?? "";
    }

    if (typeof storedValue === "string") {
      return storedValue;
    }

    if (storedValue === "" || storedValue === null || storedValue === undefined) {
      return "";
    }

    const value = sanitizeNumber(storedValue);
    return input.type === "percent" ? value * 100 : value;
  }

  function inputStoredValue(input, uiValue) {
    if (input.type === "text") {
      return uiValue;
    }

    if (uiValue === "") {
      return "";
    }

    return uiValue;
  }

  function normalizeStoredValue(input, storedValue) {
    if (input.type === "text") {
      return storedValue ?? "";
    }

    if (storedValue === "" || storedValue === null || storedValue === undefined) {
      return "";
    }

    if (typeof storedValue === "number") {
      return storedValue;
    }

    const evaluated = evaluateArithmeticExpression(storedValue);
    if (evaluated === null) {
      return storedValue;
    }

    return input.type === "percent" ? evaluated / 100 : evaluated;
  }

  function getInputDefinition(key) {
    return config.inputs.find((item) => item.key === key) || null;
  }

  function getInputNumericValue(key, rawValue) {
    const input = getInputDefinition(key);
    if (!input) {
      return sanitizeNumber(rawValue);
    }

    const normalized = normalizeStoredValue(input, rawValue);
    if (typeof normalized === "string") {
      return 0;
    }

    return sanitizeNumber(normalized);
  }

  function formatValue(value, format) {
    if (value === "" || value === null || value === undefined) {
      return "-";
    }

    if (format === "text") {
      return String(value || "-");
    }

    const numericValue = sanitizeNumber(value);

    if (format === "currency") {
      return new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency: "CNY",
        maximumFractionDigits: 2,
      }).format(numericValue);
    }

    if (format === "percent") {
      return new Intl.NumberFormat("zh-CN", {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(numericValue);
    }

    return new Intl.NumberFormat("zh-CN", {
      maximumFractionDigits: 2,
    }).format(numericValue);
  }

  function normalizeSpecName(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function hydrateLookupSources() {
    const runtimeReadyMade = Array.isArray(window.OI_READY_MADE_DATA) ? window.OI_READY_MADE_DATA : [];
    const runtimeCogs = Array.isArray(window.OI_PRODUCT_COGS_DATA) ? window.OI_PRODUCT_COGS_DATA : [];
    const runtimePricePlan = Array.isArray(window.OI_PRICE_PLAN_DATA) ? window.OI_PRICE_PLAN_DATA : [];

    config.lookupSources.readyMade =
      runtimeReadyMade.length > 0 ? runtimeReadyMade : config.lookupSources.readyMade || [];
    config.lookupSources.cogs = runtimeCogs.length > 0 ? runtimeCogs : config.lookupSources.cogs || [];
    config.lookupSources.pricePlan =
      runtimePricePlan.length > 0 ? runtimePricePlan : config.lookupSources.pricePlan || [];
    config.lookupSources.warehouse = config.lookupSources.warehouse || [];
  }

  function getReadyMadeRecordBySpec(specValue) {
    const normalizedSpec = normalizeSpecName(specValue);
    if (!normalizedSpec) {
      return null;
    }

    return (
      (config.lookupSources.readyMade || []).find(
        (record) => normalizeSpecName(record.name) === normalizedSpec,
      ) || null
    );
  }

  function getReadyMadeRecordById(recordId) {
    return (
      (config.lookupSources.readyMade || []).find((record) => record.id === recordId) || null
    );
  }

  function applyReadyMadeRecord(column, record) {
    if (!column || !record) {
      return;
    }

    column.inputs.productSpec = record.name || column.inputs.productSpec;
    if (record.cogs !== undefined) {
      column.inputs.unitCogs = record.cogs;
    }
    if (record.warehouse !== undefined) {
      column.inputs.unitWarehouseCost = record.warehouse;
    }
  }

  function clearReadyMadeDerivedInputs(column) {
    if (!column) {
      return;
    }

    column.inputs.unitCogs = "";
    column.inputs.unitWarehouseCost = "";
  }

  function syncReadyMadeInputs(column) {
    if (!column || column.mode !== "readyMade") {
      return;
    }

    const record = getReadyMadeRecordBySpec(column.inputs.productSpec);
    if (record) {
      applyReadyMadeRecord(column, record);
      return;
    }

    clearReadyMadeDerivedInputs(column);
  }

  function calculateScenario(inputs) {
    const taxRate = getInputNumericValue("taxRate", inputs.taxRate);
    const estimatedVolume = getInputNumericValue("estimatedVolume", inputs.estimatedVolume);
    const unitArrivalPrice = getInputNumericValue("unitArrivalPrice", inputs.unitArrivalPrice);
    const frontDiscountRate = getInputNumericValue("frontDiscountRate", inputs.frontDiscountRate);
    const backDiscountRate = getInputNumericValue("backDiscountRate", inputs.backDiscountRate);
    const unitCogs = getInputNumericValue("unitCogs", inputs.unitCogs);
    const unitWarehouseCost = getInputNumericValue("unitWarehouseCost", inputs.unitWarehouseCost);

    const expenseAmountInput = getInputDefinition("expenseAmount");
    const expenseRateInput = getInputDefinition("expenseRate");
    const manualExpenseAmount = optionalNumber(
      normalizeStoredValue(expenseAmountInput, inputs.expenseAmount),
    );
    const manualExpenseRate = optionalNumber(
      normalizeStoredValue(expenseRateInput, inputs.expenseRate),
    );

    const unitSettlementPrice =
      unitArrivalPrice * (1 - frontDiscountRate) * (1 - backDiscountRate);
    const gmv = unitArrivalPrice * estimatedVolume;
    const totalSettlementPrice = unitSettlementPrice * estimatedVolume;
    const unitPreTaxIncome = unitSettlementPrice / (1 + taxRate);
    const totalPreTaxIncome = unitPreTaxIncome * estimatedVolume;
    const totalCogs = unitCogs * estimatedVolume;
    const grossProfit = totalPreTaxIncome - totalCogs;
    const grossProfitRate = totalPreTaxIncome === 0 ? 0 : grossProfit / totalPreTaxIncome;
    const totalWarehouseCost = unitWarehouseCost * estimatedVolume;
    const warehouseCostRate = totalPreTaxIncome === 0 ? 0 : totalWarehouseCost / totalPreTaxIncome;
    const totalFulfillmentCost = totalCogs + totalWarehouseCost;
    const pi = totalPreTaxIncome - totalFulfillmentCost;
    const piRate = totalPreTaxIncome === 0 ? 0 : pi / totalPreTaxIncome;
    const derivedExpenseAmount =
      manualExpenseAmount !== null
        ? manualExpenseAmount
        : manualExpenseRate !== null
          ? totalPreTaxIncome * manualExpenseRate
          : null;
    const derivedExpenseRate =
      manualExpenseRate !== null
        ? manualExpenseRate
        : derivedExpenseAmount === null || totalPreTaxIncome === 0
          ? null
          : derivedExpenseAmount / totalPreTaxIncome;
    const expenseForCalc = derivedExpenseAmount ?? 0;
    const oi = pi - expenseForCalc;
    const oiRate = totalPreTaxIncome === 0 ? 0 : oi / totalPreTaxIncome;

    return {
      productSpec: inputs.productSpec || "",
      taxRate,
      estimatedVolume,
      unitArrivalPrice,
      gmv,
      frontDiscountRate,
      backDiscountRate,
      unitSettlementPrice,
      totalSettlementPrice,
      unitPreTaxIncome,
      totalPreTaxIncome,
      unitCogs,
      totalCogs,
      grossProfit,
      grossProfitRate,
      unitWarehouseCost,
      totalWarehouseCost,
      warehouseCostRate,
      totalFulfillmentCost,
      pi,
      piRate,
      expenseAmount: derivedExpenseAmount,
      expenseRate: derivedExpenseRate,
      oi,
      oiRate,
    };
  }

  function getCurrentResult() {
    return state.columns.map((column) => ({
      id: column.id,
      title: column.title,
      mode: column.mode,
      inputs: column.inputs,
      result: calculateScenario(column.inputs),
    }));
  }

  function getScenarioResults(columns) {
    return hydrateColumns(columns).map((column) => ({
      id: column.id,
      title: column.title,
      mode: column.mode,
      inputs: column.inputs,
      result: calculateScenario(column.inputs),
    }));
  }

  function renderUtilityPanels() {
    const panels = [
      { key: "cogs", element: elements.cogsPanel },
      { key: "warehouse", element: elements.warehousePanel },
      { key: "pricePlan", element: elements.pricePlanPanel },
      { key: "logic", element: elements.logicPanel },
    ];

    if (elements.utilityPanelBackdrop) {
      elements.utilityPanelBackdrop.classList.toggle("hidden", !activeUtilityPanel);
    }

    panels.forEach((panel) => {
      if (!panel.element) {
        return;
      }

      const isOpen = activeUtilityPanel === panel.key;
      panel.element.classList.toggle("hidden", !isOpen);
      panel.element.setAttribute("aria-hidden", String(!isOpen));
    });
  }

  function renderSaveCenter() {
    if (elements.saveScenarioButton) {
      elements.saveScenarioButton.textContent = "保存当前方案";
    }

    if (elements.saveStatus) {
      elements.saveStatus.textContent = saveStatus.text;
      elements.saveStatus.className = `save-status ${saveStatus.tone === "success" ? "save-status-success" : ""}`;
    }

    if (elements.viewHistoryButton) {
      elements.viewHistoryButton.textContent = `查看历史方案${savedScenarios.length > 0 ? `（${savedScenarios.length}）` : ""}`;
    }

    if (elements.historyDrawer && elements.historyDrawerBackdrop) {
      elements.historyDrawer.classList.toggle("hidden", !isHistoryDrawerOpen);
      elements.historyDrawerBackdrop.classList.toggle("hidden", !isHistoryDrawerOpen);
      elements.historyDrawer.setAttribute("aria-hidden", String(!isHistoryDrawerOpen));
    }

    renderUtilityPanels();
    renderScenarioPreview();

    if (elements.savedScenarioCount) {
      elements.savedScenarioCount.textContent = `${savedScenarios.length} 个方案`;
    }

    if (!elements.savedScenariosList) {
      return;
    }

    if (savedScenarios.length === 0) {
      elements.savedScenariosList.innerHTML =
        '<div class="saved-scenario-empty">还没有保存过方案，先保存一版当前测算试试。</div>';
      return;
    }

    elements.savedScenariosList.innerHTML = savedScenarios
      .map(
        (scenario) => `
          <article class="saved-scenario-card ${scenario.id === state.activeScenarioId ? "is-active" : ""}">
            <div class="saved-scenario-main">
              <div>
                <p class="saved-scenario-name">${escapeHtml(scenario.name)}</p>
                <p class="saved-scenario-meta">
                  ${escapeHtml(`${scenario.columns.length} 个对比项`)}
                </p>
                <p class="saved-scenario-meta">
                  最近保存 ${escapeHtml(formatSavedAt(scenario.savedAt) || "-")}
                </p>
              </div>
              ${scenario.id === state.activeScenarioId ? '<span class="saved-scenario-badge">当前方案</span>' : ""}
            </div>
            <div class="saved-scenario-actions">
              <button
                type="button"
                class="mini-button"
                data-append-scenario-id="${escapeHtml(scenario.id)}"
              >
                加入对比
              </button>
              <button
                type="button"
                class="mini-button"
                data-load-scenario-id="${escapeHtml(scenario.id)}"
              >
                读取
              </button>
              <button
                type="button"
                class="mini-link-button"
                data-delete-scenario-id="${escapeHtml(scenario.id)}"
              >
                删除
              </button>
            </div>
          </article>
        `,
      )
      .join("");
  }

  function renderScenarioPreview() {
    if (
      !elements.scenarioPreviewModal ||
      !elements.scenarioPreviewBackdrop ||
      !elements.scenarioPreviewTitle ||
      !elements.scenarioPreviewMeta ||
      !elements.scenarioPreviewContent
    ) {
      return;
    }

    const scenario = savedScenarios.find((item) => item.id === previewScenarioId) || null;
    const isOpen = Boolean(scenario);

    elements.scenarioPreviewModal.classList.toggle("hidden", !isOpen);
    elements.scenarioPreviewBackdrop.classList.toggle("hidden", !isOpen);
    elements.scenarioPreviewModal.setAttribute("aria-hidden", String(!isOpen));

    if (!scenario) {
      elements.scenarioPreviewTitle.textContent = "方案预览";
      elements.scenarioPreviewMeta.textContent = "";
      elements.scenarioPreviewContent.innerHTML = "";
      return;
    }

    const results = getScenarioResults(scenario.columns);
    elements.scenarioPreviewTitle.textContent = scenario.name;
    elements.scenarioPreviewMeta.textContent = `最近保存 ${formatSavedAt(
      scenario.savedAt,
    )} · ${results.length} 个对比项`;
    elements.scenarioPreviewContent.innerHTML = `
      <div class="scenario-preview-grid">
        ${results
          .map(
            (item) => `
              <article class="scenario-preview-card">
                <h3>${escapeHtml(item.title)}</h3>
                <div class="scenario-preview-list">
                  <div class="scenario-preview-item">
                    <span>组套类型</span>
                    <strong>${escapeHtml(item.mode === "readyMade" ? "现成组套" : "特殊组套")}</strong>
                  </div>
                  <div class="scenario-preview-item">
                    <span>商品规格</span>
                    <strong>${escapeHtml(item.inputs.productSpec || "-")}</strong>
                  </div>
                  <div class="scenario-preview-item">
                    <span>单品到手价</span>
                    <strong>${escapeHtml(formatValue(item.result.unitArrivalPrice, "currency"))}</strong>
                  </div>
                  <div class="scenario-preview-item">
                    <span>前台折价</span>
                    <strong>${escapeHtml(formatValue(item.result.frontDiscountRate, "percent"))}</strong>
                  </div>
                  <div class="scenario-preview-item">
                    <span>后台折价</span>
                    <strong>${escapeHtml(formatValue(item.result.backDiscountRate, "percent"))}</strong>
                  </div>
                  <div class="scenario-preview-item">
                    <span>单品 COGS</span>
                    <strong>${escapeHtml(formatValue(item.result.unitCogs, "currency"))}</strong>
                  </div>
                  <div class="scenario-preview-item">
                    <span>单品仓物</span>
                    <strong>${escapeHtml(formatValue(item.result.unitWarehouseCost, "currency"))}</strong>
                  </div>
                  <div class="scenario-preview-item">
                    <span>OI</span>
                    <strong>${escapeHtml(formatValue(item.result.oi, "currency"))}</strong>
                  </div>
                  <div class="scenario-preview-item">
                    <span>OI率</span>
                    <strong>${escapeHtml(formatValue(item.result.oiRate, "percent"))}</strong>
                  </div>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function saveScenario() {
    const scenarioName = getAutoScenarioName();
    const payload = {
      id: createScenarioId(),
      name: scenarioName,
      savedAt: new Date().toISOString(),
      columns: cloneColumnsForStorage(state.columns),
    };

    savedScenarios.unshift(payload);

    savedScenarios = savedScenarios
      .slice()
      .sort((left, right) => String(right.savedAt).localeCompare(String(left.savedAt)));

    state.activeScenarioId = payload.id;
    persistSavedScenarios();
    persistState();
    render();
    setSaveStatus(`已保存：${scenarioName}，可点击“查看历史方案”继续调用。`, "success");
  }

  function previewScenario(scenarioId) {
    const scenario = savedScenarios.find((item) => item.id === scenarioId);
    if (!scenario) {
      setSaveStatus("没有找到这个方案，可以重新保存一版。");
      return;
    }

    previewScenarioId = scenario.id;
    renderSaveCenter();
  }

  function appendScenarioToComparison(scenarioId) {
    const scenario = savedScenarios.find((item) => item.id === scenarioId);
    if (!scenario) {
      setSaveStatus("没有找到这个方案，可以重新保存一版。");
      return;
    }

    const appendedColumns = cloneScenarioColumnsForComparison(scenario.columns, scenario.name);
    state.columns.push(...appendedColumns);
    persistState();
    render();
    setSaveStatus(`已将方案“${scenario.name}”加入当前对比。`, "success");
  }

  function deleteScenario(scenarioId) {
    const scenario = savedScenarios.find((item) => item.id === scenarioId);
    savedScenarios = savedScenarios.filter((item) => item.id !== scenarioId);
    persistSavedScenarios();

    if (state.activeScenarioId === scenarioId) {
      state.activeScenarioId = null;
      persistState();
    }

    renderSaveCenter();
    setSaveStatus(
      scenario ? `已删除方案：${scenario.name}` : "已删除方案。",
      "success",
    );
  }

  function toggleHistoryDrawer(forceOpen) {
    isHistoryDrawerOpen = typeof forceOpen === "boolean" ? forceOpen : !isHistoryDrawerOpen;
    renderSaveCenter();
  }

  function toggleUtilityPanel(panelKey) {
    activeUtilityPanel = activeUtilityPanel === panelKey ? null : panelKey;
    renderSaveCenter();
  }

  function closeUtilityPanel() {
    activeUtilityPanel = null;
    renderSaveCenter();
  }

  function closeScenarioPreview() {
    previewScenarioId = null;
    renderSaveCenter();
  }

  function normalizeQueryTokens(value) {
    return String(value)
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  function buildLookupKeywords(name) {
    return Array.from(
      new Set(
        String(name || "")
          .toLowerCase()
          .split(/[\s*+()（）\-_/\\,，：:]+/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  function getLookupSource(type) {
    const directSource = (config.lookupSources[type] || []).map((record) => ({
      ...record,
      keywords: Array.isArray(record.keywords) ? record.keywords : buildLookupKeywords(record.name),
    }));

    const readyMadeSource =
      (type === "cogs" || type === "warehouse") && (config.lookupSources.readyMade || []).length > 0
        ? config.lookupSources.readyMade.map((record) => ({
        id: `${type}-${record.id}`,
        name: record.name,
        value: type === "cogs" ? record.cogs : record.warehouse,
        description: "来自现成组套库",
        keywords: buildLookupKeywords(record.name),
      }))
        : [];

    if (type === "cogs") {
      const merged = [];
      const seen = new Set();
      [...directSource, ...readyMadeSource].forEach((record) => {
        const key = normalizeSpecName(record.name);
        if (!key || seen.has(key)) {
          return;
        }
        seen.add(key);
        merged.push(record);
      });
      return merged;
    }

    if (directSource.length > 0) {
      return directSource;
    }

    return readyMadeSource;
  }

  function getPricePlanMatches(query) {
    const records = config.lookupSources.pricePlan || [];
    const tokens = normalizeQueryTokens(query);
    if (tokens.length === 0) {
      return [];
    }

    return records.filter((record) => {
      const haystack = `${record.name} ${(record.keywords || []).join(" ")}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }

  function getLookupMatches(type, query) {
    const records = getLookupSource(type);
    const tokens = normalizeQueryTokens(query);
    if (tokens.length === 0) {
      return records.slice(0, 8);
    }

    return records.filter((record) => {
      const haystack = `${record.name} ${(record.keywords || []).join(" ")}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }

  function getReadyMadeMatches(query) {
    const records = (config.lookupSources.readyMade || []).map((record) => ({
      ...record,
      keywords: Array.isArray(record.keywords) ? record.keywords : buildLookupKeywords(record.name),
    }));
    const tokens = normalizeQueryTokens(query);

    if (tokens.length === 0) {
      return [];
    }

    return records.filter((record) => {
      const haystack = `${record.name} ${(record.keywords || []).join(" ")}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }

  function renderLookupResults(type) {
    const query =
      type === "cogs" ? elements.cogsSearchInput.value : elements.warehouseSearchInput.value;
    const matches = getLookupMatches(type, query);
    const container =
      type === "cogs" ? elements.cogsSearchResults : elements.warehouseSearchResults;

    if (getLookupSource(type).length === 0) {
      container.innerHTML =
        '<div class="search-result-item empty-results">当前还没有导入数据。后续你把后台数据给我，我可以直接补进这里。</div>';
      return;
    }

    if (!String(query || "").trim()) {
      container.innerHTML =
        '<div class="search-result-item empty-results">输入商品全称或 2 到 3 个关键字后，再显示匹配规格。</div>';
      return;
    }

    if (matches.length === 0) {
      container.innerHTML =
        '<div class="search-result-item empty-results">没有找到匹配规格，可以换全称或 2-3 个关键字试试。</div>';
      return;
    }

    container.innerHTML = matches
      .map((record) => {
        const meta = (record.keywords || []).join(" / ");
        return `
          <button
            type="button"
            class="search-result-item"
            data-lookup-type="${type}"
            data-record-id="${escapeHtml(record.id)}"
          >
            <span class="search-result-name">${escapeHtml(record.name)}</span>
            <span class="search-result-meta">${escapeHtml(meta || "点击后查看对应数值")}</span>
          </button>
        `;
      })
      .join("");
  }

  function renderLookupSelection(type, record) {
    const container =
      type === "cogs" ? elements.cogsSearchSelection : elements.warehouseSearchSelection;
    const label = type === "cogs" ? "COGS" : "仓物";

    if (!record) {
      container.className = "search-selection empty-selection";
      container.textContent = "还没有选中规格";
      return;
    }

    container.className = "search-selection";
    container.innerHTML = `
      <div class="selection-label">已选规格</div>
      <div class="search-result-name">${escapeHtml(record.name)}</div>
      <div class="search-result-meta">${escapeHtml(record.description || "已匹配到对应规格")}</div>
      <div class="selection-label">对应 ${escapeHtml(label)}</div>
      <div class="selection-value-row">
        <div class="selection-value">${escapeHtml(formatValue(record.value, "currency"))}</div>
        <button type="button" class="mini-button" data-copy-value="${escapeHtml(String(record.value))}">
          复制数值
        </button>
      </div>
    `;
  }

  function collapseLookupResults(type, message) {
    const container =
      type === "cogs" ? elements.cogsSearchResults : elements.warehouseSearchResults;
    container.innerHTML = `<div class="search-result-item empty-results">${escapeHtml(message)}</div>`;
  }

  function setLookupInputValue(type, value) {
    const input = type === "cogs" ? elements.cogsSearchInput : elements.warehouseSearchInput;
    input.value = value || "";
  }

  function getLookupRecordByName(type, name) {
    const normalizedName = normalizeSpecName(name);
    if (!normalizedName) {
      return null;
    }

    return getLookupSource(type).find((item) => normalizeSpecName(item.name) === normalizedName) || null;
  }

  function applyLookupSelection(type, record) {
    if (!record) {
      return;
    }

    setLookupInputValue(type, record.name);
    renderLookupSelection(type, record);
    collapseLookupResults(type, "已选中该规格，如需重新检索请修改关键词。");
  }

  function syncSiblingLookupSelection(type, record) {
    if (!record) {
      return;
    }

    const siblingType = type === "cogs" ? "warehouse" : "cogs";
    const siblingRecord = getLookupRecordByName(siblingType, record.name);
    if (!siblingRecord) {
      return;
    }

    applyLookupSelection(siblingType, siblingRecord);
  }

  function renderReadyMadeOptions() {
    if (!elements.readyMadeSpecOptions) {
      return;
    }

    elements.readyMadeSpecOptions.innerHTML = (config.lookupSources.readyMade || [])
      .map((record) => `<option value="${escapeHtml(record.name)}"></option>`)
      .join("");
  }

  function renderReadyMadeSuggestions(column) {
    if (!column || column.mode !== "readyMade") {
      return "";
    }

    const isOpen = activeReadyMadeSuggestionColumnId === column.id;
    if (!isOpen) {
      return "";
    }

    const query = String(column.inputs.productSpec || "");
    const matches = getReadyMadeMatches(query).slice(0, 8);

    if (!String(query).trim()) {
      return `
        <div class="ready-made-suggestions is-empty">
          输入商品全称或 2 到 3 个关键字后，再显示现成组套候选。
        </div>
      `;
    }

    if (matches.length === 0) {
      return `
        <div class="ready-made-suggestions is-empty">
          没有找到匹配组套，可以换全称或 2 到 3 个关键字试试。
        </div>
      `;
    }

    return `
      <div class="ready-made-suggestions">
        ${matches
          .map(
            (record) => `
              <button
                type="button"
                class="ready-made-suggestion-item"
                data-ready-made-id="${escapeHtml(record.id)}"
                data-ready-made-column-id="${escapeHtml(column.id)}"
              >
                <span class="ready-made-suggestion-name">${escapeHtml(record.name)}</span>
                <span class="ready-made-suggestion-meta">
                  COGS ${escapeHtml(formatValue(record.cogs, "currency"))} / 仓物 ${escapeHtml(
                    formatValue(record.warehouse, "currency"),
                  )}
                </span>
              </button>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderPricePlanResults() {
    const query = elements.pricePlanSearchInput.value;
    const matches = getPricePlanMatches(query);

    if ((config.lookupSources.pricePlan || []).length === 0) {
      elements.pricePlanSearchResults.innerHTML =
        '<div class="search-result-item empty-results">当前还没有导入价盘数据。</div>';
      return;
    }

    if (!String(query || "").trim()) {
      elements.pricePlanSearchResults.innerHTML =
        '<div class="search-result-item empty-results">输入组套名称或商品规格后，再显示价盘规划。</div>';
      return;
    }

    if (matches.length === 0) {
      elements.pricePlanSearchResults.innerHTML =
        '<div class="search-result-item empty-results">没有找到匹配规格，可以换全称或 2-3 个关键字试试。</div>';
      return;
    }

    elements.pricePlanSearchResults.innerHTML = matches
      .slice(0, 12)
      .map(
        (record) => `
          <button
            type="button"
            class="search-result-item"
            data-price-plan-id="${escapeHtml(record.id)}"
          >
            <span class="search-result-name">${escapeHtml(record.name)}</span>
            <span class="search-result-meta">点击后查看该规格的公司价盘规划</span>
          </button>
        `,
      )
      .join("");
  }

  function renderPricePlanSelection(record) {
    if (!record) {
      elements.pricePlanSelection.className = "price-plan-selection empty-selection";
      elements.pricePlanSelection.textContent = "还没有选中规格";
      return;
    }

    const tiers = [
      { label: "C级价", value: record.cPrice },
      { label: "B级价", value: record.bPrice },
      { label: "A级价", value: record.aPrice },
      { label: "S级价", value: record.sPrice },
      { label: "SS价", value: record.ssPrice },
    ];

    elements.pricePlanSelection.className = "price-plan-selection search-selection";
    elements.pricePlanSelection.innerHTML = `
      <div class="selection-label">已选规格</div>
      <div class="search-result-name">${escapeHtml(record.name)}</div>
      <div class="search-result-meta">当前展示的是这一个规格在公司整体价盘中的五档规划。</div>
      <div class="price-plan-grid">
        ${tiers
          .map(
            (tier) => `
              <article class="price-plan-card">
                <p class="price-plan-card-label">${escapeHtml(tier.label)}</p>
                <p class="price-plan-card-value">${escapeHtml(
                  tier.value === null || tier.value === undefined ? "-" : formatValue(tier.value, "currency"),
                )}</p>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function applyPricePlanSelection(record) {
    if (!record) {
      return;
    }

    elements.pricePlanSearchInput.value = record.name;
    renderPricePlanSelection(record);
    elements.pricePlanSearchResults.innerHTML =
      '<div class="search-result-item empty-results">已展示该规格的价盘规划，如需重新检索请修改关键词。</div>';
  }

  function renderLogicNotes() {
    elements.logicNotes.innerHTML = config.logicNotes
      .map(
        (item) => `
          <article class="logic-card ${item.highlight ? "highlight" : ""}">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.text)}</p>
            <div class="formula-text">${escapeHtml(item.formula)}</div>
          </article>
        `,
      )
      .join("");
  }

  function renderOiRateSummary(results) {
    elements.oiRateSummary.innerHTML = results
      .map(
        (item) => `
          <article class="oi-rate-card">
            <p class="oi-rate-card-title">${escapeHtml(item.title)}</p>
            <p class="oi-rate-card-value">${escapeHtml(formatValue(item.result.oiRate, "percent"))}</p>
          </article>
        `,
      )
      .join("");
  }

  function renderTableHead() {
    elements.resultTableHead.innerHTML = `
      <tr>
        <th>项目</th>
        ${state.columns
          .map(
            (column) => `
              <th>
                <div class="comparison-head">
                  <div class="comparison-mode-wrap">
                    <span class="comparison-mode-label">组套类型</span>
                    <select class="comparison-mode-select" data-column-mode-id="${column.id}">
                      <option value="readyMade" ${column.mode === "readyMade" ? "selected" : ""}>现成组套</option>
                      <option value="special" ${column.mode === "special" ? "selected" : ""}>特殊组套</option>
                    </select>
                  </div>
                  <input
                    class="comparison-title-input"
                    type="text"
                    data-column-title-id="${column.id}"
                    value="${escapeHtml(column.title)}"
                  />
                  <div class="comparison-actions">
                    <span class="comparison-subtitle">${column.mode === "readyMade" ? "自动带值" : "手动检索"}</span>
                    ${
                      state.columns.length > 1
                        ? `<button type="button" class="mini-link-button" data-remove-column-id="${column.id}">删除</button>`
                        : ""
                    }
                  </div>
                </div>
              </th>
            `,
          )
          .join("")}
      </tr>
    `;
  }

  function getRenderedInputValue(row, input, columnResult, rawValue) {
    if (row.key === "expenseAmount") {
      return inputDisplayValue(input, rawValue === "" ? columnResult.result.expenseAmount : rawValue);
    }

    if (row.key === "expenseRate") {
      return inputDisplayValue(input, rawValue === "" ? columnResult.result.expenseRate : rawValue);
    }

    return inputDisplayValue(input, rawValue);
  }

  function renderTable(results) {
    elements.resultTableBody.innerHTML = config.metricRows
      .map((row) => {
        if (row.type === "section") {
          return `
            <tr class="section-row">
              <td colspan="${state.columns.length + 1}">${escapeHtml(row.label)}</td>
            </tr>
          `;
        }

        const cells = results
          .map((columnResult) => {
            const column = state.columns.find((item) => item.id === columnResult.id);
            const value =
              row.source === "input" ? columnResult.inputs[row.key] : columnResult.result[row.key];

            if (row.source === "input") {
              const input = getInputDefinition(row.key);
              const step = input?.step ?? (input?.type === "percent" ? 0.1 : 1);
              const placeholder =
                row.key === "productSpec" && column?.mode === "readyMade"
                  ? "选择或输入现成组套"
                  : input?.type === "percent"
                    ? "%"
                    : input?.type === "currency"
                      ? "元"
                      : input?.type === "text"
                        ? "输入规格"
                        : "数值";
              const extraAttrs =
                row.key === "productSpec" && column?.mode === "readyMade"
                  ? 'autocomplete="off" spellcheck="false"'
                  : input?.type === "text"
                    ? ""
                    : `inputmode="decimal" data-step="${step}"`;
              const displayValue = getRenderedInputValue(row, input, columnResult, value);
              const readyMadeSuggestions =
                row.key === "productSpec" && column?.mode === "readyMade"
                  ? renderReadyMadeSuggestions(column)
                  : "";

              return `
                <td>
                  <div class="table-input-stack">
                    <input
                      class="table-input"
                      type="text"
                      data-column-id="${columnResult.id}"
                      data-input-key="${row.key}"
                      ${extraAttrs}
                      value="${escapeHtml(String(displayValue ?? ""))}"
                      placeholder="${placeholder}"
                    />
                    ${readyMadeSuggestions}
                  </div>
                  ${
                    row.key === "productSpec" && column?.mode === "readyMade"
                      ? '<span class="comparison-auto-tag">匹配后自动带入单品 COGS / 单品仓物</span>'
                      : ""
                  }
                </td>
              `;
            }

            return `
              <td class="${row.highlight ? "value-strong" : ""}">
                ${escapeHtml(formatValue(value, row.format))}
              </td>
            `;
          })
          .join("");

        return `
          <tr>
            <td class="row-label">
              ${escapeHtml(row.label)}
              ${row.note ? `<span class="row-note">${escapeHtml(row.note)}</span>` : ""}
            </td>
            ${cells}
          </tr>
        `;
      })
      .join("");
  }

  function centerTableWrapOnColumnChange() {
    if (!elements.tableWrap) {
      return;
    }

    const currentColumnCount = state.columns.length;
    if (currentColumnCount === lastRenderedColumnCount) {
      return;
    }

    lastRenderedColumnCount = currentColumnCount;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const container = elements.tableWrap;
        if (!container) {
          return;
        }

        const maxScroll = container.scrollWidth - container.clientWidth;
        container.scrollLeft = maxScroll > 0 ? maxScroll / 2 : 0;
      });
    });
  }

  function copyScenario(results) {
    const payload = {
      comparisons: results.map((item) => ({
        id: item.id,
        title: item.title,
        mode: item.mode,
        inputs: item.inputs,
        result: item.result,
      })),
      copiedAt: new Date().toISOString(),
    };

    const text = JSON.stringify(payload, null, 2);
    return navigator.clipboard.writeText(text).then(
      () => {
        elements.copyButton.textContent = "已复制";
        window.setTimeout(() => {
          elements.copyButton.textContent = "复制当前场景";
        }, 1200);
      },
      () => {
        window.alert("复制失败，可以先查看浏览器控制台。");
        console.log(text);
      },
    );
  }

  function render() {
    const results = getCurrentResult();
    renderSaveCenter();
    renderReadyMadeOptions();
    renderLogicNotes();
    renderTableHead();
    renderTable(results);
    centerTableWrapOnColumnChange();
    renderOiRateSummary(results);
    renderLookupResults("cogs");
    renderLookupResults("warehouse");
  }

  function renderWithInputFocus(columnId, inputKey, selectionStart, selectionEnd) {
    render();

    const selector = `[data-column-id="${columnId}"][data-input-key="${inputKey}"]`;
    const input = document.querySelector(selector);
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    input.focus();

    if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
      try {
        input.setSelectionRange(selectionStart, selectionEnd);
      } catch (error) {
        // Ignore when the browser does not support restoring ranges for this input.
      }
    } else {
      try {
        input.setSelectionRange(input.value.length, input.value.length);
      } catch (error) {
        // Ignore when the browser does not support restoring ranges for this input.
      }
    }
  }

  function commitFormulaValue(columnId, inputKey) {
    const column = state.columns.find((item) => item.id === columnId);
    const input = getInputDefinition(inputKey);
    if (!column || !input || input.type === "text") {
      return;
    }

    const normalized = normalizeStoredValue(input, column.inputs[inputKey]);
    if (typeof normalized !== "string") {
      column.inputs[inputKey] = normalized;
    }
  }

  function commitActiveFormulaInput() {
    const activeInput = document.activeElement;
    if (!(activeInput instanceof HTMLInputElement)) {
      return;
    }

    const columnId = activeInput.dataset.columnId;
    const inputKey = activeInput.dataset.inputKey;
    if (!columnId || !inputKey) {
      return;
    }

    commitFormulaValue(columnId, inputKey);
    persistState();
    render();
  }

  function resetState() {
    state.columns = [createComparisonColumn(1)];
    state.activeScenarioId = null;
    persistState();
    setSaveStatus("已清空当前测算，历史方案仍然保留在本机浏览器中。");
    render();
  }

  function updateTableInputValue(target, renderAfterChange) {
    const columnId = target.dataset.columnId;
    const inputKey = target.dataset.inputKey;
    if (!columnId || !inputKey) {
      return;
    }

    const column = state.columns.find((item) => item.id === columnId);
    const input = getInputDefinition(inputKey);
    if (!column || !input) {
      return;
    }

    column.inputs[inputKey] = inputStoredValue(input, target.value);

    if (inputKey === "productSpec" && column.mode === "readyMade") {
      syncReadyMadeInputs(column);
    }

    if (inputKey === "expenseAmount") {
      const preview = calculateScenario(column.inputs);
      if (target.value === "") {
        column.inputs.expenseRate = "";
      } else if (preview.totalPreTaxIncome !== 0) {
        column.inputs.expenseRate = sanitizeNumber(column.inputs.expenseAmount) / preview.totalPreTaxIncome;
      }
    }

    if (inputKey === "expenseRate") {
      const preview = calculateScenario(column.inputs);
      if (target.value === "") {
        column.inputs.expenseAmount = "";
      } else {
        column.inputs.expenseAmount = preview.totalPreTaxIncome * sanitizeNumber(column.inputs.expenseRate);
      }
    }

    persistState();

    if (renderAfterChange) {
      renderWithInputFocus(columnId, inputKey, target.selectionStart, target.selectionEnd);
    }
  }

  function bindEvents() {
    elements.saveScenarioButton.addEventListener("click", () => {
      saveScenario();
    });

    elements.viewHistoryButton.addEventListener("click", () => {
      toggleHistoryDrawer(true);
    });

    elements.closeHistoryButton.addEventListener("click", () => {
      toggleHistoryDrawer(false);
    });

    elements.historyDrawerBackdrop.addEventListener("click", () => {
      toggleHistoryDrawer(false);
    });

    elements.openCogsPanelButton.addEventListener("click", () => {
      toggleUtilityPanel("cogs");
    });

    elements.openWarehousePanelButton.addEventListener("click", () => {
      toggleUtilityPanel("warehouse");
    });

    elements.openPricePlanPanelButton.addEventListener("click", () => {
      toggleUtilityPanel("pricePlan");
    });

    elements.openLogicPanelButton.addEventListener("click", () => {
      toggleUtilityPanel("logic");
    });

    elements.utilityPanelBackdrop.addEventListener("click", () => {
      closeUtilityPanel();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const closeButton = target.closest("[data-close-utility-panel]");
      if (!closeButton) {
        return;
      }

      closeUtilityPanel();
    });

    elements.closeScenarioPreviewButton.addEventListener("click", () => {
      closeScenarioPreview();
    });

    elements.scenarioPreviewBackdrop.addEventListener("click", () => {
      closeScenarioPreview();
    });

    elements.savedScenariosList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const loadButton = target.closest("[data-load-scenario-id]");
      if (loadButton) {
        const scenarioId = loadButton.getAttribute("data-load-scenario-id");
        if (scenarioId) {
          previewScenario(scenarioId);
        }
        return;
      }

      const appendButton = target.closest("[data-append-scenario-id]");
      if (appendButton) {
        const scenarioId = appendButton.getAttribute("data-append-scenario-id");
        if (scenarioId) {
          appendScenarioToComparison(scenarioId);
        }
        return;
      }

      const deleteButton = target.closest("[data-delete-scenario-id]");
      if (!deleteButton) {
        return;
      }

      const scenarioId = deleteButton.getAttribute("data-delete-scenario-id");
      if (!scenarioId) {
        return;
      }

      deleteScenario(scenarioId);
    });

    elements.resultTableBody.addEventListener("compositionstart", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement) {
        target.dataset.composing = "true";
      }
    });

    elements.resultTableBody.addEventListener("compositionend", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      target.dataset.composing = "false";
      target.dataset.justComposed = "true";
      updateTableInputValue(target, true);
    });

    elements.resultTableBody.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      if (event.isComposing || target.dataset.composing === "true") {
        updateTableInputValue(target, false);
        return;
      }

      if (target.dataset.justComposed === "true") {
        target.dataset.justComposed = "false";
        return;
      }

      updateTableInputValue(target, true);
    });

    elements.resultTableBody.addEventListener("focusin", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      const columnId = target.dataset.columnId;
      const inputKey = target.dataset.inputKey;
      if (!columnId || inputKey !== "productSpec") {
        return;
      }

      const column = state.columns.find((item) => item.id === columnId);
      if (!column || column.mode !== "readyMade") {
        return;
      }

      if (activeReadyMadeSuggestionColumnId === columnId) {
        return;
      }

      activeReadyMadeSuggestionColumnId = columnId;
      renderWithInputFocus(columnId, inputKey, target.selectionStart, target.selectionEnd);
    });

    elements.resultTableBody.addEventListener(
      "pointerdown",
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const suggestionButton = target.closest("[data-ready-made-id]");
        if (!suggestionButton) {
          return;
        }

        event.preventDefault();

        const recordId = suggestionButton.getAttribute("data-ready-made-id");
        const columnId = suggestionButton.getAttribute("data-ready-made-column-id");
        if (!recordId || !columnId) {
          return;
        }

        const column = state.columns.find((item) => item.id === columnId);
        const record = getReadyMadeRecordById(recordId);
        if (!column || !record) {
          return;
        }

        applyReadyMadeRecord(column, record);
        activeReadyMadeSuggestionColumnId = null;
        persistState();
        render();
      },
      true,
    );

    document.addEventListener(
      "pointerdown",
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const activeInput = document.activeElement;
        if (!(activeInput instanceof HTMLInputElement)) {
          return;
        }

        if (
          activeInput.dataset.columnId &&
          activeInput.dataset.inputKey &&
          target !== activeInput &&
          !target.closest(
            `[data-column-id="${activeInput.dataset.columnId}"][data-input-key="${activeInput.dataset.inputKey}"]`,
          )
        ) {
          commitActiveFormulaInput();
        }

        if (
          activeReadyMadeSuggestionColumnId &&
          !target.closest(".table-input-stack") &&
          !target.closest(".ready-made-suggestions")
        ) {
          activeReadyMadeSuggestionColumnId = null;
          render();
        }
      },
      true,
    );

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== "Tab") {
        return;
      }

      commitActiveFormulaInput();
    });

    elements.resultTableBody.addEventListener(
      "focusout",
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }

        const columnId = target.dataset.columnId;
        const inputKey = target.dataset.inputKey;
        if (!columnId || !inputKey) {
          return;
        }

        const column = state.columns.find((item) => item.id === columnId);
        if (inputKey === "productSpec" && column?.mode === "readyMade") {
          syncReadyMadeInputs(column);
          if (activeReadyMadeSuggestionColumnId === columnId) {
            activeReadyMadeSuggestionColumnId = null;
          }
        }

        commitFormulaValue(columnId, inputKey);
        persistState();
        render();
      },
    );

    elements.resultTableHead.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      const columnId = target.dataset.columnTitleId;
      if (!columnId) {
        return;
      }

      const column = state.columns.find((item) => item.id === columnId);
      if (!column) {
        return;
      }

      column.title = target.value || "未命名对比";
      persistState();
    });

    elements.resultTableHead.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) {
        return;
      }

      const columnId = target.dataset.columnModeId;
      if (!columnId) {
        return;
      }

      const column = state.columns.find((item) => item.id === columnId);
      if (!column) {
        return;
      }

      column.mode = target.value === "readyMade" ? "readyMade" : "special";
      if (column.mode === "readyMade") {
        syncReadyMadeInputs(column);
      }

      persistState();
      render();
    });

    elements.resultTableHead.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest("[data-remove-column-id]");
      if (!button) {
        return;
      }

      const columnId = button.getAttribute("data-remove-column-id");
      if (!columnId || state.columns.length <= 1) {
        return;
      }

      state.columns = state.columns.filter((item) => item.id !== columnId);
      persistState();
      render();
    });

    elements.cogsSearchInput.addEventListener("input", () => {
      renderLookupResults("cogs");
    });

    elements.warehouseSearchInput.addEventListener("input", () => {
      renderLookupResults("warehouse");
    });

    elements.pricePlanSearchInput.addEventListener("input", () => {
      renderPricePlanResults();
    });

    elements.cogsSearchResults.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest("[data-record-id]");
      if (!button) {
        return;
      }

      const recordId = button.getAttribute("data-record-id");
      const record = getLookupSource("cogs").find((item) => item.id === recordId);
      applyLookupSelection("cogs", record || null);
      syncSiblingLookupSelection("cogs", record || null);
    });

    elements.warehouseSearchResults.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest("[data-record-id]");
      if (!button) {
        return;
      }

      const recordId = button.getAttribute("data-record-id");
      const record = getLookupSource("warehouse").find((item) => item.id === recordId);
      applyLookupSelection("warehouse", record || null);
      syncSiblingLookupSelection("warehouse", record || null);
    });

    elements.pricePlanSearchResults.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest("[data-price-plan-id]");
      if (!button) {
        return;
      }

      const recordId = button.getAttribute("data-price-plan-id");
      const record = (config.lookupSources.pricePlan || []).find((item) => item.id === recordId);
      applyPricePlanSelection(record || null);
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest("[data-copy-value]");
      if (!button) {
        return;
      }

      const value = button.getAttribute("data-copy-value");
      if (!value) {
        return;
      }

      navigator.clipboard.writeText(value).then(
        () => {
          button.textContent = "已复制";
          window.setTimeout(() => {
            button.textContent = "复制数值";
          }, 1200);
        },
        () => {
          window.alert("复制失败，可以手动输入这个数值。");
        },
      );
    });

    elements.addComparisonButton.addEventListener("click", () => {
      const sourceColumn = state.columns[state.columns.length - 1] || null;
      state.columns.push(cloneComparisonColumn(sourceColumn, state.columns.length + 1));
      persistState();
      render();
    });

    elements.resetButton.addEventListener("click", resetState);
    elements.copyButton.addEventListener("click", () => {
      copyScenario(getCurrentResult());
    });
  }

  hydrateLookupSources();
  bindEvents();
  renderLookupSelection("cogs", null);
  renderLookupSelection("warehouse", null);
  renderPricePlanSelection(null);
  render();
})();
