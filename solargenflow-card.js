class SolarGenflowCardV2 extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entities) throw new Error("SolarGenflow Card V2: 'entities' manquant.");
    this.config = {
      title: "SolarGenflow",
      show_header: true,
      battery_name: "SolarVault 1",
      ...config,
    };
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
  }

  set hass(hass) { this._hass = hass; this.render(); }
  getCardSize() { return 9; }

  _num(entityId) {
    if (!entityId || !this._hass?.states[entityId]) return 0;
    const v = Number(String(this._hass.states[entityId].state).replace(",", "."));
    return Number.isFinite(v) ? v : 0;
  }
  _str(entityId) {
    if (!entityId || !this._hass?.states[entityId]) return null;
    return this._hass.states[entityId].state;
  }
  _fmt(w) {
    const n = Number(w) || 0;
    if (Math.abs(n) >= 1000) return `${(n/1000).toFixed(1)} kW`;
    return `${Math.round(n)} W`;
  }
  _fmtKwh(v) {
    const n = Number(v) || 0;
    if (n >= 1000) return `${(n/1000).toFixed(1)} MWh`;
    if (n >= 1)    return `${n.toFixed(1)} kWh`;
    return `${Math.round(n * 1000)} Wh`;
  }
  _flowActive(w) { return Math.abs(Number(w)) > 5; }

  _modeInfo(modeStr) {
    const modes = {
      'tariff':        { label: 'Tarifaire', icon: '⟳', num: 13 },
      'custom':        { label: 'Personnalisé', icon: '⏱', num: 14 },
      'self_consumption': { label: 'Autoconso', icon: '⌂', num: 15 },
      'ai':            { label: 'IA', icon: 'AI', num: 16 },
    };
    if (!modeStr) return { label: 'IA', icon: 'AI', num: 16 };
    const key = String(modeStr).toLowerCase().replace(/[^a-z_]/g,'');
    return modes[key] || { label: modeStr, icon: '?', num: '?' };
  }

  render() {
    if (!this.shadowRoot || !this._hass || !this.config) return;
    const e = this.config.entities;

    const pv      = this._num(e.pv_power);
    const pv1     = this._num(e.pv1_power);
    const pv2     = this._num(e.pv2_power);
    const pv3     = this._num(e.pv3_power);
    const pv4     = this._num(e.pv4_power);
    const soc     = Math.max(0, Math.min(100, this._num(e.battery_soc)));
    const batNet  = this._num(e.battery_net_power);
    const eps     = this._num(e.backup_output_power);
    const acOut   = this._num(e.solarvault_ac_output);
    const acIn    = this._num(e.solarvault_ac_input);
    const gridImp = this._num(e.grid_import_power);
    const gridExp = this._num(e.grid_export_power);
    const maison  = this._num(e.home_load_total);
    const pvDaily    = this._num(e.pv_daily_energy);
    const gridExpDaily = this._num(e.grid_export_daily_energy);
    const batTemp    = this._num(e.battery_temperature);
    const socCharLim = this._num(e.soc_charge_limit);
    const socDisLim  = this._num(e.soc_discharge_limit);
    const modeStr    = this._str(e.mode_entity);

    // Autosuffisance journalière : part du PV consommé localement
    // = (production PV - export réseau) / production PV
    const autoJour = pvDaily > 0.01
      ? Math.max(0, Math.min(100, Math.round((pvDaily - gridExpDaily) / pvDaily * 100)))
      : 0;

    // Calculs
    const efficacite   = pv > 5 ? Math.min(100, Math.round(maison / pv * 100)) : 0;

    // Jauge = autosuffisance journalière
    const gaugeVal   = autoJour;
    const gaugeColor = gaugeVal >= 80 ? "#24c734" : gaugeVal >= 50 ? "#f90" : "#e55";

    const batDir   = batNet > 5 ? "CHARGE" : batNet < -5 ? "DÉCHARGE" : "REPOS";
    const batColor = batNet > 5 ? "#24c734" : batNet < -5 ? "#e55" : "#888";
    const batLabel = batNet > 5 ? `+${this._fmt(batNet)}` : batNet < -5 ? `-${this._fmt(Math.abs(batNet))}` : "0 W";
    const gridColor = gridImp > 5 ? "#378ADD" : gridExp > 5 ? "#24c734" : "#888";
    const socColor  = soc < 20 ? "#e55" : soc < 50 ? "#f90" : "#24c734";
    const socFill   = soc < 20 ? "rgba(229,85,85,0.25)" : soc < 50 ? "rgba(255,153,0,0.25)" : "rgba(36,199,52,0.25)";
    const gridExportActive = gridExp > 5;
    const gridImportActive = gridImp > 5;

    const fPV    = this._flowActive(pv)    ? "active" : "idle";
    const fAcOut = this._flowActive(acOut) ? "active" : "idle";
    const fAcIn  = this._flowActive(acIn)  ? "active" : "idle";
    const fGrid  = this._flowActive(gridImp + gridExp) ? "active" : "idle";
    const fEps   = this._flowActive(eps)   ? "active" : "idle";
    const fMaison= this._flowActive(maison)? "active" : "idle";

    // Jauge SVG autosuffisance
    const R = 28, CX = 36, CY = 36;
    const circ = 2 * Math.PI * R;
    const dash = (gaugeVal / 100) * circ;

    const mode = this._modeInfo(modeStr);

    this.shadowRoot.innerHTML = `
<style>
  :host {
    --bg:      #0d0d0f;
    --bg2:     #161618;
    --border:  rgba(255,255,255,0.08);
    --text:    #f0f0f0;
    --text2:   #999;
    --solar:   #ffb300;
    --teal:    #00c9a7;
    --purple:  #8b5cf6;
    --blue:    #378ADD;
    --green:   #24c734;
    --eps-col: #c0392b;
    --gray:    #4a4a52;
    --radius:  14px;
    --shadow:  0 4px 24px rgba(0,0,0,0.5);
  }
  ha-card {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
    font-family: 'Inter','Roboto',Arial,sans-serif;
    color: var(--text);
  }
  .wrap { padding: 14px; }

  /* HEADER */
  .header {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 12px;
    font-size: 14px; font-weight: 700; color: var(--solar);
  }

  /* TOP ROW */
  .top-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
    margin-bottom: 0;
  }
  .top-card {
    background: var(--bg2);
    border: 1.5px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 10px;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    text-align: center; cursor: pointer;
    transition: box-shadow 0.2s;
  }
  .top-card:hover { box-shadow: 0 0 0 2px rgba(255,255,255,0.12); }
  .top-card .tc-icon { font-size: 20px; }
  .top-card .tc-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.7px; color: var(--text2); }
  .top-card .tc-value { font-size: 22px; font-weight: 800; line-height: 1.1; }
  .top-card .tc-sub   { font-size: 10px; color: var(--text2); }
  .top-pv   { border-color: var(--solar); }
  .top-jour { border-color: var(--teal); }
  .top-auto { border-color: var(--green); }

  /* Jauge circulaire */
  .gauge-wrap { position: relative; width: 72px; height: 72px; }
  .gauge-wrap svg { position: absolute; inset: 0; }
  .gauge-center {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-weight: 900; font-size: 14px; line-height: 1;
  }
  .gauge-center small { font-size: 8px; color: var(--text2); font-weight: 700; }

  /* MAIN GRID */
  .main {
    display: grid;
    grid-template-columns: 1fr 1fr 100px;
    grid-template-rows: auto auto;
    gap: 0;
    position: relative;
    margin-top: 30px;
  }

  /* NOEUDS */
  .node {
    border-radius: var(--radius);
    border: 1.5px solid var(--border);
    padding: 12px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px; text-align: center;
    background: var(--bg2);
    box-shadow: var(--shadow);
    position: relative; overflow: hidden;
    cursor: pointer;
    transition: box-shadow 0.2s;
  }
  .node:hover { box-shadow: 0 0 0 2px rgba(255,255,255,0.12), var(--shadow); }
  .node .icon  { font-size: 20px; line-height: 1; }
  .node .label { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text2); }
  .node .value { font-size: 20px; font-weight: 800; line-height: 1.1; }
  .node .sub   { font-size: 10px; color: var(--text2); }

  .node-sv  { border-color: var(--teal);   grid-column: 1; grid-row: 1; margin: 0 30px 0 0; }
  .node-ce  { border-color: var(--purple); grid-column: 2; grid-row: 1; }
  .node-re  { border-color: var(--blue);   grid-column: 3; grid-row: 1; margin-left: 24px; cursor: default; }
  .node-re:hover { box-shadow: var(--shadow); }
  .node-band { border-color: var(--gray);  grid-column: 1 / 4; grid-row: 2; margin-top: 30px;
               flex-direction: row; align-items: center; gap: 12px; padding: 12px 16px; cursor: default; }
  .node-band:hover { box-shadow: var(--shadow); }

  .soc-bar {
    position: absolute; bottom: 0; left: 0; right: 0;
    transition: height 0.6s ease;
    border-radius: 0 0 calc(var(--radius) - 2px) calc(var(--radius) - 2px);
    z-index: 0;
  }
  .node-sv > * { position: relative; z-index: 1; }

  /* EPS + Maison */
  .eps-badge {
    border: 1.5px solid var(--eps-col); border-radius: 10px;
    padding: 8px 12px; background: rgba(192,57,43,0.12);
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    min-width: 88px; flex-shrink: 0; cursor: pointer;
  }
  .eps-badge .label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--eps-col); }
  .eps-badge .value { font-size: 16px; font-weight: 800; color: var(--eps-col); }
  .maison-info { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .maison-info .label { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text2); }
  .maison-info .value { font-size: 24px; font-weight: 800; }

  /* CONNECTEURS SVG */
  .connectors { position: absolute; inset: 0; pointer-events: none; overflow: visible; }
  .flow { fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-dasharray: 8 10; }
  .flow.active { animation: dash 1.1s linear infinite; }
  .flow.idle   { opacity: 0.15; }
  .flow.pv-color   { stroke: var(--solar); }
  .flow.teal-color { stroke: var(--teal); }
  .flow.blue-color { stroke: var(--blue); }
  .flow.eps-color  { stroke: var(--eps-col); }
  .flow.gray-color { stroke: var(--gray); }
  @keyframes dash { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -36; } }

  /* BOTTOM ROW */
  .bottom-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 8px;
    margin-top: 12px;
  }
  .bot-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 12px; padding: 10px 8px; text-align: center;
  }
  .bot-card .b-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text2); }
  .bot-card .b-value { font-size: 18px; font-weight: 800; margin-top: 3px; }

  /* Mode selector */
  .mode-select {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    background: var(--bg); border: 1.5px solid var(--purple);
    border-radius: 8px; padding: 4px 10px;
    cursor: pointer; transition: box-shadow 0.2s;
    font-size: 18px; font-weight: 900; color: var(--purple);
    margin-top: 3px;
  }
  .mode-select:hover { box-shadow: 0 0 0 2px rgba(139,92,246,0.3); }
  .mode-arrow { font-size: 10px; color: var(--text2); }

  /* Réglages */
  .settings-btn {
    font-size: 26px; margin-top: 3px; cursor: pointer;
    transition: transform 0.3s;
    display: block;
  }
  .settings-btn:hover { transform: rotate(30deg); }

  /* Modal réglages */
  .modal-overlay {
    display: none; position: fixed; inset: 0; z-index: 999;
    background: rgba(0,0,0,0.7); align-items: center; justify-content: center;
  }
  .modal-overlay.open { display: flex; }
  .modal {
    background: #1a1a1e; border: 1px solid rgba(255,255,255,0.12);
    border-radius: 20px; padding: 24px; min-width: 280px; max-width: 360px;
    color: var(--text);
  }
  .modal h3 { margin: 0 0 16px; font-size: 16px; color: var(--solar); }
  .modal-close {
    float: right; background: none; border: none;
    color: var(--text2); font-size: 20px; cursor: pointer; margin-top: -4px;
  }
  .modal-section { margin-bottom: 14px; }
  .modal-section label { font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.6px; color: var(--text2); display: block; margin-bottom: 6px; }
  .mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .mode-btn {
    background: var(--bg); border: 1.5px solid var(--border);
    border-radius: 10px; padding: 10px 8px; text-align: center;
    cursor: pointer; transition: border-color 0.2s, background 0.2s;
    color: var(--text);
  }
  .mode-btn:hover { border-color: var(--purple); background: rgba(139,92,246,0.1); }
  .mode-btn.active { border-color: var(--purple); background: rgba(139,92,246,0.18); }
  .mode-btn .mb-icon { font-size: 20px; }
  .mode-btn .mb-num  { font-size: 9px; color: var(--text2); }
  .mode-btn .mb-name { font-size: 11px; font-weight: 800; margin-top: 2px; }
  .modal-note { font-size: 10px; color: var(--text2); margin-top: 8px; font-style: italic; }

  @media (max-width: 480px) {
    .top-row { grid-template-columns: 1fr 1fr; }
    .top-auto { grid-column: 1 / 3; }
    .bottom-row { grid-template-columns: 1fr 1fr; }
    .tc-value { font-size: 18px; }
  }
</style>

<ha-card>
<div class="wrap">

  ${this.config.show_header ? `<div class="header"><ha-icon icon="mdi:solar-power-variant"></ha-icon><span>${this.config.title}</span></div>` : ''}

  <!-- TOP ROW -->
  <div class="top-row">

    <!-- PV -->
    <div class="top-card top-pv" data-entity="${e.pv_power}">
      <div class="tc-icon">☀️</div>
      <div class="tc-label">Solaire / PV</div>
      <div class="tc-value" style="color:var(--solar)">${this._fmt(pv)}</div>
      <div class="tc-sub">PV1 ${this._fmt(pv1)} · PV2 ${this._fmt(pv2)}</div>
      <div class="tc-sub">PV3 ${this._fmt(pv3)} · PV4 ${this._fmt(pv4)}</div>
    </div>

    <!-- Production journalière -->
    <div class="top-card top-jour" data-entity="${e.pv_daily_energy || e.pv_power}">
      <div class="tc-icon">📅</div>
      <div class="tc-label">Production journalière</div>
      <div class="tc-value" style="color:var(--teal)">${e.pv_daily_energy ? this._fmtKwh(pvDaily) : '—'}</div>
      <div class="tc-sub">${e.pv_daily_energy ? 'aujourd\'hui' : 'entité non configurée'}</div>
    </div>

    <!-- Autosuffisance -->
    <div class="top-card top-auto">
      <div class="tc-label">Autosuffisance</div>
      <div class="gauge-wrap">
        <svg viewBox="0 0 72 72" width="72" height="72">
          <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="6"/>
          <circle cx="${CX}" cy="${CY}" r="${R}" fill="none"
            stroke="${gaugeColor}" stroke-width="6"
            stroke-dasharray="${dash} ${circ}"
            stroke-dashoffset="${circ * 0.25}"
            stroke-linecap="round"
            transform="rotate(-90 ${CX} ${CY})"/>
        </svg>
        <div class="gauge-center" style="color:${gaugeColor}">
          ${gaugeVal}%<small>aujourd'hui</small>
        </div>
      </div>
    </div>

  </div>

  <!-- MAIN GRID -->
  <div class="main" id="main-grid">

    <!-- SolarVault -->
    <div class="node node-sv" data-entity="${e.battery_soc}">
      <div class="soc-bar" style="height:${soc}%;background:${socFill};"></div>
      <div class="label">${this.config.battery_name}</div>
      <div class="icon">🔋</div>
      <div class="value" style="color:var(--teal)">${batLabel}</div>
      <div class="sub" style="color:${batColor};font-weight:800">${batDir}</div>
      <div class="value" style="font-size:15px;color:${socColor}">${Math.round(soc)}%</div>
      ${e.battery_temperature ? `<div class="sub" style="color:#f90">🌡 ${batTemp.toFixed(1)}°C</div>` : ''}
    </div>

    <!-- Centre Énergie -->
    <div class="node node-ce" data-entity="${e.solarvault_ac_output}">
      <div class="icon">⚡</div>
      <div class="label">Centre Énergie</div>
      <div class="value" style="color:var(--purple)">${this._fmt(acOut + gridImp)}</div>
      <div class="sub" style="color:var(--teal);font-size:13px;font-weight:800">SolarVault ${this._fmt(acOut)}</div>
      <div class="sub" style="color:var(--blue);font-size:13px;font-weight:800">Réseau ${this._fmt(gridImp)}</div>
    </div>

    <!-- Réseau EDF -->
    <div class="node node-re">
      <div class="icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <line x1="12" y1="2" x2="12" y2="22" stroke="#378ADD" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="5" y1="7" x2="19" y2="7" stroke="#378ADD" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="7" y1="12" x2="17" y2="12" stroke="#378ADD" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="5" y1="7" x2="12" y2="2" stroke="#378ADD" stroke-width="1.4" stroke-linecap="round"/>
          <line x1="19" y1="7" x2="12" y2="2" stroke="#378ADD" stroke-width="1.4" stroke-linecap="round"/>
          <line x1="7" y1="12" x2="12" y2="7" stroke="#378ADD" stroke-width="1.2" stroke-linecap="round"/>
          <line x1="17" y1="12" x2="12" y2="7" stroke="#378ADD" stroke-width="1.2" stroke-linecap="round"/>
          <line x1="12" y1="22" x2="9" y2="22" stroke="#378ADD" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="12" y1="22" x2="15" y2="22" stroke="#378ADD" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="label" style="font-size:11px">Réseau EDF</div>
      <div class="value" style="font-size:14px;color:${gridColor}">${gridImportActive ? this._fmt(gridImp) : gridExportActive ? this._fmt(gridExp) : '0 W'}</div>
      <div class="sub" style="color:${gridColor};font-weight:700">${gridImportActive ? '↓ import' : gridExportActive ? '↑ export' : 'stable'}</div>
    </div>

    <!-- Bandeau Maison + EPS -->
    <div class="node node-band">
      <div class="eps-badge" data-entity="${e.backup_output_power}">
        <div class="label">EPS</div>
        <div class="value">${this._fmt(eps)}</div>
        <div style="font-size:9px;color:#888">secours</div>
      </div>
      <div class="maison-info">
        <div class="label">Maison — Charges domestiques</div>
        <div class="value">${this._fmt(maison)}</div>
        <div style="font-size:10px;color:var(--text2)">alimentation consolidée</div>
      </div>
    </div>

    <!-- SVG flux -->
    <svg class="connectors" id="flow-svg" viewBox="0 0 1 1"></svg>
  </div>

  <!-- BOTTOM ROW -->
  <div class="bottom-row">

    <div class="bot-card">
      <div class="b-label">Conso. totale maison</div>
      <div class="b-value" style="color:var(--text)">${this._fmt(maison)}</div>
    </div>

    <div class="bot-card">
      <div class="b-label">Efficacité</div>
      <div class="b-value" style="color:var(--solar)">${efficacite}%</div>
    </div>

    <div class="bot-card">
      <div class="b-label">Mode de fonctionnement</div>
      <div class="mode-select" id="mode-btn">
        <span>${mode.icon}</span>
        <span style="font-size:13px">${mode.label}</span>
        <span class="mode-arrow">▼</span>
      </div>
    </div>

    <div class="bot-card">
      <div class="b-label">Réglages</div>
      <span class="settings-btn" id="settings-btn">⚙️</span>
    </div>

  </div>

</div>

<!-- MODAL RÉGLAGES / MODE -->
<div class="modal-overlay" id="modal">
  <div class="modal">
    <button class="modal-close" id="modal-close">✕</button>
    <h3>⚙️ Réglages SolarVault</h3>

    <div class="modal-section">
      <label>Mode de fonctionnement</label>
      <div class="mode-grid">
        <div class="mode-btn ${mode.num === 13 ? 'active' : ''}" data-mode="tariff">
          <div class="mb-icon">⟳</div>
          <div class="mb-num">Mode 13</div>
          <div class="mb-name">Tarifaire</div>
        </div>
        <div class="mode-btn ${mode.num === 14 ? 'active' : ''}" data-mode="custom">
          <div class="mb-icon">⏱</div>
          <div class="mb-num">Mode 14</div>
          <div class="mb-name">Personnalisé</div>
        </div>
        <div class="mode-btn ${mode.num === 15 ? 'active' : ''}" data-mode="self_consumption">
          <div class="mb-icon">⌂</div>
          <div class="mb-num">Mode 15</div>
          <div class="mb-name">Autoconso</div>
        </div>
        <div class="mode-btn ${mode.num === 16 ? 'active' : ''}" data-mode="ai">
          <div class="mb-icon">🤖</div>
          <div class="mb-num">Mode 16</div>
          <div class="mb-name">Mode IA</div>
        </div>
      </div>
      <div class="modal-note">⚠️ Contrôle HA non disponible — pilotage depuis l'app Jackery</div>
    </div>

    <div class="modal-section">
      <label>Batterie — ${this.config.battery_name}</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:var(--text2)">SOC actuel</div>
          <div style="font-size:20px;font-weight:900;color:${socColor}">${Math.round(soc)}%</div>
          <div style="font-size:10px;color:${batColor};font-weight:700">${batDir}</div>
        </div>
        ${e.battery_temperature ? `
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:var(--text2)">Température</div>
          <div style="font-size:20px;font-weight:900;color:#f90">${batTemp.toFixed(1)}°C</div>
        </div>` : ''}
        ${e.soc_charge_limit ? `
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:var(--text2)">Limite charge</div>
          <div style="font-size:20px;font-weight:900;color:var(--green)">${Math.round(socCharLim)}%</div>
        </div>` : ''}
        ${e.soc_discharge_limit ? `
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:var(--text2)">Limite décharge</div>
          <div style="font-size:20px;font-weight:900;color:var(--blue)">${Math.round(socDisLim)}%</div>
        </div>` : ''}
      </div>
      <div style="font-size:10px;color:var(--text2);margin-top:8px">MPPT · Batterie · ATS</div>
    </div>

  </div>
</div>
</ha-card>`;

    requestAnimationFrame(() => this._drawFlows({ fPV, fAcOut, fAcIn, fGrid, fEps, fMaison, gridImportActive, gridExportActive }));
    this._bindEvents();
  }

  _drawFlows({ fPV, fAcOut, fAcIn, fGrid, fEps, fMaison, gridImportActive, gridExportActive }) {
    const grid = this.shadowRoot.getElementById('main-grid');
    const svg  = this.shadowRoot.getElementById('flow-svg');
    if (!grid || !svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const gRect = grid.getBoundingClientRect();
    const W = gRect.width, H = gRect.height;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);

    const rel = el => {
      const r = el.getBoundingClientRect();
      return { l: r.left-gRect.left, r: r.right-gRect.left, t: r.top-gRect.top, b: r.bottom-gRect.top,
               cx: r.left-gRect.left+r.width/2, cy: r.top-gRect.top+r.height/2 };
    };

    const nSV  = rel(this.shadowRoot.querySelector('.node-sv'));
    const nCE  = rel(this.shadowRoot.querySelector('.node-ce'));
    const nRE  = rel(this.shadowRoot.querySelector('.node-re'));
    const nBand= rel(this.shadowRoot.querySelector('.node-band'));
    const nEPS = rel(this.shadowRoot.querySelector('.eps-badge'));

    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
    [['arSolar','#ffb300'],['arTeal','#00c9a7'],['arBlue','#378ADD'],['arEps','#c0392b'],['arGray','#4a4a52']].forEach(([id,color]) => {
      const m = document.createElementNS('http://www.w3.org/2000/svg','marker');
      m.setAttribute('id',id); m.setAttribute('viewBox','0 0 10 10');
      m.setAttribute('refX','8'); m.setAttribute('refY','5');
      m.setAttribute('markerWidth','5'); m.setAttribute('markerHeight','5');
      m.setAttribute('orient','auto-start-reverse');
      const p = document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d','M2 1L8 5L2 9'); p.setAttribute('fill','none');
      p.setAttribute('stroke',color); p.setAttribute('stroke-width','1.8'); p.setAttribute('stroke-linecap','round');
      m.appendChild(p); defs.appendChild(m);
    });
    svg.appendChild(defs);

    const line = (x1,y1,x2,y2,cls,arrow) => {
      const l = document.createElementNS('http://www.w3.org/2000/svg','line');
      l.setAttribute('x1',x1); l.setAttribute('y1',y1); l.setAttribute('x2',x2); l.setAttribute('y2',y2);
      l.setAttribute('class',`flow ${cls}`);
      if (arrow) l.setAttribute('marker-end',`url(#${arrow})`);
      svg.appendChild(l);
    };

    // PV → SolarVault : on simule depuis le haut de la carte (top-row PV)
    // On trace depuis le haut du nœud SV vers le bas de la top-row (juste une flèche verticale entrant en haut)
    line(nSV.cx, nSV.t - 30, nSV.cx, nSV.t, `pv-color ${fPV}`, 'arSolar');

    // SolarVault ↔ Centre Énergie
    line(nSV.r, nSV.cy - 6, nCE.l, nCE.cy - 6, `teal-color ${fAcOut}`, 'arTeal');
    line(nCE.l, nCE.cy + 6, nSV.r, nSV.cy + 6, `teal-color ${fAcIn}`, 'arTeal');

    // Centre Énergie ↔ Réseau EDF
    if (gridExportActive) line(nCE.r, nCE.cy - 6, nRE.l, nRE.cy - 6, `blue-color ${fGrid}`, 'arBlue');
    if (gridImportActive) line(nRE.l, nRE.cy + 6, nCE.r, nCE.cy + 6, `blue-color ${fGrid}`, 'arBlue');
    if (!gridImportActive && !gridExportActive) line(nCE.r, nCE.cy, nRE.l, nRE.cy, 'blue-color idle', 'arBlue');

    // SolarVault → EPS
    line(nSV.cx, nSV.b, nEPS.cx, nBand.t, `eps-color ${fEps}`, 'arEps');

    // Centre Énergie → Maison
    line(nCE.cx, nCE.b, nCE.cx, nBand.t, `gray-color ${fMaison}`, 'arGray');
  }

  _bindEvents() {
    // Clics entités
    this.shadowRoot.querySelectorAll('[data-entity]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.stopPropagation();
        const entityId = el.dataset.entity;
        if (!entityId || !this._hass) return;
        this.dispatchEvent(new CustomEvent('hass-more-info', { bubbles:true, composed:true, detail:{ entityId } }));
      });
    });

    // Ouvrir modal (mode + réglages)
    const modal = this.shadowRoot.getElementById('modal');
    const openModal = () => modal && modal.classList.add('open');
    const closeModal = () => modal && modal.classList.remove('open');

    const modeBtn = this.shadowRoot.getElementById('mode-btn');
    const settBtn = this.shadowRoot.getElementById('settings-btn');
    const closeBtn = this.shadowRoot.getElementById('modal-close');

    if (modeBtn) modeBtn.addEventListener('click', openModal);
    if (settBtn) settBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', ev => { if (ev.target === modal) closeModal(); });
  }
}

if (!customElements.get('solargenflow-card')) customElements.define('solargenflow-card', SolarGenflowCardV2);
window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === 'solargenflow-card')) {
  window.customCards.push({ type:'solargenflow-card', name:'SolarGenflow Card V2', description:'Carte énergétique SolarGenflow' });
}
