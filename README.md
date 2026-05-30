# SolarGenflow Card

Carte Lovelace pour l'intégration [SolarGenflow](https://github.com/pyrots/solargenflow).

Affiche en temps réel les flux d'énergie de votre installation solaire avec animations.

## Installation via HACS

1. HACS → Frontend → Dépôts personnalisés → `https://github.com/pyrots/solargenflow-card` → **Frontend**
2. Télécharger → Vider le cache navigateur
3. Ajouter la carte dans Lovelace

## Configuration

```yaml
type: custom:solargenflow-card
pv_power: sensor.solargenflow_pv_power
home_load: sensor.solargenflow_home_load
battery_soc: sensor.solargenflow_battery_soc
battery_charge: sensor.solargenflow_battery_charge_power
battery_discharge: sensor.solargenflow_battery_discharge_power
grid_import: sensor.solargenflow_grid_import_power
grid_export: sensor.solargenflow_grid_export_power
backup_power: sensor.solargenflow_backup_output_power
solarvault_output: sensor.solargenflow_solarvault_ac_output
solarvault_input: sensor.solargenflow_solarvault_ac_input
```

## Licence
MIT
