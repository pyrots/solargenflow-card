class SolarGenflowCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entities) {
      throw new Error("SolarGenflow Card : configuration 'entities' manquante.");
    }

    this.config = {
      title: "SolarGenflow",
      show_header: true,
      show_kpis: true,
      solarvault_name: "SolarVault 1",
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
    return 7;
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

  _fmtKwh(value) {
    const n = Number(value) || 0;

    return `${n.toLocaleString("fr-FR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} kWh`;
  }

  _fmtPct(value) {
    return `${Math.round(Number(value) || 0)} %`;
  }

  _flowClass(value) {
    return Math.abs(Number(value) || 0) > 5 ? "is-active" : "is-idle";
  }

  _signedPower(value) {
    const n = Number(value) || 0;

    if (n > 5) return `+ ${this._fmtW(n)}`;
    if (n < -5) return `- ${this._fmtW(Math.abs(n))}`;

    return this._fmtW(0);
  }

  _batteryMode(value) {
    const n = Number(value) || 0;

    if (n > 5) return "Charge";
    if (n < -5) return "Décharge";

    return "Repos";
  }

  _gridLabel(importPower, exportPower) {
    if (importPower > 5) return `Import ${this._fmtW(importPower)}`;
    if (exportPower > 5) return `Export ${this._fmtW(exportPower)}`;

    return this._fmtW(0);
  }

  render() {
    if (!this.shadowRoot || !this._hass || !this.config) return;

    const e = this.config.entities;

    const pv = this._num(e.pv_power);
    const pv1 = this._num(e.pv1_power);
    const pv2 = this._num(e.pv2_power);
    const pv3 = this._num(e.pv3_power);
    const pv4 = this._num(e.pv4_power);

    const soc = this._num(e.battery_soc);
    const batteryNet = this._num(e.battery_net_power);
    const batteryCharge = this._num(e.battery_charge_power ?? e.battery_charge);
    const batteryDischarge = this._num(e.battery_discharge_power ?? e.battery_discharge);

    const homePower = this._num(e.home_power);
    const domesticLoad = this._num(e.domestic_load_power);
    const homeLoadTotal = this._num(e.home_load_total ?? e.home_load);

    const gridImport = this._num(e.grid_import_power ?? e.grid_import);
    const gridExport = this._num(e.grid_export_power ?? e.grid_export);

    const backupOutput = this._num(e.backup_output_power ?? e.backup_output ?? e.backup_power);
    const solarvaultAcOutput = this._num(e.solarvault_ac_output ?? e.solarvault_output);
    const solarvaultAcInput = this._num(e.solarvault_ac_input ?? e.solarvault_input);
    const solarvaultAcPower = this._num(e.solarvault_ac_power);

    const solarEnergyToday = this._num(e.solar_energy_today ?? e.solar_energy_total);
    const consumptionToday = this._num(e.consumption_today ?? e.home_energy_today);

    const selfConsumption = pv > 5 ? Math.min(100, Math.max(0, Math.round((Math.min(pv, domesticLoad) / pv) * 100))) : 0;
    const efficiency = pv + gridImport > 5 ? Math.min(100, Math.max(0, Math.round((domesticLoad / Math.max(pv + gridImport, 1)) * 100))) : 0;

    const batteryMode = this._batteryMode(batteryNet);
    const batterySigned = this._signedPower(batteryNet);
    const gridLabel = this._gridLabel(gridImport, gridExport);

    const socClamped = Math.max(0, Math.min(100, soc));
    const flowToEnergyCenter = Math.max(homePower, solarvaultAcOutput, solarvaultAcPower, 0);
    const gridFlow = Math.max(gridImport, gridExport, 0);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --sgf-bg: #101318;
          --sgf-panel: rgba(255, 255, 255, 0.075);
          --sgf-panel-strong: rgba(255, 255, 255, 0.115);
          --sgf-border: rgba(255, 255, 255, 0.14);
          --sgf-text: rgba(255, 255, 255, 0.94);
          --sgf-muted: rgba(255, 255, 255, 0.62);
          --sgf-solar: #ffb300;
          --sgf-battery: #22c55e;
          --sgf-grid: #38bdf8;
          --sgf-house: #e5e7eb;
          --sgf-eps: #ef4444;
          --sgf-energy: #a78bfa;
        }

        ha-card {
          background:
            radial-gradient(circle at 20% 0%, rgba(255, 179, 0, 0.18), transparent 30%),
            radial-gradient(circle at 88% 16%, rgba(56, 189, 248, 0.16), transparent 28%),
            linear-gradient(135deg, #151922 0%, #0c0f14 100%);
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid var(--sgf-border);
          color: var(--sgf-text);
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.28);
        }

        .card {
          position: relative;
          padding: 18px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: clamp(18px, 2vw, 28px);
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .title ha-icon {
          color: var(--sgf-solar);
        }

        .status-pill {
          border-radius: 999px;
          padding: 7px 11px;
          color: rgba(255, 255, 255, 0.88);
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 12px;
          font-weight: 800;
        }

        .layout {
          position: relative;
          display: grid;
          grid-template-columns: 1.15fr 1fr 1.15fr;
          grid-template-rows: auto auto auto;
          grid-template-areas:
            ". pv ."
            "battery energy grid"
            "eps house house";
          gap: 22px 28px;
          align-items: stretch;
        }

        .node {
          position: relative;
          z-index: 2;
          border-radius: 20px;
          padding: 16px;
          background: linear-gradient(180deg, var(--sgf-panel-strong), var(--sgf-panel));
          border: 1px solid var(--sgf-border);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 12px 24px rgba(0, 0, 0, 0.18);
          min-height: 118px;
          backdrop-filter: blur(5px);
        }

        .node::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 20px;
          border-top: 4px solid var(--accent);
          pointer-events: none;
        }

        .node-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .node-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: clamp(14px, 1.25vw, 18px);
          font-weight: 900;
        }

        .node-title ha-icon {
          width: 22px;
          height: 22px;
          color: var(--accent);
        }

        .node-subtitle {
          color: var(--sgf-muted);
          font-size: 12px;
          font-weight: 700;
        }

        .value-main {
          font-size: clamp(24px, 2.8vw, 42px);
          font-weight: 950;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .value-small {
          color: var(--sgf-muted);
          font-size: 13px;
          font-weight: 800;
          margin-top: 6px;
        }

        .pv { grid-area: pv; --accent: var(--sgf-solar); }
        .battery { grid-area: battery; --accent: var(--sgf-battery); }
        .energy { grid-area: energy; --accent: var(--sgf-energy); }
        .grid { grid-area: grid; --accent: var(--sgf-grid); }
        .eps { grid-area: eps; --accent: var(--sgf-eps); }
        .house { grid-area: house; --accent: var(--sgf-house); }

        .mppt-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .mppt {
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          padding: 9px 8px;
          text-align: center;
        }

        .mppt span:first-child {
          display: block;
          color: var(--sgf-muted);
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 4px;
        }

        .mppt span:last-child {
          display: block;
          color: var(--sgf-text);
          font-size: 13px;
          font-weight: 950;
        }

        .battery-line {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }

        .battery-mode {
          border-radius: 999px;
          padding: 6px 10px;
          color: #ffffff;
          background: rgba(34, 197, 94, 0.18);
          border: 1px solid rgba(34, 197, 94, 0.35);
          font-size: 12px;
          font-weight: 900;
        }

        .soc-wrap {
          margin-top: 14px;
        }

        .soc-label {
          display: flex;
          justify-content: space-between;
          color: var(--sgf-muted);
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .soc-bar {
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          overflow: hidden;
        }

        .soc-fill {
          height: 100%;
          width: ${socClamped}%;
          border-radius: 999px;
          background: linear-gradient(90deg, #22c55e, #a3e635);
        }

        .metric-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
        }

        .metric {
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.07);
          padding: 9px;
        }

        .metric-label {
          color: var(--sgf-muted);
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .metric-value {
          font-size: 14px;
          font-weight: 950;
        }

        .grid-balance {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
        }

        .kpis {
          display: ${this.config.show_kpis ? "grid" : "none"};
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 16px;
        }

        .kpi {
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.075);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 12px;
        }

        .kpi-label {
          color: var(--sgf-muted);
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .kpi-value {
          font-size: clamp(16px, 1.6vw, 24px);
          font-weight: 950;
        }

        svg.flows {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
          overflow: visible;
        }

        .flow-line {
          fill: none;
          stroke-width: 5;
          stroke-linecap: round;
          stroke-dasharray: 8 12;
          opacity: 0.9;
        }

        .flow-line.is-idle {
          opacity: 0.12;
          animation: none;
        }

        .flow-line.is-active {
          animation: flowMove 1.05s linear infinite;
        }

        .flow-solar { stroke: var(--sgf-solar); filter: drop-shadow(0 0 4px rgba(255, 179, 0, 0.45)); }
        .flow-battery { stroke: var(--sgf-battery); filter: drop-shadow(0 0 4px rgba(34, 197, 94, 0.45)); }
        .flow-grid { stroke: var(--sgf-grid); filter: drop-shadow(0 0 4px rgba(56, 189, 248, 0.45)); }
        .flow-house { stroke: var(--sgf-house); filter: drop-shadow(0 0 4px rgba(229, 231, 235, 0.35)); }
        .flow-eps { stroke: var(--sgf-eps); filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.45)); }

        @keyframes flowMove {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -40; }
        }

        @media (max-width: 760px) {
          .layout {
            grid-template-columns: 1fr;
            grid-template-areas:
              "pv"
              "battery"
              "energy"
              "grid"
              "house"
              "eps";
            gap: 12px;
          }

          svg.flows {
            display: none;
          }

          .kpis {
            grid-template-columns: repeat(2, 1fr);
          }

          .card {
            padding: 14px;
          }
        }
      </style>

      <ha-card>
        <div class="card">
          ${
            this.config.show_header
              ? `
                <div class="header">
                  <div class="title">
                    <ha-icon icon="mdi:solar-power-variant"></ha-icon>
                    <span>${this.config.title}</span>
                  </div>
                  <div class="status-pill">Temps réel</div>
                </div>
              `
              : ""
          }

          <div class="layout">
            <svg class="flows" viewBox="0 0 1200 620" preserveAspectRatio="none">
              <path class="flow-line flow-solar ${this._flowClass(pv)}" d="M600 116 L600 220"></path>
              <path class="flow-line flow-battery ${this._flowClass(flowToEnergyCenter)}" d="M315 310 L520 310"></path>
              <path class="flow-line flow-grid ${this._flowClass(gridFlow)}" d="M880 310 L685 310"></path>
              <path class="flow-line flow-house ${this._flowClass(domesticLoad)}" d="M610 382 L610 505"></path>
              <path class="flow-line flow-eps ${this._flowClass(backupOutput)}" d="M270 386 L270 505"></path>
            </svg>

            <section class="node pv">
              <div class="node-header">
                <div class="node-title"><ha-icon icon="mdi:solar-panel-large"></ha-icon><span>Solaire / PV</span></div>
                <div class="node-subtitle">Production totale</div>
              </div>
              <div class="mppt-grid">
                <div class="mppt"><span>PV1</span><span>${this._fmtW(pv1)}</span></div>
                <div class="mppt"><span>PV2</span><span>${this._fmtW(pv2)}</span></div>
                <div class="mppt"><span>PV3</span><span>${this._fmtW(pv3)}</span></div>
                <div class="mppt"><span>PV4</span><span>${this._fmtW(pv4)}</span></div>
              </div>
              <div class="value-main">${this._fmtW(pv)}</div>
              <div class="value-small">Production solaire instantanée</div>
            </section>

            <section class="node battery">
              <div class="node-header">
                <div class="node-title"><ha-icon icon="mdi:battery-high"></ha-icon><span>${this.config.solarvault_name}</span></div>
                <div class="battery-mode">${batteryMode}</div>
              </div>
              <div class="battery-line">
                <div>
                  <div class="value-main">${batterySigned}</div>
                  <div class="value-small">Puissance batterie nette</div>
                </div>
              </div>
              <div class="soc-wrap">
                <div class="soc-label"><span>État de charge</span><span>${this._fmtPct(soc)}</span></div>
                <div class="soc-bar"><div class="soc-fill"></div></div>
              </div>
              <div class="metric-row">
                <div class="metric"><div class="metric-label">Charge</div><div class="metric-value">${this._fmtW(batteryCharge)}</div></div>
                <div class="metric"><div class="metric-label">Décharge</div><div class="metric-value">${this._fmtW(batteryDischarge)}</div></div>
              </div>
            </section>

            <section class="node energy">
              <div class="node-header">
                <div class="node-title"><ha-icon icon="mdi:hubspot"></ha-icon><span>Centre Énergie</span></div>
                <div class="node-subtitle">Couplage AC</div>
              </div>
              <div class="value-main">${this._fmtW(homePower)}</div>
              <div class="value-small">Puissance Maison</div>
              <div class="metric-row">
                <div class="metric"><div class="metric-label">Sortie AC</div><div class="metric-value">${this._fmtW(solarvaultAcOutput)}</div></div>
                <div class="metric"><div class="metric-label">Entrée AC</div><div class="metric-value">${this._fmtW(solarvaultAcInput)}</div></div>
              </div>
            </section>

            <section class="node grid">
              <div class="node-header">
                <div class="node-title"><ha-icon icon="mdi:transmission-tower"></ha-icon><span>Réseau EDF</span></div>
                <div class="node-subtitle">Import / Export</div>
              </div>
              <div class="value-main">${gridLabel}</div>
              <div class="grid-balance">
                <div class="metric"><div class="metric-label">Import</div><div class="metric-value">${this._fmtW(gridImport)}</div></div>
                <div class="metric"><div class="metric-label">Export</div><div class="metric-value">${this._fmtW(gridExport)}</div></div>
              </div>
            </section>

            <section class="node eps">
              <div class="node-header">
                <div class="node-title"><ha-icon icon="mdi:power-plug-battery"></ha-icon><span>EPS</span></div>
                <div class="node-subtitle">Secours</div>
              </div>
              <div class="value-main">${this._fmtW(backupOutput)}</div>
              <div class="value-small">Puissance Secours EPS</div>
            </section>

            <section class="node house">
              <div class="node-header">
                <div class="node-title"><ha-icon icon="mdi:home-lightning-bolt"></ha-icon><span>Maison</span></div>
                <div class="node-subtitle">Charges domestiques</div>
              </div>
              <div class="value-main">${this._fmtW(domesticLoad)}</div>
              <div class="value-small">Consommation totale calculée : ${this._fmtW(homeLoadTotal)}</div>
            </section>
          </div>

          <div class="kpis">
            <div class="kpi"><div class="kpi-label">Auto-consommation</div><div class="kpi-value">${this._fmtPct(selfConsumption)}</div></div>
            <div class="kpi"><div class="kpi-label">Efficacité</div><div class="kpi-value">${this._fmtPct(efficiency)}</div></div>
            <div class="kpi"><div class="kpi-label">Production jour</div><div class="kpi-value">${this._fmtKwh(solarEnergyToday)}</div></div>
            <div class="kpi"><div class="kpi-label">Consommation jour</div><div class="kpi-value">${this._fmtKwh(consumptionToday)}</div></div>
          </div>
        </div>
      </ha-card>
    `;
  }
}

if (!customElements.get("solargenflow-card")) {
  customElements.define("solargenflow-card", SolarGenflowCard);
}

window.customCards = window.customCards || [];

window.customCards.push({
  type: "solargenflow-card",
  name: "SolarGenflow Card",
  description: "Carte énergétique SolarGenflow",
});