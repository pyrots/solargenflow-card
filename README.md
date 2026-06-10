# SolarGenflow Card

Carte Lovelace pour l'intégration [SolarGenflow](https://github.com/pyrots/solargenflow).

Elle affiche les flux d'énergie en temps réel d'une installation solaire avec SolarVault / batterie / réseau EDF / EPS, dans une vue graphique de type maison.

## Installation via HACS

1. HACS → Frontend → Dépôts personnalisés
2. Ajouter le dépôt : `https://github.com/pyrots/solargenflow-card`
3. Catégorie : **Frontend**
4. Télécharger la carte
5. Vider le cache du navigateur
6. Ajouter la ressource Lovelace si nécessaire :

```yaml
url: /hacsfiles/solargenflow-card/solargenflow-card.js
type: module
```

## Configuration

```yaml
type: custom:solargenflow-card
title: SolarGenflow
show_header: true
entities:
  pv_power: sensor.solargenflow_pv_power
  pv1_power: sensor.solargenflow_pv1_power
  pv2_power: sensor.solargenflow_pv2_power
  pv3_power: sensor.solargenflow_pv3_power
  pv4_power: sensor.solargenflow_pv4_power

  battery_soc: sensor.solargenflow_battery_soc
  battery_net_power: sensor.solargenflow_battery_net_power
  battery_charge_power: sensor.solargenflow_battery_charge_power
  battery_discharge_power: sensor.solargenflow_battery_discharge_power

  home_power: sensor.solargenflow_home_power
  domestic_load_power: sensor.solargenflow_domestic_load_power
  home_load_total: sensor.solargenflow_home_load_total

  grid_import_power: sensor.solargenflow_grid_import_power
  grid_export_power: sensor.solargenflow_grid_export_power

  backup_output_power: sensor.solargenflow_backup_output_power
  solarvault_ac_output: sensor.solargenflow_solarvault_ac_output
  solarvault_ac_input: sensor.solargenflow_solarvault_ac_input
  solarvault_ac_power: sensor.solargenflow_solarvault_ac_power
```

## Correspondance des valeurs affichées

| Zone de la carte | Capteur utilisé |
|---|---|
| PV1 | `pv1_power` |
| PV2 | `pv2_power` |
| PV3 | `pv3_power` |
| PV4 | `pv4_power` |
| Production PV totale | `pv_power` |
| État de charge batterie | `battery_soc` |
| Flux batterie net | `battery_net_power` |
| Puissance Maison | `home_power` |
| Charges Domestiques | `domestic_load_power` |
| Consommation totale | `home_load_total` |
| Réseau EDF | `grid_import_power` / `grid_export_power` |
| Puissance Secours EPS | `backup_output_power` |
| Sortie AC SolarVault | `solarvault_ac_output` |
| Entrée AC SolarVault | `solarvault_ac_input` |
| Flux AC SolarVault net | `solarvault_ac_power` |

## Licence

MIT
