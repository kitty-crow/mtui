# Platforms and readings

mTUI runs on Linux, Windows and macOS through Bun. The terminal and JSON API use the same data, including availability diagnostics. The runtime operating system, hardware drivers and firmware determine the measurements that are exposed.

## Coverage

| Reading | Linux | Windows | macOS |
| --- | --- | --- | --- |
| Processor and per-thread usage | OS counters | OS counters | OS counters |
| RAM and swap | OS counters | OS counters | OS counters |
| Memory module inventory | When exposed | When exposed | When exposed |
| Graphics inventory | Driver/OS discovery | Driver/OS discovery | OS discovery |
| NVIDIA load, clocks, power and fan duty | Driver telemetry | Driver telemetry | Generally unavailable |
| Intel graphics load, clocks and GPU power | i915/Xe sysfs and optional Intel PMU tools, where supported | Driver-dependent | Driver-dependent |
| Other graphics load and VRAM | Driver telemetry; Linux DRM counters where exposed | Driver-dependent | Driver-dependent |
| Processor temperature | Reported sensors | Reported sensors | Reported sensors, where supported |
| Additional fan, temperature, voltage and power channels | Linux hwmon | Integrated headless library or existing WMI provider | No additional native adapter included |

## Linux

`bun run build` runs the host's sensor setup automatically. `--setup-sensors` invokes the same operation independently when using downloaded executables or running from source without building. The native setup adapter checks accessible sensor channels and processor temperature support, and reports their availability.

The native adapters read `/sys/class/hwmon` and `/sys/class/drm`. Temperature inputs in milli-Celsius, voltages in millivolts and power in microwatts are converted to display/API units. Fan inputs are reported in RPM. Unreadable inputs remain unavailable.

Some distributions expose more processor temperatures after their usual `lm-sensors` package is installed. GPU enumeration can depend on PCI discovery utilities and an active graphics driver. `nvidia-smi` supplies NVIDIA measurements when installed with the vendor driver; available DRM files can supply GPU utilisation and VRAM counters for other adapters.

mTUI does not run sensor detection tools, write sysfs controls or change fan curves.

### Intel graphics

Integrated graphics appear alongside discrete adapters, including on headless hosts. Intel integrated models use shared system memory. A PCI memory aperture reported by enumeration is not treated as dedicated VRAM or as the amount of system RAM available to graphics.

The Linux adapter matches DRM cards by PCI address, reads the bound driver, and checks accessible i915 frequency files. With `intel_gpu_top` from the distribution's Intel GPU tools package, it also collects short JSON samples of performance counters. On Ubuntu, install `intel-gpu-tools`; the bounded sampling helper uses `timeout` from `coreutils`. Authorise restricted counter reads with `sudo -v` in the same terminal before launching mTUI. Monitoring never prompts for a password or changes global kernel permission settings.

Intel load is the busiest reported GPU engine's utilisation, rather than a sum that could exceed 100%. Clocks use actual frequency where exposed, and power uses GPU-domain watts only. CPU package power, CPU temperatures and system RAM capacity are not substituted for missing GPU measurements. The helper selects the matched DRM card explicitly and stops after a bounded sampling window, including with tool versions that have no sample-count flag.

Missing counters remain N/A, with an availability message in adapter details and `/gpu/0/telemetryMessage`. The same readings are available through `/gpu/0/usage`, `/gpu/0/coreClock`, `/gpu/0/power` and `/gpu/0/sharedMemory`. Hardware without a separate GPU temperature channel, fan sensor or dedicated memory budget continues to report those fields as unavailable.

### Physical memory inventory

DIMM count, capacity and configured speed come from firmware records, separately from live RAM usage. mTUI discards aggregate library fallbacks rather than presenting total RAM as a single module. On Linux it also queries `dmidecode --type 17`, including when the utility is outside the current PATH. Empty slots are excluded, and identical installed modules remain separate rows.

Install your distribution's `dmidecode` package if needed. Firmware reads commonly require administrator access. Run `sudo -v` in the same terminal before starting mTUI to authorise a non-interactive, read-only query. mTUI never prompts for a password during monitoring. If the credentials expire, renew them and allow up to a minute for inventory discovery to refresh. Virtual machines and some firmware do not expose physical module details even with administrator access.

