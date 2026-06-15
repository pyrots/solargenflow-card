# SolarGenflow Card

Carte Lovelace Home Assistant pour visualiser les flux énergétiques d'une installation **Jackery SolarVault 3 Pro Max**.

Conçue autour d'une logique unique : **la SolarVault est au cœur du système**, pas en périphérie. Elle gère sa propre production PV via son MPPT intégré, se complète depuis le réseau EDF si besoin, et redistribue vers les charges maison et EPS.

![SolarGenflow Card](https://raw.githubusercontent.com/pyrots/solargenflow-card/main/preview.png)

---

## Fonctionnalités

- **Zone haut** — Production PV instantanée · Production journalière · Autosuffisance journalière (jauge circulaire)
- **Flux animés** — SolarVault ↔ Centre Énergie ↔ Réseau EDF · Sortie EPS · Alimentation maison
- **Nœud SolarVault** — SOC% · Charge/décharge · Température batterie (si dispo)
- **Nœud Centre Énergie** — Puissance couplée · détail SolarVault + Réseau
- **Nœud Réseau EDF** — Import / Export avec pylône SVG
- **Bandeau Maison** — EPS + charges domestiques consolidées
- **Zone bas** — Conso maison · Efficacité · Sélecteur mode (tarifaire / personnalisé / autoconso / IA) · Réglages
- **Modal Réglages** — 4 modes Jackery · SOC actuel · Température · Limites charge/décharge
- **Clic sur les nœuds** → ouvre l'historique HA de l'entité
- **Support multi-batteries** prévu (v4.0)

---

## Installation via HACS

1. HACS → Frontend → ⋮ → Dépôts personnalisés
2. URL : `https://github.com/pyrots/solargenflow-card` · Type : **Frontend**
3. Installer **SolarGenflow Card**
4. Vider le cache navigateur (`Cmd+Shift+R` sur Mac)

Ressource HACS :
```yaml
url: /hacsfiles/solargenflow-card/solargenflow-card.js
type: module
```

---

## Configuration

### Minimale

```yaml
type: custom:solargenflow-card
entities:
  pv_power: sensor.solargenflow_core_pv_power
  battery_soc: sensor.solargenflow_core_battery_soc
  battery_net_power: sensor.solargenflow_core_battery_net_power
  home_load_total: sensor.solargenflow_core_home_load_total
  grid_import_power: sensor.solargenflow_core_grid_import_power
  grid_export_power: sensor.solargenflow_core_grid_export_power
  backup_output_power: sensor.solargenflow_core_backup_output_power
  solarvault_ac_output: sensor.solargenflow_core_solarvault_ac_output
  solarvault_ac_input: sensor.solargenflow_core_solarvault_ac_input
```

### Complète

```yaml
type: custom:solargenflow-card
title: SolarGenflow
show_header: true
battery_name: SolarVault 1
entities:
  # Production solaire
  pv_power: sensor.solargenflow_core_pv_power
  pv1_power: sensor.garage_solargenflow_core_pv1_power
  pv2_power: sensor.garage_solargenflow_core_pv2_power
  pv3_power: sensor.garage_solargenflow_core_pv3_power
  pv4_power: sensor.garage_solargenflow_core_pv4_power

  # Batterie
  battery_soc: sensor.solargenflow_core_battery_soc
  battery_net_power: sensor.solargenflow_core_battery_net_power

  # Sorties SolarVault
  backup_output_power: sensor.solargenflow_core_backup_output_power
  solarvault_ac_output: sensor.solargenflow_core_solarvault_ac_output
  solarvault_ac_input: sensor.solargenflow_core_solarvault_ac_input

  # Réseau
  grid_import_power: sensor.solargenflow_core_grid_import_power
  grid_export_power: sensor.solargenflow_core_grid_export_power

  # Maison
  home_load_total: sensor.solargenflow_core_home_load_total

  # Énergie journalière (optionnel)
  pv_daily_energy: sensor.solargenflow_core_production_solaire_journaliere
  grid_export_daily_energy: sensor.jackery_grid_export_energy

  # Batterie avancé (optionnel)
  battery_temperature: sensor.jackery_battery_temperature
  soc_charge_limit: sensor.jackery_soc_charge_limit
  soc_discharge_limit: sensor.jackery_soc_discharge_limit

  # Mode de fonctionnement (optionnel — entité HA à créer)
  # mode_entity: input_select.solarvault_mode
```

---

## Schéma des flux

```
         [Solaire / PV]
                ↓ DC
[EPS] ←── [SolarVault] ↔ [Centre Énergie] ↔ [Réseau EDF]
                                ↓ AC
                           [Maison]
```

La SolarVault est le **routeur central** : elle produit via son MPPT, se complète depuis le réseau, et redistribue vers les charges.

---

## Modes de fonctionnement Jackery

| N° | Mode | Description |
|---|---|---|
| 13 | Tarifaire | Charge quand tarif bas, réinjecte quand tarif élevé |
| 14 | Personnalisé | Planning défini dans l'app Jackery |
| 15 | Autoconsommation | Priorité solaire — mode par défaut |
| 16 | IA | Optimisation dynamique tarifaire + historique |

> Le pilotage des modes depuis HA n'est pas encore disponible. Utiliser l'app Jackery.

---

## Feuille de route

- [x] Flux animés temps réel
- [x] Jauge autosuffisance journalière
- [x] Modal réglages + modes Jackery
- [x] Température et limites SOC
- [x] Clic → historique entité HA
- [ ] Support 2 et 3 batteries (v4.0)
- [ ] Contrôle modes depuis HA (quand API disponible)
- [ ] Historique énergétique intégré

---

## Licence

MIT — [pyrots](https://github.com/pyrots)
