
class SolarGenflowCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entities) {
      throw new Error("SolarGenflow Card: configuration 'entities' manquante.");
    }

    this.config = {
      title: "SolarGenflow",
      show_header: true,
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
    const batteryCharge = this._num(e.battery_charge_power ?? e.battery_charge);
    const batteryDischarge = this._num(e.battery_discharge_power ?? e.battery_discharge);

    const homePower = this._num(e.home_power);
    const domesticLoad = this._num(e.domestic_load_power);
    const homeLoadTotal = this._num(e.home_load_total ?? e.home_load);

    const gridImport = this._num(e.grid_import_power ?? e.grid_import);
    const gridExport = this._num(e.grid_export_power ?? e.grid_export);
    const gridValue = gridImport > 5 ? `+ ${this._fmtW(gridImport)}` : gridExport > 5 ? `- ${this._fmtW(gridExport)}` : this._fmtW(0);

    const backupOutput = this._num(e.backup_output_power ?? e.backup_output ?? e.backup_power);
    const solarvaultAcPower = this._num(e.solarvault_ac_power);
    const solarvaultAcOutput = this._num(e.solarvault_ac_output ?? e.solarvault_output);
    const solarvaultAcInput = this._num(e.solarvault_ac_input ?? e.solarvault_input);

    const batteryDirection =
      batteryNet > 5 ? "Charge" : batteryNet < -5 ? "Décharge" : "Repos";

    const batteryFlowLabel =
      batteryNet > 5
        ? `+ ${this._fmtW(batteryNet)}`
        : batteryNet < -5
          ? `- ${this._fmtW(Math.abs(batteryNet))}`
          : this._fmtW(0);

    const socClamped = Math.max(0, Math.min(100, soc));

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --card-bg: #050505;
          --house: #d6d6d6;
          --roof: #5f5f5f;
          --roof-dark: #101010;
          --solar: #ffb300;
          --solar-soft: rgba(255, 179, 0, 0.22);
          --grid: #22a7f2;
          --grid-soft: rgba(34, 167, 242, 0.22);
          --ac: #ff2d20;
          --ac-soft: rgba(255, 45, 32, 0.22);
          --eps: #24c734;
          --eps-soft: rgba(36, 199, 52, 0.22);
          --text: #050505;
          --text-light: #ffffff;
          --value-bg: rgba(255, 255, 255, 0.88);
          --value-border: rgba(255, 255, 255, 0.95);
        }

        ha-card {
          background: var(--card-bg);
          border-radius: 22px;
          overflow: hidden;
          color: var(--text);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .card {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          min-height: 420px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .header {
          position: absolute;
          z-index: 30;
          left: 2.2%;
          top: 2.2%;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-light);
          font-weight: 800;
          letter-spacing: 0.2px;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
        }

        .header ha-icon {
          color: var(--solar);
        }

        .scene {
          position: absolute;
          inset: 0;
        }

        .sun {
          position: absolute;
          left: 11.8%;
          top: 12.5%;
          width: 7.2%;
          aspect-ratio: 1;
          border-radius: 50%;
          background: radial-gradient(circle, #ffd447 0%, #ffb300 72%);
          filter: drop-shadow(0 0 12px rgba(255, 179, 0, 0.65));
          z-index: 5;
        }

        .sun::before {
          content: "";
          position: absolute;
          inset: -24%;
          background: repeating-conic-gradient(from 0deg, #ffcc20 0deg 7deg, transparent 7deg 15deg);
          clip-path: circle(50% at 50% 50%);
          z-index: -1;
        }

        .house {
          position: absolute;
          left: 10.5%;
          top: 39.5%;
          width: 70%;
          height: 48%;
          background: var(--house);
          border-bottom: 3px solid #777;
        }

        .roof-base {
          position: absolute;
          left: 8.5%;
          top: 37.4%;
          width: 74%;
          height: 2.1%;
          background: #555;
          z-index: 4;
        }

        .roof {
          position: absolute;
          left: 6%;
          top: 27.2%;
          width: 79%;
          height: 16.5%;
          background: var(--roof);
          clip-path: polygon(11% 100%, 27% 5%, 82% 5%, 96% 100%);
          z-index: 3;
        }

        .roof-panel {
          position: absolute;
          left: 16.8%;
          top: 28.2%;
          width: 58.5%;
          height: 12.6%;
          background: var(--roof-dark);
          clip-path: polygon(4% 100%, 20% 0%, 83% 0%, 98% 100%);
          z-index: 5;
        }

        .panel-line {
          position: absolute;
          top: 28.4%;
          height: 12.4%;
          width: 2px;
          background: rgba(255, 255, 255, 0.9);
          z-index: 6;
          transform-origin: top center;
        }

        .line-pv1 { left: 33.5%; transform: skewX(-18deg); }
        .line-pv2 { left: 46.8%; }
        .line-pv3 { left: 59.5%; transform: skewX(18deg); }

        .pv-label {
          position: absolute;
          z-index: 8;
          top: 30.2%;
          color: #fff;
          font-size: clamp(8px, 0.76vw, 13px);
          font-weight: 800;
        }

        .pv1-label { left: 29.2%; }
        .pv2-label { left: 39.8%; }
        .pv3-label { left: 50.6%; }
        .pv4-label { left: 61.2%; }

        .value {
          position: absolute;
          z-index: 18;
          min-width: 76px;
          padding: 5px 10px;
          border-radius: 8px;
          background: var(--value-bg);
          border: 1px solid var(--value-border);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
          text-align: center;
          font-weight: 900;
          font-size: clamp(10px, 0.95vw, 18px);
          line-height: 1.05;
        }

        .value small {
          display: block;
          margin-top: 2px;
          color: rgba(0, 0, 0, 0.58);
          font-size: clamp(7px, 0.55vw, 10px);
          font-weight: 800;
          text-transform: uppercase;
        }

        .pv1-value { left: 25.6%; top: 33.2%; }
        .pv2-value { left: 37.3%; top: 33.2%; }
        .pv3-value { left: 48.9%; top: 33.2%; }
        .pv4-value { left: 60.5%; top: 33.2%; }

        .solar-total-value { left: 21.6%; top: 46%; }
        .ac-power-value { left: 33.4%; top: 58.6%; }
        .home-load-value { left: 57.4%; top: 58.2%; color: var(--ac); }
        .grid-value { left: 73.6%; top: 64.5%; color: #135f9a; }
        .eps-value { left: 33.6%; top: 80.5%; }

        .label {
          position: absolute;
          z-index: 16;
          font-weight: 900;
          font-size: clamp(8px, 0.77vw, 13px);
          color: #030303;
          text-shadow: 0 1px rgba(255, 255, 255, 0.15);
          white-space: nowrap;
        }

        .label.solar-total { left: 21.3%; top: 50.8%; }
        .label.ac-power { left: 33.6%; top: 63.0%; }
        .label.home-load { left: 58.4%; top: 57.1%; color: var(--ac); }
        .label.grid { left: 75.8%; top: 68.9%; color: #135f9a; }
        .label.eps { left: 31.2%; top: 84.0%; }
        .label.energy-center { left: 51.8%; top: 55.7%; }
        .label.electrical-box { left: 64.0%; top: 72.0%; }
        .label.linky { left: 74.0%; top: 55.4%; }

        .device {
          position: absolute;
          z-index: 12;
        }

        .battery-device {
          left: 18.8%;
          top: 77.8%;
          width: 6.6%;
          height: 12.2%;
          border: 2px solid #111;
          border-radius: 10px;
          background: #f5f5f5;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.22);
          overflow: hidden;
        }

        .battery-device::before {
          content: "";
          position: absolute;
          left: 20%;
          top: -4px;
          width: 60%;
          height: 5px;
          background: #111;
          border-radius: 3px 3px 0 0;
        }

        .battery-title {
          position: absolute;
          left: 9%;
          top: 22%;
          right: 9%;
          font-size: clamp(7px, 0.62vw, 11px);
          font-weight: 900;
          line-height: 1.05;
        }

        .battery-soc {
          position: absolute;
          left: 10%;
          right: 10%;
          bottom: 7%;
          color: #d90000;
          font-weight: 900;
          font-size: clamp(7px, 0.64vw, 11px);
          text-decoration: underline;
        }

        .battery-fill {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          background: rgba(36, 199, 52, 0.22);
          z-index: -1;
        }

        .energy-center-device {
          left: 51.8%;
          top: 60.2%;
          width: 4.2%;
          height: 10%;
          background: #333;
          border: 3px solid #111;
        }

        .energy-center-device::before {
          content: "";
          position: absolute;
          left: 28%;
          top: 9%;
          width: 42%;
          height: 9%;
          border-radius: 4px;
          background: #aaa;
          border: 2px solid #000;
        }

        .energy-center-device ha-icon {
          position: absolute;
          left: 23%;
          top: 34%;
          width: 54%;
          height: 54%;
          color: #ffc400;
        }

        .electrical-box-device {
          left: 65.0%;
          top: 58.8%;
          width: 4.0%;
          height: 14.0%;
          background: #bdbdbd;
          border: 3px solid #111;
          box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.35);
        }

        .electrical-box-device::before,
        .electrical-box-device::after {
          content: "";
          position: absolute;
          left: 17%;
          width: 66%;
          height: 25%;
          background: repeating-linear-gradient(90deg, #777 0 4px, #ddd 4px 7px);
          border: 2px solid #777;
        }

        .electrical-box-device::before { top: 14%; }
        .electrical-box-device::after { bottom: 14%; }

        .linky-device {
          left: 74.4%;
          top: 57.5%;
          width: 3.8%;
          height: 8.8%;
          border-radius: 8px;
          background: #f5f5f5;
          border: 2px solid #111;
        }

        .linky-device::before {
          content: "";
          position: absolute;
          left: 20%;
          top: 18%;
          width: 58%;
          height: 28%;
          border: 2px solid #111;
          border-radius: 3px;
        }

        .linky-device::after {
          content: "";
          position: absolute;
          left: 34%;
          bottom: 16%;
          width: 30%;
          height: 14%;
          border-radius: 999px;
          background: #111;
        }

        .fridge {
          position: absolute;
          left: 45.7%;
          top: 70.4%;
          width: 5.2%;
          height: 18%;
          z-index: 12;
          border: 3px solid #111;
          border-radius: 8px;
          background: #fff;
        }

        .fridge::before {
          content: "";
          position: absolute;
          left: 0;
          top: 40%;
          width: 100%;
          border-top: 3px solid #111;
        }

        .fridge::after {
          content: "❄";
          position: absolute;
          right: 12%;
          top: 31%;
          font-size: clamp(22px, 2.2vw, 42px);
        }

        .pole {
          position: absolute;
          right: 8.3%;
          top: 34.2%;
          width: 1.0%;
          height: 43%;
          background: linear-gradient(90deg, #222, #666, #111);
          z-index: 5;
        }

        .pole::before,
        .pole::after {
          content: "";
          position: absolute;
          left: -170%;
          width: 440%;
          height: 3px;
          background: #555;
        }

        .pole::before { top: 8%; }
        .pole::after { top: 18%; }

        svg.flows {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 10;
          overflow: visible;
        }

        .flow-line {
          fill: none;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-dasharray: 7 9;
          opacity: 0.95;
        }

        .flow-line.is-idle {
          opacity: 0.14;
          animation: none;
        }

        .flow-line.is-active {
          animation: flowMove 1.05s linear infinite;
        }

        .solar-flow { stroke: var(--solar); filter: drop-shadow(0 0 5px var(--solar-soft)); }
        .ac-flow { stroke: var(--ac); filter: drop-shadow(0 0 5px var(--ac-soft)); }
        .grid-flow { stroke: var(--grid); filter: drop-shadow(0 0 5px var(--grid-soft)); }
        .eps-flow { stroke: var(--eps); filter: drop-shadow(0 0 5px var(--eps-soft)); }

        @keyframes flowMove {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -32; }
        }

        .legend {
          position: absolute;
          left: 2.4%;
          right: 2.4%;
          bottom: 2.2%;
          z-index: 25;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .legend-item {
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.86);
          padding: 8px 10px;
          font-size: clamp(9px, 0.72vw, 13px);
          font-weight: 800;
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }

        .legend-item span:last-child {
          color: #fff;
        }

        @media (max-width: 700px) {
          .card {
            min-height: 330px;
          }

          .header {
            font-size: 13px;
          }

          .legend {
            grid-template-columns: repeat(2, 1fr);
          }

          .value {
            min-width: 54px;
            padding: 4px 6px;
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

          <div class="scene">
            <div class="sun"></div>
            <div class="roof"></div>
            <div class="roof-panel"></div>
            <div class="panel-line line-pv1"></div>
            <div class="panel-line line-pv2"></div>
            <div class="panel-line line-pv3"></div>
            <div class="roof-base"></div>
            <div class="house"></div>

            <div class="pv-label pv1-label">PV 1</div>
            <div class="pv-label pv2-label">PV 2</div>
            <div class="pv-label pv3-label">PV 3</div>
            <div class="pv-label pv4-label">PV 4</div>

            <div class="value pv1-value">${this._fmtW(pv1)}</div>
            <div class="value pv2-value">${this._fmtW(pv2)}</div>
            <div class="value pv3-value">${this._fmtW(pv3)}</div>
            <div class="value pv4-value">${this._fmtW(pv4)}</div>

            <div class="value solar-total-value">${this._fmtW(pv)}</div>
            <div class="label solar-total">Production PV</div>

            <div class="value ac-power-value">${this._fmtW(homePower)}</div>
            <div class="label ac-power">Puissance Maison</div>

            <div class="value home-load-value">${this._fmtW(domesticLoad)}</div>
            <div class="label home-load">Charges Domestiques</div>

            <div class="value grid-value">${gridValue}</div>
            <div class="label grid">Réseau EDF</div>

            <div class="value eps-value">${this._fmtW(backupOutput)}</div>
            <div class="label eps">Puissance Secours EPS</div>

            <div class="label energy-center">Centre Énergie</div>
            <div class="device energy-center-device"><ha-icon icon="mdi:alert-outline"></ha-icon></div>

            <div class="device electrical-box-device"></div>
            <div class="label electrical-box">Tableau Électrique</div>

            <div class="device linky-device"></div>
            <div class="label linky">Compteur Linky</div>

            <div class="device battery-device">
              <div class="battery-fill" style="height:${socClamped}%"></div>
              <div class="battery-title">Batterie<br>SolarVault</div>
              <div class="battery-soc">${this._fmtPct(soc)}</div>
            </div>

            <div class="value" style="left: 25.8%; top: 80.7%; color:${batteryNet < -5 ? "#d90000" : "#117d22"};">
              ${batteryFlowLabel}
              <small>${batteryDirection}</small>
            </div>

            <div class="fridge"></div>
            <div class="pole"></div>

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

              <path class="flow-line solar-flow ${this._flowClass(pv1)}" marker-end="url(#arrowSolar)" d="M350 250 L455 330"></path>
              <path class="flow-line solar-flow ${this._flowClass(pv2)}" marker-end="url(#arrowSolar)" d="M420 260 L520 335"></path>
              <path class="flow-line solar-flow ${this._flowClass(pv3)}" marker-end="url(#arrowSolar)" d="M470 210 L570 280"></path>
              <path class="flow-line solar-flow ${this._flowClass(pv4)}" marker-end="url(#arrowSolar)" d="M620 210 L690 305"></path>
              <path class="flow-line solar-flow ${this._flowClass(pv)}" marker-end="url(#arrowSolar)" d="M720 385 L720 500 L330 500 L330 760"></path>

              <path class="flow-line ac-flow ${this._flowClass(Math.max(homePower, solarvaultAcPower, 0))}" marker-end="url(#arrowAc)" d="M360 760 L360 620 L810 620"></path>
              <path class="flow-line ac-flow ${this._flowClass(homePower)}" marker-end="url(#arrowAc)" d="M880 620 C930 650 960 650 1005 620"></path>
              <path class="flow-line ac-flow ${this._flowClass(domesticLoad)}" marker-end="url(#arrowAc)" d="M1025 620 L995 650"></path>

              <path class="flow-line grid-flow ${this._flowClass(gridImport)}" marker-end="url(#arrowGrid)" d="M1410 580 C1325 620 1220 610 1130 590"></path>
              <path class="flow-line grid-flow ${this._flowClass(gridExport)}" marker-end="url(#arrowGrid)" d="M1180 610 C1280 650 1380 630 1470 560"></path>

              <path class="flow-line eps-flow ${this._flowClass(backupOutput)}" marker-end="url(#arrowEps)" d="M385 825 L700 825"></path>
            </svg>

            <div class="legend">
              <div class="legend-item"><span>Sortie AC SolarVault</span><span>${this._fmtW(solarvaultAcOutput)}</span></div>
              <div class="legend-item"><span>Entrée AC SolarVault</span><span>${this._fmtW(solarvaultAcInput)}</span></div>
              <div class="legend-item"><span>Consommation totale</span><span>${this._fmtW(homeLoadTotal)}</span></div>
              <div class="legend-item"><span>Batterie nette</span><span>${batteryFlowLabel}</span></div>
            </div>
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