DDR speeds are displayed in MT/s, using configured speed when available and rated speed otherwise. The JSON API includes `/ram/modules`, `/ram/modules/0/size`, `/ram/modules/0/transferRate` (MT/s), and `/ram/inventoryMessage`. The legacy `clockSpeed` field retains the hardware library's reported numeric value. Missing inventory does not affect live RAM or swap counters.

## Windows

Processor, memory and graphics readings use the Windows facilities supported by systeminformation. NVIDIA driver telemetry is discovered when `nvidia-smi` is available.

An existing **LibreHardwareMonitor** or **OpenHardwareMonitor** WMI provider is reused when available. Otherwise, mTUI loads LibreHardwareMonitorLib 0.9.6 in a hidden PowerShell worker. The worker opens the hardware once, updates CPU, motherboard, memory, GPU and controller sensors on demand, and closes its hardware handles when mTUI exits. This works over SSH and without a desktop session.

The shared build and `--setup-sensors` entry points select this host adapter automatically. Run them from an administrator terminal. This adapter prepares LibreHardwareMonitorLib 0.9.6 and installs PawnIO 2.2.0 when no PawnIO installation is present; an existing driver installation is retained. Downloads come from official, versioned releases and are checked against pinned SHA-256 digests before extraction or execution.

If you downloaded an executable, ran `bun run build --skip-sensor-setup`, or run from source without building, setup is a separate one-time step:

```powershell
.\mtui.exe --setup-sensors
```

For a source checkout, use `bun run start --setup-sensors` instead, as on other platforms. A successful local build already performs this step. A restart is needed only when the installer reports it. Subsequent local hardware reads require an administrator session; remote API clients do not. Monitoring itself never installs a driver or opens an elevation prompt.

The library and its dependencies are cached in `%LOCALAPPDATA%\mTUI\sensors\lhm-0.9.6`. First-use preparation requires internet access; polling is offline after preparation. When using different Windows accounts, prepare the library for each account. mTUI does not start the LibreHardwareMonitor GUI or publish a WMI namespace.

If hardware access is unavailable, the sensor collector reports a short diagnostic while processor load, memory and graphics monitoring continue. A missing driver, insufficient privileges and an unsupported hardware channel are different conditions. Reported processor frequencies can be nominal or static, depending on the Windows API and driver.

## macOS

The build invokes sensor setup automatically. `--setup-sensors` can also be run separately. The native setup adapter checks available readings and reports the host's current sensor coverage.

Processor load, per-thread usage, memory and graphics inventory use the OS information available to systeminformation. Temperature and graphics telemetry depend on the model, operating system and available sensor support. Unsupported values appear as N/A. A dedicated additional-sensor adapter is not included.

Reported processor frequencies can be nominal rather than instantaneous. On systems with shared graphics memory, the graphics detail view identifies that allocation model instead of assuming dedicated VRAM.

## Terminal compatibility

A dark terminal theme best matches mTUI's cyan, violet, green and amber accents. `--no-colour` uses the terminal's default colours, and `--ascii` replaces borders, meters and charts with ASCII characters. `--no-motion` disables the activity animation. Ink screen-reader mode is available through `INK_SCREEN_READER=true` and also disables animation.

The interface uses the alternate screen and restores the previous terminal content on a normal exit or handled termination. Below 70 columns or 24 rows it displays a resize message; `--once` remains useful for a printable overview.

## Network operation

The API uses `.env` in the current working directory. Change `MTUI_PORT` when the default port is already in use. A bind failure is reported at startup, and `--no-api` runs a local terminal independently of a listener.

From another computer, use the host's actual LAN address. `0.0.0.0` is the listener address, rather than a destination address. When a bearer token is configured, set the same `MTUI_TOKEN` on remote clients or include the HTTP authorisation header.

Pressing P in a local terminal pauses its shared monitor and leaves its API available with `paused: true`. Pressing P in a remote terminal pauses the client's polling; it does not pause the host. Use `bun run serve` for continuous monitoring without a terminal session.
