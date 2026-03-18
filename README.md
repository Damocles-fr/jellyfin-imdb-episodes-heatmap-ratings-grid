# Jellyfin Episodes Ratings Grid 🟧🟨🟩🟩

Display the IMDb episodes ratings heatmap grid on Jellyfin TV Series pages.
The userscript adds the grid to TV Shows pages between Seasons and Cast, inside a drop-down section that stays closed by default to avoid spoilers.

<p align="center">
  <img src="./assets/jellyfin-imdb-episodes-heatmap-ratings-grid-1_resultat.webp" alt="Android view" width="320"><br>
</p>

## Features

- Uses a **heatmap-style** graph ratings chart
- Rating based color styling to make strong and weak episodes easy to identify at a glance
- **Drop-down menu to avoid spoilers** at opening the TV series pages
- **Highlights** the matching season number and episode number when hovering a cell
- **Compact layout**, display up to 26 episodes and 26 seasons without scrolling on desktop
- **Mobile-friendly** layout with horizontal scroll support
- Sticky episode number column during horizontal scrolling
- **Fast access** : Episodes and seasons cells are **linked to the library**
- If it fails to find the episode, it opens to the season, if that also fails, it falls back to opening the corresponding IMDb page
- IMDb website links–only version also available. USE ONLY ONE OF THE SCRIPTS AT A TIME
- Display a simple link to the IMDb ratings page when heatmap data is not available
- Fully compatible with custom themes & backgrounds
- Heatmap data are loaded only after clicking the drop-down menu

## Transparency

- Heavily LLM-assisted
- Human involvement was required to optimize the process, despite JavaScript repeatedly trying to hurt the human.

## Requirements

- [Jellyfin JavaScript Injector plugin](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector)

## Screenshots

![Dropdown menu demo](./assets/jellyfin-imdb-episodes-heatmap-ratings-grid-3-dropdownmenu.gif)
**Drop-down menu**

<br>

![Many seasons scroll](./assets/jellyfin-imdb-episodes-heatmap-ratings-grid-2-manyseasonsscroll_resultat.webp)
**Sticky column & Highlights**

<br>

<p align="center">
  <img src="./assets/jellyfin-imdb-episodes-heatmap-ratings-grid-5-android.webp" alt="Android view" width="320"><br>
  <strong>Mobile-friendly</strong>
</p>

<br>

## Installation

#### 1. Install the *Jellyfin JavaScript Injector* plugin in your Jellyfin server if it is not already installed (may need server reboot).

#### 2. Open the Jellyfin admin ***dashboard***

#### 3. Go to: ***Dashboard*** => ***JS Injector***

#### 4. ***Add Script*** => Name it *imdb-grid* or whatever => Copy/Paste the script you choose (**only one**) :

- **JF library links** :
(Grid cell links to the corresponding **Jellyfin library item**. If the episode cannot be found, it opens the season page instead. If that also fails, it falls back to the corresponding IMDb page)

```
(() => {
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/gh/Damocles-fr/jellyfin-imdb-episodes-heatmap-ratings-grid/Jellyfin-Episodes-Ratings-Grid-JF-Library-Links.js";
  s.async = true;
  (document.head || document.documentElement).appendChild(s);
})();
```

### OR

- **Only IMDBs links** :
(Grid cell always links to the corresponding **IMDb page**.)

```
(() => {
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/gh/Damocles-fr/jellyfin-imdb-episodes-heatmap-ratings-grid/Jellyfin-Episodes-Ratings-Grid-Only-IMDb-Links.js";
  s.async = true;
  (document.head || document.documentElement).appendChild(s);
})();
```

#### 5. Click ***Enabled*** => Click ***Save***

#### 6. Refresh the a Jellyfin TV series page.

###### Alternatively, you can copy and paste the full script available on the GitHub rather than using cdn.jsdelivr. Note that this method does not support automatic updates. You can also install it only for your web-browser it with an extension like *Violentmonkey*.

## Technical

- It won't display on Jellyfin apps that do not use the Jellyfin Web UI & JavaScript Injector.
- Compatible with Jellyfin 10.11 and above. Not tested on Jellyfin 10.10 and under.
- Injects the graph directly into Jellyfin with the Jellyfin JavaScript Injector plugin
- DOM insertion in a stable location on series page (between Seasons and cast)
- Data source : The heatmap data is loaded from the IMDb heatmap dataset by @mokronos
- Heatmap data is loaded only after clicking the drop-down menu
- When a supported series page is detected, the script requests the current Jellyfin item metadata through the local Jellyfin API and reads the **IMDb provider ID** from the item's `ProviderIds`.
- When the drop-down is opened, the script fetches the corresponding JSON dataset from the IMDb heatmap dataset source
- If the dataset exists, the script builds the full ratings grid
- If the dataset is missing, the script shows a fallback link to the IMDb ratings page for that series
- Cached requests for item metadata and external ratings dataset to reduce repeated loading

## Need Help?
- Don't hesitate to open an [issue](https://github.com/Damocles-fr/jellyfin-imdb-episodes-heatmap-ratings-grid/issues)
- **DM me** https://forum.jellyfin.org/u-damocles
- GitHub [**Damocles-fr**](https://github.com/Damocles-fr)
