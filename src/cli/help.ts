export const help = `mTUI · monitor TUI

Usage: bun run start [options]
       mtui [options]

  --interval <ms>   Sampling delay, 250–10000 ms (default 1000)
  --history <n>     Samples retained per chart, 10–3600 (default 120)
  --demo            Explore with clearly labelled simulated telemetry
  --once            Print one overview and exit
  --json            Print one snapshot as JSON and exit
  --serve           Run only the LAN API, without a terminal interface
  --connect <url>   Monitor another mTUI host through its API
  --setup-sensors   Install Windows hardware-sensor support (administrator)
  --no-api          Run a local terminal without starting the API
  --no-colour       Disable terminal colours
  --no-motion       Disable the activity animation
  --ascii           Use ASCII borders, charts and meters
  --help, -h        Show this help
  --version, -v     Show the version

Keys: 1–5 views · Tab next · arrows scroll/select · P pause
      R refresh · +/- interval · ? help · Q quit

API: .env MTUI_PORT=9700 · binds 0.0.0.0 · optional MTUI_TOKEN
`;
