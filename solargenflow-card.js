
class SolarGenflowCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entities) {
      throw new Error("SolarGenflow Card: configuration 'entities' manquante.");
    }

    this.config = {
      title: "SolarGenflow",
      show_header: true,
      background_image: "/local/solargenflow/energy-center.png",
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

  _fmtPct(value) {
    return `${Math.round(Number(value) || 0)} %`;
  }

  _flowClass(value) {
    return Number(value) > 5 ? "is-active" : "is-idle";
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

    const homePower = this._num(e.home_power);
    const domesticLoad = this._num(e.domestic_load_power);
    const homeLoadTotal = this._num(e.home_load_total ?? e.home_load);

    const gridImport = this._num(e.grid_import_power ?? e.grid_import);
    const gridExport = this._num(e.grid_export_power ?? e.grid_export);
    const gridValue = gridImport > 5
      ? `+ ${this._fmtW(gridImport)}`
      : gridExport > 5
        ? `- ${this._fmtW(gridExport)}`
        : this._fmtW(0);

    const backupOutput = this._num(e.backup_output_power ?? e.backup_output ?? e.backup_power);
    const solarvaultAcOutput = this._num(e.solarvault_ac_output ?? e.solarvault_output);
    const solarvaultAcInput = this._num(e.solarvault_ac_input ?? e.solarvault_input);

    const batteryDirection =
      batteryNet > 5 ? "charge" : batteryNet < -5 ? "decharge" : "idle";

    const batteryFlowLabel =
      batteryNet > 5
        ? `+ ${this._fmtW(batteryNet)}`
        : batteryNet < -5
          ? `- ${this._fmtW(Math.abs(batteryNet))}`
          : this._fmtW(0);

    const backgroundImage = this.config.background_image || "/local/solargenflow/energy-center.png";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --solar: #ffb300;
          --ac: #ff2d20;
          --grid: #22a7f2;
          --eps: #24c734;
          --value-bg: rgba(255, 255, 255, 0.90);
        }

        ha-card {
          background: #000;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
        }

        .card {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          min-height: 430px;
          font-family: Arial, Helvetica, sans-serif;
          background-image: url("${backgroundImage}");
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
        }

        .header {
          position: absolute;
          z-index: 30;
          left: 1.4%;
          top: 1.6%;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #fff;
          font-size: clamp(12px, 1vw, 16px);
          font-weight: 900;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.75);
        }

        .header ha-icon {
          color: var(--solar);
          width: 22px;
          height: 22px;
        }

        .value {
          position: absolute;
          z-index: 20;
          min-width: 66px;
          padding: 5px 10px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(230, 230, 230, 0.92));
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255,255,255,0.85);
          color: #050505;
          text-align: center;
          font-size: clamp(10px, 0.9vw, 15px);
          font-weight: 900;
          line-height: 1;
          white-space: nowrap;
        }

        .value.solar { color: #111; }
        .value.ac { color: var(--ac); }
        .value.grid { color: #0b63a4; }
        .value.eps { color: #111; }
        .value.charge { color: #148a25; }
        .value.decharge { color: #d90000; }
        .value.idle { color: #333; }

        .pv1 { left: 25.2%; top: 34.4%; }
        .pv2 { left: 36.9%; top: 34.4%; }
        .pv3 { left: 48.5%; top: 34.4%; }
        .pv4 { left: 60.2%; top: 34.4%; }

        .pv-total { left: 21.8%; top: 48.6%; }
        .home-power { left: 35.2%; top: 59.7%; }
        .domestic-load { left: 57.9%; top: 58.5%; }
        .grid-power { left: 73.4%; top: 64.0%; }
        .eps-power { left: 33.0%; top: 79.9%; }
        .battery-net { left: 25.6%; top: 80.0%; }
        .battery-soc { left: 19.4%; top: 86.1%; min-width: 34px; padding: 2px 5px; font-size: clamp(8px, 0.64vw, 11px); color: #d90000; background: transparent; border: none; box-shadow: none; }

        svg.flows {
          position: absolute;
          inset: 0;
          z-index: 12;
          width: 100%;
          height: 100%;
          overflow: visible;
          pointer-events: none;
        }

        .flow-line {
          fill: none;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-dasharray: 7 10;
          opacity: 0.95;
        }

        .flow-line.is-idle {
          opacity: 0;
          animation: none;
        }

        .flow-line.is-active {
          animation: flowMove 1.05s linear infinite;
        }

        .solar-flow { stroke: var(--solar); filter: drop-shadow(0 0 4px rgba(255, 179, 0, 0.4)); }
        .ac-flow { stroke: var(--ac); filter: drop-shadow(0 0 4px rgba(255, 45, 32, 0.4)); }
        .grid-flow { stroke: var(--grid); filter: drop-shadow(0 0 4px rgba(34, 167, 242, 0.4)); }
        .eps-flow { stroke: var(--eps); filter: drop-shadow(0 0 4px rgba(36, 199, 52, 0.4)); }

        @keyframes flowMove {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -34; }
        }

        .legend {
          position: absolute;
          left: 1.6%;
          right: 1.6%;
          bottom: 1.3%;
          z-index: 22;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .legend-item {
          border-radius: 12px;
          background: rgba(20, 20, 20, 0.82);
          color: rgba(255, 255, 255, 0.84);
          padding: 7px 10px;
          font-size: clamp(8px, 0.68vw, 12px);
          font-weight: 800;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          backdrop-filter: blur(4px);
        }

        .legend-item span:last-child {
          color: #fff;
        }

        @media (max-width: 700px) {
          .card {
            min-height: 330px;
          }

          .legend {
            grid-template-columns: repeat(2, 1fr);
          }

          .value {
            min-width: 48px;
            padding: 4px 7px;
          }
        }
      </style>

      <ha-card>
        <div class="card">
          ${
            this.config.show_header
              ? `<div class="header"><ha-icon icon="mdi:solar-power-variant"></ha-icon><span>${this.config.title}</span></div>`
              : ""
          }

          <div class="value solar pv1">${this._fmtW(pv1)}</div>
          <div class="value solar pv2">${this._fmtW(pv2)}</div>
          <div class="value solar pv3">${this._fmtW(pv3)}</div>
          <div class="value solar pv4">${this._fmtW(pv4)}</div>

          <div class="value solar pv-total">${this._fmtW(pv)}</div>
          <div class="value home-power">${this._fmtW(homePower)}</div>
          <div class="value ac domestic-load">${this._fmtW(domesticLoad)}</div>
          <div class="value grid grid-power">${gridValue}</div>
          <div class="value eps eps-power">${this._fmtW(backupOutput)}</div>
          <div class="value ${batteryDirection} battery-net">${batteryFlowLabel}</div>
          <div class="value battery-soc">${this._fmtPct(soc)}</div>

          <svg class="flows" viewBox="0 0 1600 900" preserveAspectRatio="none">
            <defs>
              <marker id="arrowSolar" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#ffb300"></path>
              </marker>
              <marker id="arrowAc" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#ff2d20"></path>
              </marker>
              <marker id="arrowGrid" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#22a7f2"></path>
              </marker>
              <marker id="arrowEps" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#24c734"></path>
              </marker>
            </defs>

            <path class="flow-line solar-flow ${this._flowClass(pv)}" marker-end="url(#arrowSolar)" d="M704 372 L704 465 L318 465 L318 694"></path>

            <path class="flow-line ac-flow ${this._flowClass(homePower)}" marker-end="url(#arrowAc)" d="M350 690 L350 580 L800 580"></path>
            <path class="flow-line ac-flow ${this._flowClass(domesticLoad)}" marker-end="url(#arrowAc)" d="M890 580 C935 612 990 612 1038 575"></path>

            <path class="flow-line grid-flow ${this._flowClass(gridImport)}" marker-end="url(#arrowGrid)" d="M1456 540 C1332 590 1238 575 1130 555"></path>
            <path class="flow-line grid-flow ${this._flowClass(gridExport)}" marker-end="url(#arrowGrid)" d="M1175 580 C1300 620 1395 595 1485 520"></path>

            <path class="flow-line eps-flow ${this._flowClass(backupOutput)}" marker-end="url(#arrowEps)" d="M360 760 L720 760"></path>
          </svg>

          <div class="legend">
            <div class="legend-item"><span>Sortie AC SolarVault</span><span>${this._fmtW(solarvaultAcOutput)}</span></div>
            <div class="legend-item"><span>Entrée AC SolarVault</span><span>${this._fmtW(solarvaultAcInput)}</span></div>
            <div class="legend-item"><span>Consommation totale</span><span>${this._fmtW(homeLoadTotal)}</span></div>
            <div class="legend-item"><span>Batterie nette</span><span>${batteryFlowLabel}</span></div>
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
