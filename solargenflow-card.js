class SolarGenflowCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entities) {
      throw new Error("SolarGenflow Card: configuration 'entities' manquante.");
    }

    this.config = {
      title: "SolarGenflow",
      show_details: true,
      show_system: true,
      ...config,
    };

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 6;
  }

  _state(entityId) {
    if (!entityId || !this._hass || !this._hass.states[entityId]) return null;
    return this._hass.states[entityId];
  }

  _num(entityId) {
    const state = this._state(entityId);
    if (!state) return 0;

    const value = Number(String(state.state).replace(",", "."));
    return Number.isFinite(value) ? value : 0;
  }

  _fmtW(value) {
    const n = Number(value) || 0;

    if (Math.abs(n) >= 1000) {
      return `${(n / 1000).toLocaleString("fr-FR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} kW`;
    }

    return `${Math.round(n).toLocaleString("fr-FR")} W`;
  }

  _fmtPct(value) {
    return `${Math.round(Number(value) || 0)} %`;
  }

  render() {
    if (!this.shadowRoot || !this._hass || !this.config) return;

    const e = this.config.entities;

    const pv = this._num(e.pv_power);
    const acOut = this._num(e.solarvault_ac_output);
    const acIn = this._num(e.solarvault_ac_input);
    const batCharge = this._num(e.battery_charge);
    const batDischarge = this._num(e.battery_discharge);
    const soc = this._num(e.battery_soc);
    const home = this._num(e.home_load);
    const gridImport = this._num(e.grid_import);
    const gridExport = this._num(e.grid_export);
    const eps = this._num(e.backup_output);

    const autoConso =
      pv > 0
        ? Math.min(
            100,
            Math.round(((acOut + batDischarge) / Math.max(home, 1)) * 100)
          )
        : 0;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --bg: #111820;
          --panel: rgba(255,255,255,0.05);
          --border: rgba(255,255,255,0.1);

          --solar: #ff9800;
          --grid: #42a5f5;
          --battery: #40c4b8;
          --charge: #43d854;
          --discharge: #ff4f93;
          --eps: #d7d84e;

          --text: rgba(255,255,255,0.92);
          --muted: rgba(255,255,255,0.65);
        }

        ha-card {
          background:
            radial-gradient(circle at top left, rgba(255,152,0,0.08), transparent 30%),
            radial-gradient(circle at top right, rgba(66,165,245,0.08), transparent 30%),
            var(--bg);

          border-radius: 22px;
          overflow: hidden;
          border: 1px solid var(--border);
          color: var(--text);
        }

        .wrap {
          padding: 22px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
        }

        .title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 34px;
          font-weight: 800;
        }

        .title ha-icon {
          color: var(--solar);
          width: 36px;
          height: 36px;
        }

        .status {
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(67,216,84,0.15);
          color: #7dff88;
          font-size: 13px;
          font-weight: 700;
        }

        .kpis {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .kpi {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
        }

        .kpi-label {
          color: var(--muted);
          font-size: 13px;
          margin-bottom: 6px;
        }

        .kpi-value {
          font-size: 28px;
          font-weight: 800;
        }

        .flow {
          position: relative;
          height: 450px;
          margin-bottom: 24px;
        }

        svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .line {
          fill: none;
          stroke-width: 4;
          opacity: 0.85;
        }

        .solar-line { stroke: var(--solar); }
        .grid-line { stroke: var(--grid); }
        .battery-line { stroke: var(--battery); }
        .eps-line { stroke: var(--eps); }

        .node {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: rgba(17,24,32,0.95);
          border: 4px solid currentColor;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          transform: translate(-50%, -50%);
          text-align: center;
        }

        .node ha-icon {
          width: 34px;
          height: 34px;
          margin-bottom: 6px;
        }

        .node-title {
          position: absolute;
          top: -36px;
          color: var(--muted);
          font-size: 16px;
          font-weight: 600;
        }

        .node-value {
          font-size: 22px;
          font-weight: 800;
        }

        .solar {
          left: 50%;
          top: 14%;
          color: var(--solar);
        }

        .grid {
          left: 12%;
          top: 52%;
          color: var(--grid);
        }

        .home {
          left: 88%;
          top: 52%;
          color: var(--grid);
        }

        .battery {
          left: 50%;
          top: 86%;
          color: var(--battery);
        }

        .eps {
          left: 88%;
          top: 14%;
          color: var(--eps);
        }

        .battery-flow {
          margin-top: 6px;
          font-size: 14px;
          font-weight: 700;
        }

        .charge {
          color: var(--charge);
        }

        .discharge {
          color: var(--discharge);
        }

        .bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .panel {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 18px;
        }

        .panel h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .row:last-child {
          border-bottom: none;
        }

        .row-label {
          color: var(--muted);
        }

        .row-value {
          font-weight: 700;
        }

        .bar {
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          overflow: hidden;
          margin-top: 10px;
        }

        .bar-fill {
          height: 100%;
          background: var(--solar);
          border-radius: 999px;
        }

        @media (max-width: 800px) {
          .kpis {
            grid-template-columns: 1fr 1fr;
          }

          .bottom {
            grid-template-columns: 1fr;
          }

          .flow {
            height: 380px;
          }

          .node {
            width: 90px;
            height: 90px;
          }

          .node-value {
            font-size: 16px;
          }
        }
      </style>

      <ha-card>
        <div class="wrap">

          <div class="header">
            <div class="title">
              <ha-icon icon="mdi:white-balance-sunny"></ha-icon>
              SolarGenflow
            </div>

            <div class="status">
              Temps réel
            </div>
          </div>

          <div class="kpis">

            <div class="kpi">
              <div class="kpi-label">Production PV</div>
              <div class="kpi-value">${this._fmtW(pv)}</div>
            </div>

            <div class="kpi">
              <div class="kpi-label">Maison</div>
              <div class="kpi-value">${this._fmtW(home)}</div>
            </div>

            <div class="kpi">
              <div class="kpi-label">Batterie</div>
              <div class="kpi-value">${this._fmtPct(soc)}</div>
            </div>

            <div class="kpi">
              <div class="kpi-label">Auto-conso</div>
              <div class="kpi-value">${autoConso} %</div>
            </div>

          </div>

          <div class="flow">

            <svg viewBox="0 0 1000 450">

              <path
                class="line solar-line"
                d="M500,70 C540,170 700,230 880,235"
              />

              <path
                class="line grid-line"
                d="M120,235 C300,235 650,235 880,235"
              />

              <path
                class="line battery-line"
                d="M500,385 C620,300 720,260 880,260"
              />

              <path
                class="line eps-line"
                d="M880,70 C880,120 880,180 880,235"
              />

            </svg>

            <div class="node solar">
              <div class="node-title">Solaire</div>
              <ha-icon icon="mdi:solar-power"></ha-icon>
              <div class="node-value">${this._fmtW(pv)}</div>
            </div>

            <div class="node grid">
              <div class="node-title">Réseau</div>
              <ha-icon icon="mdi:transmission-tower"></ha-icon>
              <div class="node-value">
                ${this._fmtW(gridImport)}
              </div>
            </div>

            <div class="node home">
              <div class="node-title">Maison</div>
              <ha-icon icon="mdi:home"></ha-icon>
              <div class="node-value">
                ${this._fmtW(home)}
              </div>
            </div>

            <div class="node battery">
              <div class="node-title">Batterie</div>
              <ha-icon icon="mdi:battery"></ha-icon>

              <div class="battery-flow">
                <div class="charge">
                  ↓ ${this._fmtW(batCharge)}
                </div>

                <div class="discharge">
                  ↑ ${this._fmtW(batDischarge)}
                </div>
              </div>
            </div>

            <div class="node eps">
              <div class="node-title">EPS</div>
              <ha-icon icon="mdi:power-plug"></ha-icon>
              <div class="node-value">
                ${this._fmtW(eps)}
              </div>
            </div>

          </div>

          <div class="bottom">

            <div class="panel">

              <h3>Détails</h3>

              <div class="row">
                <div class="row-label">Sortie AC SolarVault</div>
                <div class="row-value">${this._fmtW(acOut)}</div>
              </div>

              <div class="row">
                <div class="row-label">Entrée AC SolarVault</div>
                <div class="row-value">${this._fmtW(acIn)}</div>
              </div>

              <div class="row">
                <div class="row-label">Import réseau</div>
                <div class="row-value">${this._fmtW(gridImport)}</div>
              </div>

              <div class="row">
                <div class="row-label">Export réseau</div>
                <div class="row-value">${this._fmtW(gridExport)}</div>
              </div>

              <div class="row">
                <div class="row-label">Charge batterie</div>
                <div class="row-value">${this._fmtW(batCharge)}</div>
              </div>

              <div class="row">
                <div class="row-label">Décharge batterie</div>
                <div class="row-value">${this._fmtW(batDischarge)}</div>
              </div>

            </div>

            <div class="panel">

              <h3>Auto-consommation</h3>

              <div style="font-size:32px;font-weight:800;">
                ${autoConso} %
              </div>

              <div class="bar">
                <div
                  class="bar-fill"
                  style="width:${autoConso}%;">
                </div>
              </div>

            </div>

          </div>

        </div>
      </ha-card>
    `;
  }
}

customElements.define("solargenflow-card", SolarGenflowCard);

window.customCards = window.customCards || [];

window.customCards.push({
  type: "solargenflow-card",
  name: "SolarGenflow Card",
  description: "Carte énergétique SolarGenflow",
});
