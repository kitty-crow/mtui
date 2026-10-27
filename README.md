# mTUI

**Your hardware, clearly.**

```text
           _____ _   _ ___
 _ __ ___ |_   _| | | |_ _|
| '_ ` _ \  | | | | | || |
| | | | | | | | | |_| || |
|_| |_| |_| |_|  \___/|___|
```

mTUI (monitor TUI) is a Bun application for monitoring graphics adapters, processor cores, memory and hardware sensors. A compact overview leads into dedicated detail screens. The same telemetry is available through a standalone JSON API and a remote terminal client.

![mTUI overview with simulated telemetry](assets/overview.svg)

## Start monitoring

Requires **Bun 1.4.4 or later** on Linux, Windows or macOS. The terminal interface fits **70 × 24** cells; **110 × 32** gives charts and sensor summaries more room.

```sh
git clone https://github.com/kitty-crow/mtui.git
cd mtui
bun install --frozen-lockfile
```

Copy `.env.example` to `.env` and choose the API port:

```dotenv
MTUI_PORT=9700
```

Start the terminal and its LAN API:

```sh
bun run start
```

Use `bun run demo` to explore the interface with simulated hardware. Demo mode is labelled in the terminal and JSON responses.

## Views

| View | Contents |
| --- | --- |
| Overview | Processor and memory usage, GPU comparison table, reported thermals and cooling |
| Graphics | All adapters, selected GPU details, VRAM, clocks, power, fan duty and history |
| Processor | Package load and temperature, per-thread utilisation, user/kernel load and clocks |
| Memory | Active, available and cached memory, swap allocation and installed modules |
| Sensors | Reported temperatures, fan speeds, power and voltages, with source and freshness |

Press **1–5** to change views, **Tab** to cycle, **↑/↓** to scroll and **←/→** to select a GPU. **P** pauses monitoring, **R** refreshes, **+/-** adjusts the sampling delay, **?** opens help and **Q** exits. mTUI restores the previous terminal screen on exit.

Readings use **N/A** when a driver does not expose a measurement. A stopped fan can report **0%** or **0 RPM**; these are valid values. Failed collectors retain their last successful values with a **stale** status and original timestamp.

## LAN API and remote terminals

The API listens on **0.0.0.0** using `MTUI_PORT` from `.env`. Run it independently of the terminal:

```sh
bun run serve
```

Connect a terminal on another computer:

```sh
bun run start --connect http://192.168.1.50:9700
```

The remote client displays the host's hardware and handles connection loss with stale readings. It does not inspect the client's hardware or start another API listener.

| Endpoint | Reading |
| --- | --- |
| `/gpu` | All installed graphics adapters |
| `/gpu/1` | The second adapter |
| `/gpu/0/temp` | GPU temperature |
| `/gpu/0/vram/used` | Allocated graphics memory in bytes |
| `/proc/cores/0/usage` | First logical processor utilisation |
| `/ram` | Memory, swap and module inventory |
| `/sensors` | All sensor channels shown in the interface |
| `/snapshot` | Complete, versioned telemetry snapshot |
| `/history` | Timestamped chart data |

Append property names and array indices to inspect resource objects at any depth. For example, `/ram/modules/0/size` returns the first installed module's capacity. Read the [API reference](docs/api.md) for envelopes, units, authentication and error codes.

Set `MTUI_TOKEN` in the host's `.env` to enable bearer authentication. Set the same variable on a remote TUI client. API requests then use `Authorization: Bearer <token>`.

## Command line

```sh
bun run start --no-api                  # Local terminal only
bun run start --once                    # Print one overview
bun run start --json                    # Print one complete JSON snapshot
bun run start --interval 2000           # Delay between completed samples
bun run start --history 300             # Retain 300 samples per chart
bun run start --no-colour --no-motion   # Plain colours and a static activity marker
bun run start --ascii                   # ASCII borders, meters and charts
```

When stdin or stdout is redirected, mTUI prints one overview and exits. `--serve` runs continuously without a TTY. `--once` and `--json` do not start a listener. `--help` lists all options.

## Hardware support

CPU load, per-thread usage and memory statistics use the operating system's counters. Graphics and temperature coverage varies with drivers, firmware and permissions. NVIDIA driver telemetry is discovered through `nvidia-smi` when available; Linux DRM counters supplement graphics readings. Linux hwmon and optional Windows LibreHardwareMonitor/OpenHardwareMonitor WMI providers supply extra sensors.

Available CPU sensor channels feed the processor overview and JSON metrics as well as the Sensors screen. NVIDIA memory temperatures are queried independently of load and fan counters, so an unsupported thermal channel does not interrupt other GPU readings. Missing measurements are `null` in JSON and appear as `N/A` with an unavailable status in the sensor table.

Platform adapters discover existing providers automatically. On Windows, CPU and motherboard temperatures require an active compatible hardware-monitor WMI provider; mTUI reports when none is accessible. Hardware access may require additional permissions on any operating system. A sensor that the hardware or driver does not expose remains unavailable.

The [platform guide](docs/platforms.md) describes available readings and common gaps. Temperature colours are visual guides at 75°C and 90°C, rather than device-specific thermal limits.

## Build and development

```sh
bun run validate
bun run build
```

The build produces `dist/mtui` or `dist/mtui.exe`, including the Bun runtime. `bun run build` also runs validation. The **Validate and build** GitHub Actions workflow is started manually and builds on Linux, Windows and macOS.

The source is organised around typed domain models, replaceable collectors, a monitoring engine, HTTP resources and terminal views. Start with the [architecture guide](docs/architecture.md) to add a collector or screen.
