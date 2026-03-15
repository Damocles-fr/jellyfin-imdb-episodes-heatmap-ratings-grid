# Jellyfin IMDb Episodes Heatmap Ratings Grid 🟧🟨🟩🟩

Display an IMDb episodes ratings heatmap grid on Jellyfin TV Series pages.

Using Jellyfin JavaScript Injector plugin, the script adds the grid to TV Series pages between Seasons and Cast, inside a drop-down section that stays closed by default to avoid spoilers.

## Features

- Displays an IMDb episode ratings heatmap grid on Jellyfin series pages
- Uses a heatmap-style ratings chart / graph for quick visual reading
- Rating-based color styling to make strong and weak episodes easy to identify at a glance.
- Drop-down menu to avoid spoilers before opening the ratings grid
- Highlights the matching season number and episode number when hovering a rating cell
- Click any episode rating cell to open the corresponding IMDb episode page
- Click any season header to open the corresponding IMDb season page
- Mobile-friendly layout with horizontal scroll support
- Sticky episode number column during horizontal scrolling
- Compact layout, up to 24 episodes and 20 seasons view without scrolling on desktop
- Fallback link to the IMDb ratings page when heatmap data is not available
- Heatmap data is loaded only after clicking the drop-down menu

## Transparency
- This repository contains a suspicious amount of LLM code.
- Human supervision was required to optimize the result, despite JavaScript repeatedly trying to hurt the human.

## Requirements

- Jellyfin
- [Jellyfin JavaScript Injector plugin](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector)
- A Jellyfin library with series that have IMDb provider IDs

## Installation

### 1. Install the Jellyfin JavaScript Injector plugin

Install the **Jellyfin JavaScript Injector** plugin in your Jellyfin server if it is not already installed.

### 2. Open the Jellyfin admin dashboard

Go to:

**Dashboard -> JS Injector**

### 3. Create a new injected script

Paste the full script into the JavaScript field.

### 4. Save

Save the configuration.

### 5. Reload Jellyfin web

Refresh the Jellyfin web interface and open a TV series page.

You should see an **IMDb Episodes Grid** drop-down section on supported series pages.

## Technical
- Injects the grid directly into Jellyfin with the Jellyfin JavaScript Injector plugin
- DOM insertion in a stable location on series page (between Seasons and cast)
- Because Jellyfin may keep hidden old pages in the DOM, the script always tries to target the currently visible details view
- Data source : The heatmap data is loaded from the IMDb heatmap dataset by @mokronos
- Heatmap data is loaded only after clicking the drop-down menu
- When a supported series page is detected, the script requests the current Jellyfin item metadata through the local Jellyfin API and reads the **IMDb provider ID** from the item's `ProviderIds`.
- When the drop-down is opened, the script fetches the corresponding JSON dataset from the IMDb heatmap dataset source
- If the dataset exists, the script builds the full ratings grid
- If the dataset is missing, the script shows a fallback link to the IMDb ratings page for that series
- Cached requests for item metadata and external ratings dataset to reduce repeated loading
- Heavily LLM-assisted : the script includes: visible-page detection / delayed retries while the details page is still rendering / mutation-based reattachment / cleanup of blocks from previously viewed series / watchdog checks for cases where Jellyfin re-renders the page structure

## Need Help?
- Don't hesitate to open an [issue](https://github.com/Damocles-fr/jellyfin-imdb-episodes-heatmap-ratings-grid/issues)
- **DM me** https://forum.jellyfin.org/u-damocles
- GitHub [**Damocles-fr**](https://github.com/Damocles-fr)

## License

MIT
