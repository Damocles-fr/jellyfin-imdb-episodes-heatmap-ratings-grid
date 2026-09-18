# Jellyfin Episodes Ratings Grid 🟧🟨🟩🟩

Display the episodes ratings heatmap grid on Jellyfin TV Series pages.
The userscript adds the grid to TV Shows pages between Seasons and Cast, inside a drop-down section that stays closed by default to avoid unnecessary loads and spoilers.

<p align="center">
  <img src="./assets/Jellyfin-Episodes-Ratings-Grid-1.4.webp" alt="Android view" width="520"><br>
</p>

## Features

- **Heatmap-style** graph ratings chart
- **Drop-down menu to avoid spoilers** at opening the TV series pages
- **Fast access** : Episodes and seasons cells are linked to the library
- **Top-left button to invert the grid layout (Seasons ↔ Episodes)**. Preference saved locally
- **Custom themes** & backgrounds compatibility
- **Highlights** the matching season number and episode number when hovering a cell
- **Compact layout**, display up to 26 episodes and 26 seasons without scrolling on desktop
- **Mobile-friendly** & Sticky episode number column during horizontal scrolling
- Heatmap and grid data are **loaded only after clicking the drop-down menu**
- **HoverDetails**, [thanks @grimmdev](https://github.com/Jellyfin-PG/JellyFrame)
- Fetch IMDb ratings thanks to [@ya0903 dataset](https://github.com/ya0903/imdb-episode-dataset), fallback to Jellyfin CommunityRating metadata
- **Alternative local script**: no online IMDb dataset, only use *CommunityRating*, metadata fetched directly from the Jellyfin server. Faster. Perfect with plugins like *Jellyfin IMDb Ratings* or *MDBList Ratings*, which already update the JF server ratings with the IMDb ones.

## Transparency

- Heavily LLM-assisted
- Human involvement was required to optimize the process, despite JavaScript repeatedly trying to hurt the human.

## Requirements

- [**Jellyfin JavaScript Injector plugin**](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector)

## Screenshots (older version)

![Dropdown menu demo](./assets/jellyfin-imdb-episodes-heatmap-ratings-grid-3-dropdownmenu.gif)
**Drop-down menu**

<br>

![Many seasons scroll](./assets/jellyfin-imdb-episodes-heatmap-ratings-grid-2-manyseasonsscroll_resultat.webp)
**Sticky column & Highlights**

<br>

## Installation

#### 1. Install the [**Jellyfin JavaScript Injector plugin**](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector) in your Jellyfin server if it is not already installed (need a server reboot).

#### 2. Open the Jellyfin admin ***dashboard***

#### 3. Go to: ***Dashboard*** => ***JS Injector***

#### 4. ***Add Script*** => Name it *imdb-grid* or whatever => Copy/Paste :
```
(() => {
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/gh/Damocles-fr/jellyfin-imdb-episodes-heatmap-ratings-grid@latest/Jellyfin-Episodes-Ratings-Grid-JF-Library-Links.js";
  s.async = true;
  (document.head || document.documentElement).appendChild(s);
})();
```

### **Or :**

#### **Alternative Offline script** : use only JF server CommunityRating metadata, no IMDb online dataset, everything local, copy/paste this script instead : [Local-CommunityRating-Metadata-Only.js](https://github.com/Damocles-fr/jellyfin-imdb-episodes-heatmap-ratings-grid/releases/download/12.0.0/Jellyfin-Episodes-Ratings-Grid-Local-CommunityRating-Metadata-Only.js). Faster. This version is perfect with plugins like Jellyfin IMDb Ratings or MDBList Ratings, which already update the server ratings with the IMDb ones.

#### 5. Click ***Enabled*** => Click ***Save***

#### 6. Done, refresh (F5 or Ctrl + Shift + R) a Jellyfin TV series page.

##### Alternatively, you can copy and paste the full script available on the GitHub rather than using cdn.jsdelivr. Note that this method does not support automatic updates. You can also install it only for your web-browser with an extension like *Violentmonkey*.

##### Tip: With the local scripts, you can change the title for translation or anything else (line 3 of the script).

## Technical

- It won't display on Jellyfin apps that do not use the Jellyfin Web UI & JavaScript Injector
- Compatible with Jellyfin 10.11 & 12.0 and above. Not tested on Jellyfin 10.10 and under
- Injects the graph directly into Jellyfin using the Jellyfin JavaScript Injector plugin
- DOM insertion in a stable location on series page (between Seasons and cast)
- Data source : The grid data is loaded from the IMDb dataset by @ya0903
- Grid data is loaded only after clicking the drop-down menu
- When a supported series page is detected, the script requests the current Jellyfin item metadata through the local Jellyfin API and reads the **IMDb provider ID**
- When the drop-down is opened, the script fetches the corresponding JSON dataset from the IMDb dataset source (it fallback to Jellyfin episode metadata when the IMDb dataset has no rating, like the local script version)
- Then, the script builds the full ratings grid
- Cached requests for item metadata and external ratings dataset to reduce repeated loading
- Preferences (invert seasons ↔ episodes) and cache saved locally client-side

## Need Help?
- Don't hesitate to open an [issue](https://github.com/Damocles-fr/jellyfin-imdb-episodes-heatmap-ratings-grid/issues)
- **DM me** https://forum.jellyfin.org/u-damocles
- GitHub [**Damocles-fr**](https://github.com/Damocles-fr)
