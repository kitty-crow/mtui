# Architecture

mTUI separates acquisition, monitoring, transport and presentation. Terminal rendering and HTTP handlers consume the same snapshot; neither performs hardware discovery.

## Source map

| Location | Responsibility |
| --- | --- |
| `src/domain/` | Hardware values, units, reading states and snapshot contracts |
| `src/collectors/contracts/` | Replaceable collector interface |
| `src/collectors/shared/` | Normalisation and cached inventory queries |
| `src/collectors/system/` | Portable systeminformation adapters and data mappers |
| `src/collectors/native/` | Read-only Linux sysfs and Windows WMI adapters |
| `src/collectors/linux/` | Firmware DIMM discovery, Intel PMU sampling and telemetry parsing |
| `src/collectors/windows/` | Headless hardware reader, pinned sensor dependencies and PowerShell transport |
| `src/collectors/demo/` | Generic simulated workstation scenario |
| `src/monitoring/` | Provider isolation, snapshot acquisition, polling, history and sensor catalogue |
| `src/api/config/` | Listener configuration from the environment |
| `src/api/resources/` | JSON projections and the versioned wire contract |
| `src/api/routing/` | Read-only routes, datapoint traversal and units |
| `src/api/transport/` | Bun HTTP lifecycle, JSON responses and authentication |
| `src/remote/` | HTTP client, schema validation and connection recovery |
| `src/ui/` | Resource screens, reusable components, navigation, layout and theme |
| `src/application/` | Composition and local, headless and terminal session lifecycles |
| `src/cli/` | Argument parsing and command-line help |
| `scripts/` | Validation, executable builds and preview generation |
| `test/` | Collector, API, lifecycle, input and layout tests |

## Snapshot lifecycle

`SessionFactory` assembles collectors in a `CollectorRegistry`. `LocalSnapshotSource` samples the four registered topics concurrently. Each `CollectorSlot` limits how long the polling cycle waits for its provider and retains its last successful value.

`MonitorEngine` publishes completed snapshots to subscribers, then schedules the next cycle. Its interval is the delay after a completed sample, rather than a fixed wall-clock frequency. Manual refreshes share an active cycle. Pause stops scheduled acquisition and is reported by the API.

The terminal subscribes once through `useMonitor`. Pure React class components render snapshots and navigation state. Small hook components handle terminal input, window size and the activity marker. Ink owns terminal layout, raw input and alternate-screen restoration.

The API reads the current snapshot and history directly. Multiple HTTP requests do not multiply hardware queries. Headless mode starts the same engine and listener without mounting the terminal interface.

## Availability and time

Each topic is a `Reading<T>` containing a value, status, successful-update timestamp and diagnostic message.

| Status | Meaning |
| --- | --- |
| `waiting` | Initial discovery has not completed |
| `live` | The last acquisition completed successfully |
| `stale` | A previous value remains available after an acquisition error |
| `unavailable` | No successful value is available, or the collector is not registered |

A missing metric is `null`; an actual zero remains zero. Portable driver sentinels are normalised at the collector boundary. Native hwmon values retain the driver's numeric reading, including zero.

Snapshot and reading timestamps use Unix milliseconds. Each reading's timestamp follows the successful acquisition, including a slow result consumed on a subsequent cycle. A timeout never changes the timestamp of retained data. A still-running collector is not started again until its result has been consumed.

## Units and identity

Capacities are bytes in the domain and API; terminal capacities use binary units. Processor frequency is GHz, graphics clocks are MHz, temperatures are Celsius, power is watts and utilisation is percent. GPU fan duty and measured fan RPM remain separate quantities.

GPU histories are keyed by device identifier, preferably PCI address. Table indices and `/gpu/:index` refer to the current enumeration. They can change after a hardware or driver change. Consumers tracking a particular adapter can use its `id`.

Logical processor indices belong to the scheduler. Reported core temperature sensors are kept separately because their enumeration can describe physical cores, packages or a subset of hardware.

