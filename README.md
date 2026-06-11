# SolarGenflow Card

Carte Lovelace officielle pour l'intégration SolarGenflow.

SolarGenflow Card affiche les flux énergétiques d'une installation photovoltaïque équipée d'un ou plusieurs SolarVault, avec une présentation orientée énergie et non plus une représentation graphique de maison.

## Fonctionnalités

- Production solaire totale
- Détail PV1, PV2, PV3 et PV4
- État de charge batterie (SOC)
- Charge et décharge batterie
- Flux batterie net
- Centre Énergie (couplage AC)
- Réseau EDF (import / export)
- Charges domestiques
- Sortie EPS (secours)
- KPI énergétiques
- Flux animés en temps réel

## Installation via HACS

1. HACS → Frontend → Dépôts personnalisés
2. Ajouter : `https://github.com/pyrots/solargenflow-card`
3. Type : **Frontend**
4. Installer la carte
5. Vider le cache du navigateur

Ressource attendue :

```yaml
url: /hacsfiles/solargenflow-card/solargenflow-card.js
type: module
```

## Configuration minimale

```yaml
type: custom:solargenflow-card
entities:
  pv_power: sensor.solargenflow_core_pv_power
  battery_soc: sensor.solargenflow_core_battery_soc
  battery_net_power: sensor.solargenflow_core_battery_net_power
  home_power: sensor.solargenflow_core_home_power
  domestic_load_power: sensor.solargenflow_core_domestic_load_power
  grid_import_power: sensor.solargenflow_core_grid_import_power
  grid_export_power: sensor.solargenflow_core_grid_export_power
  backup_output_power: sensor.solargenflow_core_backup_output_power
```

## Configuration complète

```yaml
type: custom:solargenflow-card
title: SolarGenflow
show_header: true
show_kpis: true
solarvault_name: SolarVault 1
entities:
  pv_power: sensor.solargenflow_core_pv_power
  pv1_power: sensor.solargenflow_core_pv1_power
  pv2_power: sensor.solargenflow_core_pv2_power
  pv3_power: sensor.solargenflow_core_pv3_power
  pv4_power: sensor.solargenflow_core_pv4_power

  battery_soc: sensor.solargenflow_core_battery_soc
  battery_net_power: sensor.solargenflow_core_battery_net_power
  battery_charge_power: sensor.solargenflow_core_battery_charge_power
  battery_discharge_power: sensor.solargenflow_core_battery_discharge_power

  home_power: sensor.solargenflow_core_home_power
  domestic_load_power: sensor.solargenflow_core_domestic_load_power
  home_load_total: sensor.solargenflow_core_home_load_total

  grid_import_power: sensor.solargenflow_core_grid_import_power
  grid_export_power: sensor.solargenflow_core_grid_export_power

  backup_output_power: sensor.solargenflow_core_backup_output_power
  solarvault_ac_output: sensor.solargenflow_core_solarvault_ac_output
  solarvault_ac_input: sensor.solargenflow_core_solarvault_ac_input
  solarvault_ac_power: sensor.solargenflow_core_solarvault_ac_power

  solar_energy_today: sensor.solargenflow_core_solar_energy_today
  consumption_today: sensor.solargenflow_core_consumption_today
```

## Organisation de la carte

### Solaire / PV

- PV1
- PV2
- PV3
- PV4
- Production solaire totale

### SolarVault

- État de charge batterie
- Charge batterie
- Décharge batterie
- Flux batterie net

### Centre Énergie

- Puissance Maison
- Sortie AC SolarVault
- Entrée AC SolarVault

### Réseau EDF

- Import réseau
- Export réseau

### Maison

- Charges domestiques
- Consommation totale

### EPS

- Puissance secours

### KPI

- Auto-consommation
- Efficacité
- Production jour
- Consommation jour

## Feuille de route

- Support multi SolarVault
- Popup de configuration batterie
- Commandes SolarVault depuis Home Assistant
- Historique énergétique
- Statistiques avancées

## Licence

MIT
