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
    return 5;
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

    const solarEnergyToday = this._num(e.solar_energy_today ?? e.solar_energy_total);
    const consumptionToday = this._num(e.consumption_today ?? e.home_energy_today);

    const selfConsumption = pv > 5
      ? Math.min(100, Math.max(0, Math.round((Math.min(pv, domesticLoad) / pv) * 100)))
      : 0;

    const efficiency = pv + gridImport > 5
      ? Math.min(100, Math.max(0, Math.round((domesticLoad / Math.max(pv + gridImport, 1)) * 100)))
      : 0;

    const batteryMode = this._batteryMode(batteryNet);
    const batterySigned = this._signedPower(batteryNet);
    const gridLabel = this._gridLabel(gridImport, gridExport);
    const socClamped = Math.max(0, Math.min(100, soc));

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --sgf-bg: #0f1218;
          --sgf-card: rgba(255, 255, 255, 0.075);
          --sgf-card-strong: rgba(255, 255, 255, 0.105);
          --sgf-border: rgba(255, 255, 255, 0.13);
          --sgf-text: rgba(255, 255, 255, 0.95);
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
            radial-gradient(circle at 18% 0%, rgba(255, 179, 0, 0.16), transparent 28%),
            radial-gradient(circle at 88% 18%, rgba(56, 189, 248, 0.15), transparent 28%),
            linear-gradient(135deg, #151922 0%, #0b0e13 100%);
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--sgf-border);
          color: var(--sgf-text);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
        }

        .card {
          padding: 14px;
          font-family: Arial, Helvetica, sans-serif;
          container-type: inline-size;
          overflow: hidden;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: clamp(18px, 2.4cqw, 26px);
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .title ha-icon {
          width: 24px;
          height: 24px;
          color: var(--sgf-solar);
          flex: 0 0 auto;
        }

        .status-pill {
          border-radius: 999px;
          padding: 6px 10px;
          color: rgba(255, 255, 255, 0.86);
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 11px;
          font-weight: 850;
          white-space: nowrap;
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
          grid-template-areas:
            "pv energy grid"
            "battery energy grid"
            "eps house house";
          gap: 10px;
          min-width: 0;
        }

        .node {
          --accent: rgba(255, 255, 255, 0.5);
          position: relative;
          border-radius: 17px;
          padding: 12px;
          background: linear-gradient(180deg, var(--sgf-card-strong), var(--sgf-card));
          border: 1px solid var(--sgf-border);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 10px 20px rgba(0, 0, 0, 0.15);
          min-width: 0;
        }

        .node::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 17px;
          border-top: 3px solid var(--accent);
          pointer-events: none;
        }

        .node-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 9px;
          min-width: 0;
        }

        .node-title {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          font-size: clamp(13px, 1.55cqw, 17px);
          font-weight: 950;
          line-height: 1.18;
        }

        .node-title ha-icon {
          width: 20px;
          height: 20px;
          color: var(--accent);
          flex: 0 0 auto;
        }

        .node-subtitle {
          color: var(--sgf-muted);
          font-size: 11px;
          font-weight: 800;
          text-align: right;
          white-space: nowrap;
        }

        .value-main {
          font-size: clamp(27px, 4.2cqw, 38px);
          font-weight: 950;
          line-height: 0.98;
          letter-spacing: -0.055em;
          white-space: nowrap;
        }

        .value-small {
          color: var(--sgf-muted);
          font-size: 12px;
          font-weight: 800;
          margin-top: 6px;
          line-height: 1.25;
        }

        .pv { grid-area: pv; --accent: var(--sgf-solar); }
        .battery { grid-area: battery; --accent: var(--sgf-battery); }
        .energy { grid-area: energy; --accent: var(--sgf-energy); }
        .grid { grid-area: grid; --accent: var(--sgf-grid); }
        .eps { grid-area: eps; --accent: var(--sgf-eps); }
        .house { grid-area: house; --accent: var(--sgf-house); }

        .mppt-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          margin-bottom: 10px;
        }

        .mppt,
        .metric,
        .kpi {
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.075);
        }

        .mppt {
          padding: 7px 5px;
          text-align: center;
        }

        .mppt span:first-child {
          display: block;
          color: var(--sgf-muted);
          font-size: 10px;
          font-weight: 900;
          margin-bottom: 3px;
        }

        .mppt span:last-child {
          display: block;
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .battery-mode {
          border-radius: 999px;
          padding: 5px 9px;
          color: #ffffff;
          background: rgba(34, 197, 94, 0.18);
          border: 1px solid rgba(34, 197, 94, 0.35);
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .battery-mode.is-discharge {
          background: rgba(239, 68, 68, 0.18);
          border-color: rgba(239, 68, 68, 0.35);
        }

        .battery-mode.is-idle {
          background: rgba(255, 255, 255, 0.09);
          border-color: rgba(255, 255, 255, 0.14);
        }

        .soc-wrap {
          margin-top: 12px;
        }

        .soc-label {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          color: var(--sgf-muted);
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 5px;
        }

        .soc-bar {
          height: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          overflow: hidden;
        }

        .soc-fill {
          height: 100%;
          width: ${socClamped}%;
          border-radius: 999px;
          background: linear-gradient(90deg, #22c55e, #a3e635);
        }

        .metric-row,
        .grid-balance {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px;
          margin-top: 10px;
        }

        .metric {
          padding: 8px;
        }

        .metric-label,
        .kpi-label {
          color: var(--sgf-muted);
          font-size: 10.5px;
          font-weight: 850;
          margin-bottom: 4px;
        }

        .metric-value {
          font-size: 13px;
          font-weight: 950;
          white-space: nowrap;
        }

        .kpis {
          display: ${this.config.show_kpis ? "grid" : "none"};
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 9px;
          margin-top: 10px;
        }

        .kpi {
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.09);
        }

        .kpi-value {
          font-size: clamp(15px, 2cqw, 22px);
          font-weight: 950;
          white-space: nowrap;
        }

        @container (max-width: 980px) {
          .layout {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            grid-template-areas:
              "pv energy"
              "battery energy"
              "grid house"
              "eps house";
          }

          .kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @container (max-width: 620px) {
          .card {
            padding: 12px;
          }

          .header {
            margin-bottom: 10px;
          }

          .layout {
            grid-template-columns: 1fr;
            grid-template-areas:
              "pv"
              "battery"
              "energy"
              "grid"
              "house"
              "eps";
            gap: 10px;
          }

          .node {
            padding: 12px;
          }

          .mppt-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .metric-row,
          .grid-balance,
          .kpis {
            grid-template-columns: 1fr;
          }

          .value-main {
            font-size: clamp(30px, 11cqw, 40px);
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
                <div class="battery-mode ${batteryMode === "Décharge" ? "is-discharge" : batteryMode === "Repos" ? "is-idle" : ""}">${batteryMode}</div>
              </div>
              <div class="value-main">${batterySigned}</div>
              <div class="value-small">Puissance batterie nette</div>
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