## Retained history

`HistoryStore` retains a bounded series for processor usage and temperature, active memory utilisation, and each GPU's usage and temperature. Its default capacity is 120 samples per series. Each point contains its acquisition timestamp and a number or gap.

Failed acquisitions append gaps. Removed adapters have their series pruned. New arrays are published for changed series so pure view components can detect chart updates. The `/history` endpoint exposes the exact stored points.

## Adding a collector

1. Implement `Collector<T>` for a topic's domain type. Keep host-specific calls behind an injectable boundary such as `SystemApi`, `FileAccess` or `CommandRunner`.
2. Put unit conversions and driver sentinel handling in a focused mapper.
3. Register the collector in `SessionFactory`. `registry.remove(topic)` disables a provider; the corresponding view and resource report it as unavailable.
4. Add fixture-based tests for supported readings, missing metrics and failure cases.

`CpuCollector`, `MemoryCollector`, `GraphicsCollector` and `SensorCollector` are independent defaults. Inventory queries are cached separately from changing measurements. The demo collectors implement the same contract.

Physical memory discovery implements `MemoryInventorySource`. `MemoryInventory` uses portable discovery and an optional host adapter, while `MemoryModuleMapper` rejects aggregate placeholders. `MemoryCollector` starts discovery in the background and reads its cached result without delaying allocation samples. Inventory diagnostics are published separately from allocation counters. `DmiMemoryParser` handles individual firmware records and configured DDR transfer rates without combining identical modules.

A new platform sensor source implements `SensorSource`. `PlatformFactory` selects it at composition time. `SensorCatalogue` combines those channels with processor and GPU temperature/fan readings for the interface and API.

`LinuxGraphics` matches DRM samples to graphics adapters by PCI address. `IntelGraphics` merges optional PMU readings from `IntelGpuSampler`, with JSON interpretation isolated in `IntelTelemetryParser`. `CapturedTimeoutRunner` retains the final stdout from a bounded GNU timeout window, including normal timeout exit status 124. Sampling selects a specific DRM card; the same adapter diagnostics travel through the shared snapshot and JSON API.

## Adding a screen

Screens receive `ScreenProps` and render without side effects. Shared table, gauge, chart, notice and panel components provide consistent behaviour. Register a new screen in `ScreenHost` and its navigation entry in `NavigationController` and `Navigation`.

Rows are budgeted from the terminal dimensions, including borders, headers and pagination. Table widths are terminal cells, and long driver-provided labels are sanitised and truncated. Layout tests render every view at multiple widths and heights; input tests exercise the actual Ink keyboard path.

## Remote sessions

`RemoteClient` retrieves `/snapshot`, applies optional bearer authentication and validates the versioned payload with `payloadSchema`. `RemoteSnapshotSource` supplies the host snapshot to the same `MonitorEngine` used locally. It retains host identity and uptime.

A failed connection preserves the host's last values and marks them stale. A paused host is also shown as stale by the remote session. Remote keyboard controls affect the client's sampling, selection and display; the API exposes no remote control operations.

## Building

`bun run validate` checks maintained source and runs the test suite. `bun run build` validates, runs host sensor setup, compiles a native executable and exercises its version, JSON snapshot and printable terminal modes. `SensorBuildSetup` invokes the same platform-neutral `SensorSetup` operation exposed by `--setup-sensors`. `PlatformFactory` supplies the appropriate `SensorSetupProvider`: native sensor checks or the Windows library/driver preparation adapter. Existing PawnIO installations are retained. `--skip-sensor-setup` produces an executable without running host preparation, as used by CI.

Build helpers live in `.mts` files. The manual GitHub workflow builds on Ubuntu, Windows and macOS and uploads the resulting executables. Users of downloaded artifacts can run the executable with `--setup-sensors` on the monitored host. `bun run preview` regenerates documentation images from simulated frames rendered by the same interface components.
