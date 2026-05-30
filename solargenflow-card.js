class SolarGenflowCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._animFrame = null;
    this._particles = [];
  }

  static getConfigElement() {
    return document.createElement('solargenflow-card-editor');
  }

  static getStubConfig() {
    return {
      pv_power: 'sensor.solargenflow_pv_power',
      home_load: 'sensor.solargenflow_home_load',
      battery_soc: 'sensor.solargenflow_battery_soc',
      battery_charge: 'sensor.solargenflow_battery_charge_power',
      battery_discharge: 'sensor.solargenflow_battery_discharge_power',
      grid_import: 'sensor.solargenflow_grid_import_power',
      grid_export: 'sensor.solargenflow_grid_export_power',
      backup_power: 'sensor.solargenflow_backup_output_power',
      solarvault_output: 'sensor.solargenflow_solarvault_ac_output',
      solarvault_input: 'sensor.solargenflow_solarvault_ac_input',
    };
  }

  setConfig(config) {
    this._config = { ...SolarGenflowCard.getStubConfig(), ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateValues();
  }

  _getState(entity_id) {
    if (!this._hass || !entity_id) return 0;
    const state = this._hass.states[entity_id];
    if (!state || state.state === 'unavailable' || state.state === 'unknown') return 0;
    return parseFloat(state.state) || 0;
  }

  _fmt(val, unit = 'W') {
    if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(2).replace('.', ',')} k${unit}`;
    return `${Math.round(val)} ${unit}`;
  }

  _pct(val, total) {
    if (!total) return 0;
    return Math.min(100, Math.round((val / total) * 100));
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

        :host {
          display: block;
          --sgf-solar: #f5a623;
          --sgf-grid: #4fc3f7;
          --sgf-battery: #26c6a0;
          --sgf-home: #7c8cf8;
          --sgf-backup: #c4e040;
          --sgf-flux-grid-bat: #ab47bc;
          --sgf-bg: #0d1117;
          --sgf-bg2: #161b22;
          --sgf-bg3: #21262d;
          --sgf-border: rgba(255,255,255,0.08);
          --sgf-text: #e6edf3;
          --sgf-text2: #8b949e;
          font-family: 'Exo 2', sans-serif;
        }

        .card {
          background: var(--sgf-bg);
          border-radius: 20px;
          padding: 20px;
          color: var(--sgf-text);
          overflow: hidden;
          position: relative;
          border: 1px solid var(--sgf-border);
        }

        /* ─── Header ─── */
        .header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .header-title { flex: 1; }
        .header-title h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.3px;
          background: linear-gradient(135deg, #fff 0%, var(--sgf-solar) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .header-title p {
          margin: 2px 0 0;
          font-size: 12px;
          color: var(--sgf-text2);
        }
        .status-badge {
          background: rgba(38,198,160,0.15);
          border: 1px solid rgba(38,198,160,0.4);
          color: #26c6a0;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 20px;
          letter-spacing: 0.5px;
        }

        /* ─── KPI bar ─── */
        .kpi-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }
        .kpi {
          background: var(--sgf-bg2);
          border: 1px solid var(--sgf-border);
          border-radius: 12px;
          padding: 10px 12px;
          text-align: center;
        }
        .kpi-icon { font-size: 16px; margin-bottom: 4px; }
        .kpi-label { font-size: 10px; color: var(--sgf-text2); text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-value { font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 600; margin-top: 2px; }

        /* ─── Flow diagram ─── */
        .flow-container {
          position: relative;
          width: 100%;
          margin-bottom: 18px;
        }
        .flow-svg {
          width: 100%;
          height: auto;
          display: block;
        }

        /* ─── Node circles ─── */
        .node-label {
          font-size: 11px;
          fill: var(--sgf-text2);
          text-anchor: middle;
          font-family: 'Exo 2', sans-serif;
        }
        .node-value {
          font-size: 14px;
          font-weight: 700;
          text-anchor: middle;
          font-family: 'JetBrains Mono', monospace;
        }
        .node-sub {
          font-size: 10px;
          text-anchor: middle;
          font-family: 'JetBrains Mono', monospace;
        }

        /* ─── Flow paths animation ─── */
        @keyframes flow-solar { to { stroke-dashoffset: -40; } }
        @keyframes flow-grid-in { to { stroke-dashoffset: -40; } }
        @keyframes flow-grid-out { to { stroke-dashoffset: 40; } }
        @keyframes flow-bat-charge { to { stroke-dashoffset: -40; } }
        @keyndef flow-bat-discharge { to { stroke-dashoffset: 40; } }
        @keyframes flow-bat-discharge { to { stroke-dashoffset: 40; } }
        @keyframes flow-home { to { stroke-dashoffset: -40; } }
        @keyframes pulse-node { 0%,100%{opacity:1} 50%{opacity:0.6} }

        .flow-path {
          fill: none;
          stroke-width: 3;
          stroke-linecap: round;
        }
        .flow-animated {
          stroke-dasharray: 8 6;
          animation: flow-solar 0.8s linear infinite;
        }
        .flow-active { opacity: 1; }
        .flow-inactive { opacity: 0.12; }

        /* ─── Bottom panels ─── */
        .panels {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 500px) { .panels { grid-template-columns: 1fr; } .kpi-bar { grid-template-columns: repeat(2,1fr); } }

        .panel {
          background: var(--sgf-bg2);
          border: 1px solid var(--sgf-border);
          border-radius: 14px;
          padding: 14px;
        }
        .panel-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--sgf-text);
          margin-bottom: 12px;
          letter-spacing: 0.2px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 0;
          border-bottom: 1px solid var(--sgf-border);
          font-size: 12px;
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-icon { font-size: 14px; width: 20px; text-align: center; }
        .detail-label { flex: 1; color: var(--sgf-text2); }
        .detail-value { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 12px; }

        .repartition-row { margin-bottom: 12px; }
        .rep-header { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; }
        .rep-label { color: var(--sgf-text2); }
        .rep-value { font-family: 'JetBrains Mono', monospace; font-weight: 600; }
        .rep-bar-bg { background: var(--sgf-bg3); border-radius: 4px; height: 5px; overflow: hidden; }
        .rep-bar-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }

        .sysinfo-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          font-size: 12px;
          border-bottom: 1px solid var(--sgf-border);
        }
        .sysinfo-row:last-child { border-bottom: none; }
        .sysinfo-label { color: var(--sgf-text2); }
        .sysinfo-value { font-weight: 600; }
        .status-normal { color: #26c6a0; }

        .footer-note {
          text-align: center;
          font-size: 10px;
          color: var(--sgf-text2);
          margin-top: 14px;
          opacity: 0.6;
        }

        /* ─── Legend ─── */
        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
          margin-bottom: 14px;
        }
        .legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--sgf-text2); }
        .legend-line { width: 24px; height: 3px; border-radius: 2px; }
        .legend-dashed { background: repeating-linear-gradient(90deg,var(--sgf-backup) 0,var(--sgf-backup) 5px,transparent 5px,transparent 9px); height: 2px; }
      </style>

      <div class="card">
        <div class="header">
          <div style="font-size:28px">☀️</div>
          <div class="header-title">
            <h2>SolarGenflow</h2>
            <p>Vue d'ensemble énergétique</p>
          </div>
          <div class="status-badge" id="status-badge">En ligne</div>
        </div>

        <div class="kpi-bar">
          <div class="kpi">
            <div class="kpi-icon">☀️</div>
            <div class="kpi-label">Production solaire</div>
            <div class="kpi-value" id="kpi-pv" style="color:var(--sgf-solar)">—</div>
          </div>
          <div class="kpi">
            <div class="kpi-icon">🏠</div>
            <div class="kpi-label">Consommation maison</div>
            <div class="kpi-value" id="kpi-home" style="color:var(--sgf-home)">—</div>
          </div>
          <div class="kpi">
            <div class="kpi-icon">🔋</div>
            <div class="kpi-label">SOC batterie</div>
            <div class="kpi-value" id="kpi-soc" style="color:var(--sgf-battery)">—</div>
          </div>
          <div class="kpi">
            <div class="kpi-icon">⚡</div>
            <div class="kpi-label">Auto-conso</div>
            <div class="kpi-value" id="kpi-autoconso" style="color:var(--sgf-solar)">—</div>
          </div>
        </div>

        <!-- SVG Flow Diagram -->
        <div class="flow-container">
          <svg class="flow-svg" viewBox="0 0 500 320" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <!-- Glows -->
              <filter id="glow-solar"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="glow-grid"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="glow-battery"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <filter id="glow-home"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>

            <!-- ── Paths ── -->
            <!-- Solar → center -->
            <path id="path-solar-center" class="flow-path" d="M 250 80 L 250 160" stroke="var(--sgf-solar)"/>
            <!-- Center → Home -->
            <path id="path-center-home" class="flow-path" d="M 310 190 Q 360 190 390 210" stroke="var(--sgf-home)"/>
            <!-- Solar → Home direct -->
            <path id="path-solar-home" class="flow-path" d="M 295 100 Q 370 120 390 185" stroke="var(--sgf-solar)"/>
            <!-- Grid → Center -->
            <path id="path-grid-in" class="flow-path" d="M 160 210 L 230 190" stroke="var(--sgf-grid)"/>
            <!-- Center → Grid (export) -->
            <path id="path-grid-out" class="flow-path" d="M 230 195 L 160 215" stroke="var(--sgf-solar)"/>
            <!-- Battery charge -->
            <path id="path-bat-charge" class="flow-path" d="M 250 215 L 250 265" stroke="var(--sgf-battery)"/>
            <!-- Battery discharge -->
            <path id="path-bat-discharge" class="flow-path" d="M 255 265 L 255 215" stroke="var(--sgf-battery)"/>
            <!-- Grid ↔ Battery -->
            <path id="path-grid-bat" class="flow-path" d="M 155 230 Q 200 280 245 278" stroke="var(--sgf-flux-grid-bat)" stroke-dasharray="6 4"/>
            <!-- EPS → Home -->
            <path id="path-eps-home" class="flow-path" d="M 390 120 L 390 180" stroke="var(--sgf-backup)" stroke-dasharray="6 4"/>

            <!-- ── Nodes ── -->
            <!-- Solar node -->
            <circle cx="250" cy="65" r="45" fill="var(--sgf-bg2)" stroke="var(--sgf-solar)" stroke-width="2.5" filter="url(#glow-solar)"/>
            <circle cx="250" cy="65" r="38" fill="rgba(245,166,35,0.08)"/>
            <text x="250" y="52" class="node-label" fill="var(--sgf-solar)">Solaire</text>
            <text x="250" y="67" style="font-size:18px;text-anchor:middle">🔆⚡</text>
            <text id="node-pv" x="250" y="84" class="node-value" fill="var(--sgf-solar)">—</text>

            <!-- Grid node -->
            <circle cx="120" cy="220" r="38" fill="var(--sgf-bg2)" stroke="var(--sgf-grid)" stroke-width="2" filter="url(#glow-grid)"/>
            <circle cx="120" cy="220" r="30" fill="rgba(79,195,247,0.08)"/>
            <text x="120" y="207" class="node-label" fill="var(--sgf-grid)">Réseau</text>
            <text style="font-size:15px;text-anchor:middle" x="120" y="222">🏗️</text>
            <text id="node-grid-in" x="120" y="234" class="node-sub" fill="var(--sgf-grid)">← 0 W</text>
            <text id="node-grid-out" x="120" y="245" class="node-sub" fill="var(--sgf-solar)">→ 0 W</text>
            <text x="120" y="268" class="node-label">Réseau</text>

            <!-- Battery node -->
            <circle cx="250" cy="285" r="38" fill="var(--sgf-bg2)" stroke="var(--sgf-battery)" stroke-width="2" filter="url(#glow-battery)"/>
            <circle cx="250" cy="285" r="30" fill="rgba(38,198,160,0.08)"/>
            <text id="node-soc" x="250" y="277" class="node-value" fill="var(--sgf-battery)" style="font-size:12px">—</text>
            <text style="font-size:15px;text-anchor:middle" x="250" y="292">🔋</text>
            <text id="node-charge" x="250" y="305" class="node-sub" fill="#e57373">↓ 0 W</text>
            <text id="node-discharge" x="250" y="316" class="node-sub" fill="#26c6a0">↑ 0 W</text>

            <!-- Home node -->
            <circle cx="395" cy="210" r="48" fill="var(--sgf-bg2)" stroke="var(--sgf-home)" stroke-width="2.5" filter="url(#glow-home)"/>
            <circle cx="395" cy="210" r="40" fill="rgba(124,140,248,0.08)"/>
            <text id="node-home" x="395" y="203" class="node-value" fill="var(--sgf-home)" style="font-size:16px">—</text>
            <text style="font-size:20px;text-anchor:middle" x="395" y="220">🏠</text>
            <text x="395" y="270" class="node-label">Maison</text>

            <!-- EPS node -->
            <circle cx="395" cy="90" r="35" fill="var(--sgf-bg2)" stroke="var(--sgf-backup)" stroke-width="1.5" stroke-dasharray="5 3"/>
            <circle cx="395" cy="90" r="27" fill="rgba(196,224,64,0.06)"/>
            <text x="395" y="78" class="node-label" fill="var(--sgf-backup)">EPS / Secours</text>
            <text style="font-size:14px;text-anchor:middle" x="395" y="92">🔌</text>
            <text id="node-eps" x="395" y="107" class="node-sub" fill="var(--sgf-backup)">0 W</text>
          </svg>
        </div>

        <!-- Legend -->
        <div class="legend">
          <div class="legend-item"><div class="legend-line" style="background:var(--sgf-solar)"></div>Énergie solaire</div>
          <div class="legend-item"><div class="legend-line" style="background:var(--sgf-grid)"></div>Réseau</div>
          <div class="legend-item"><div class="legend-line" style="background:var(--sgf-battery)"></div>Batterie</div>
          <div class="legend-item"><div class="legend-line" style="background:var(--sgf-flux-grid-bat)"></div>Flux réseau ↔ batterie</div>
          <div class="legend-item"><div class="legend-line legend-dashed"></div>EPS (secours)</div>
        </div>

        <div class="panels">
          <!-- Détails -->
          <div class="panel">
            <div class="panel-title">Détails SolarGenflow</div>
            <div class="detail-row"><span class="detail-icon">🔆</span><span class="detail-label">Production solaire (PV)</span><span class="detail-value" id="det-pv" style="color:var(--sgf-solar)">—</span></div>
            <div class="detail-row"><span class="detail-icon">🏠</span><span class="detail-label">Sortie AC SolarVault (vers maison)</span><span class="detail-value" id="det-svout">—</span></div>
            <div class="detail-row"><span class="detail-icon">⬆️</span><span class="detail-label">Entrée AC SolarVault (depuis EDF)</span><span class="detail-value" id="det-svin">—</span></div>
            <div class="detail-row"><span class="detail-icon">🔋</span><span class="detail-label">Charge batterie</span><span class="detail-value" id="det-charge" style="color:var(--sgf-battery)">—</span></div>
            <div class="detail-row"><span class="detail-icon">⚡</span><span class="detail-label">Décharge batterie</span><span class="detail-value" id="det-discharge" style="color:#e57373">—</span></div>
            <div class="detail-row"><span class="detail-icon">🔋</span><span class="detail-label">État de charge (SOC)</span><span class="detail-value" id="det-soc" style="color:var(--sgf-battery)">—</span></div>
            <div class="detail-row"><span class="detail-icon">🏡</span><span class="detail-label">Consommation maison totale</span><span class="detail-value" id="det-home">—</span></div>
            <div class="detail-row"><span class="detail-icon">📥</span><span class="detail-label">Import réseau (EDF réel)</span><span class="detail-value" id="det-import" style="color:var(--sgf-grid)">—</span></div>
            <div class="detail-row"><span class="detail-icon">📤</span><span class="detail-label">Export réseau (EDF réel)</span><span class="detail-value" id="det-export" style="color:var(--sgf-solar)">—</span></div>
          </div>

          <div style="display:flex;flex-direction:column;gap:12px;">
            <!-- Répartition -->
            <div class="panel">
              <div class="panel-title">Répartition de l'énergie</div>
              <div class="repartition-row">
                <div class="rep-header"><span class="rep-label">☀️ Auto-consommation solaire</span><span class="rep-value" id="rep-autoconso" style="color:var(--sgf-solar)">—</span></div>
                <div class="rep-bar-bg"><div class="rep-bar-fill" id="bar-autoconso" style="background:var(--sgf-solar);width:0%"></div></div>
              </div>
              <div style="font-size:11px;color:var(--sgf-text2);padding:4px 0 8px 0;border-bottom:1px solid var(--sgf-border);">
                <div style="display:flex;justify-content:space-between;padding:2px 0"><span>Solaire ↔ Maison</span><span id="rep-sv-home" style="font-family:'JetBrains Mono',monospace">—</span></div>
                <div style="display:flex;justify-content:space-between;padding:2px 0"><span>Solaire ↔ Batterie</span><span id="rep-sv-bat" style="font-family:'JetBrains Mono',monospace">—</span></div>
                <div style="display:flex;justify-content:space-between;padding:2px 0"><span>Solaire ↔ Réseau</span><span id="rep-sv-grid" style="font-family:'JetBrains Mono',monospace">—</span></div>
              </div>
              <div class="repartition-row" style="margin-top:8px">
                <div class="rep-header"><span class="rep-label">🏗️ Dépendance réseau</span><span class="rep-value" id="rep-grid-dep" style="color:var(--sgf-grid)">—</span></div>
                <div class="rep-bar-bg"><div class="rep-bar-fill" id="bar-grid-dep" style="background:var(--sgf-grid);width:0%"></div></div>
              </div>
            </div>

            <!-- Infos système -->
            <div class="panel">
              <div class="panel-title">Informations système</div>
              <div class="sysinfo-row"><span class="sysinfo-label">Mode de fonctionnement</span><span class="sysinfo-value">Smart</span></div>
              <div class="sysinfo-row"><span class="sysinfo-label">Statut SolarVault</span><span class="sysinfo-value status-normal">Normal</span></div>
              <div class="sysinfo-row"><span class="sysinfo-label">Dernière mise à jour</span><span class="sysinfo-value" id="last-update">—</span></div>
              <div class="sysinfo-row"><span class="sysinfo-label">Intégration</span><span class="sysinfo-value">SolarGenflow v0.2.1</span></div>
            </div>
          </div>
        </div>

        <div class="footer-note">Les valeurs sont des puissances instantanées en temps réel (W) ℹ️</div>
      </div>
    `;
    this._updateValues();
  }

  _updateValues() {
    const root = this.shadowRoot;
    if (!root || !this._hass) return;

    const pv       = this._getState(this._config.pv_power);
    const home     = this._getState(this._config.home_load);
    const soc      = this._getState(this._config.battery_soc);
    const charge   = this._getState(this._config.battery_charge);
    const discharge= this._getState(this._config.battery_discharge);
    const gridIn   = this._getState(this._config.grid_import);
    const gridOut  = this._getState(this._config.grid_export);
    const backup   = this._getState(this._config.backup_power);
    const svOut    = this._getState(this._config.solarvault_output);
    const svIn     = this._getState(this._config.solarvault_input);

    // Auto-conso = portion PV utilisée localement
    const pvUsed   = Math.max(0, pv - gridOut);
    const autoConso= pv > 0 ? this._pct(pvUsed, pv) : 0;
    const gridDep  = home > 0 ? this._pct(gridIn, home) : 0;

    // ─ KPI ─
    this._setText('kpi-pv', this._fmt(pv));
    this._setText('kpi-home', this._fmt(home));
    this._setText('kpi-soc', `${Math.round(soc)} %`);
    this._setText('kpi-autoconso', `${autoConso} %`);

    // ─ Nodes SVG ─
    this._setText('node-pv', this._fmt(pv));
    this._setText('node-home', this._fmt(home));
    this._setText('node-soc', `${Math.round(soc)} %`);
    this._setText('node-charge', `↓ ${this._fmt(charge)}`);
    this._setText('node-discharge', `↑ ${this._fmt(discharge)}`);
    this._setText('node-grid-in', `← ${this._fmt(gridIn)}`);
    this._setText('node-grid-out', `→ ${this._fmt(gridOut)}`);
    this._setText('node-eps', this._fmt(backup));

    // ─ Détails ─
    this._setText('det-pv', this._fmt(pv));
    this._setText('det-svout', this._fmt(svOut));
    this._setText('det-svin', this._fmt(svIn));
    this._setText('det-charge', this._fmt(charge));
    this._setText('det-discharge', this._fmt(discharge));
    this._setText('det-soc', `${Math.round(soc)} %`);
    this._setText('det-home', this._fmt(home));
    this._setText('det-import', this._fmt(gridIn));
    this._setText('det-export', this._fmt(gridOut));

    // ─ Répartition ─
    this._setText('rep-autoconso', `${autoConso} %`);
    this._setText('rep-sv-home', this._fmt(svOut));
    this._setText('rep-sv-bat', this._fmt(charge));
    this._setText('rep-sv-grid', this._fmt(gridOut));
    this._setText('rep-grid-dep', `${gridDep} %`);
    this._setWidth('bar-autoconso', autoConso);
    this._setWidth('bar-grid-dep', gridDep);

    // ─ Dernière MAJ ─
    this._setText('last-update', 'Il y a 2 s');

    // ─ Animations flux ─
    this._updateFlowAnimations({ pv, home, soc, charge, discharge, gridIn, gridOut, backup });
  }

  _setText(id, val) {
    const el = this.shadowRoot.getElementById(id);
    if (el) el.textContent = val;
  }

  _setWidth(id, pct) {
    const el = this.shadowRoot.getElementById(id);
    if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  _updateFlowAnimations({ pv, home, charge, discharge, gridIn, gridOut, backup }) {
    const setFlow = (id, active, reverse = false) => {
      const el = this.shadowRoot.getElementById(id);
      if (!el) return;
      el.classList.toggle('flow-active', active);
      el.classList.toggle('flow-inactive', !active);
      if (active) {
        el.classList.add('flow-animated');
        el.style.animationDirection = reverse ? 'reverse' : 'normal';
      } else {
        el.classList.remove('flow-animated');
      }
    };

    setFlow('path-solar-center', pv > 10);
    setFlow('path-solar-home', pv > 10 && home > 0);
    setFlow('path-center-home', home > 10);
    setFlow('path-grid-in', gridIn > 10);
    setFlow('path-grid-out', gridOut > 10);
    setFlow('path-bat-charge', charge > 10);
    setFlow('path-bat-discharge', discharge > 10, true);
    setFlow('path-grid-bat', gridIn > 10 || gridOut > 10);
    setFlow('path-eps-home', backup > 10);
  }

  connectedCallback() { this._render(); }
  disconnectedCallback() { if (this._animFrame) cancelAnimationFrame(this._animFrame); }

  getCardSize() { return 8; }
}

customElements.define('solargenflow-card', SolarGenflowCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'solargenflow-card',
  name: 'SolarGenflow Card',
  description: 'Vue d\'ensemble des flux énergétiques SolarGenflow',
  preview: true,
});
