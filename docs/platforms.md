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
| Other graphics load and VRAM | Driver telemetry; Linux DRM counters where exposed | Driver-dependent | Driver-dependent |
| Processor temperature | Reported sensors | Reported sensors | Reported sensors, where supported |
| Additional fan, temperature, voltage and power channels | Linux hwmon | Optional WMI hardware-monitor provider | No additional native adapter included |

## Linux

The native adapters read `/sys/class/hwmon` and `/sys/class/drm`. Temperature inputs in milli-Celsius, voltages in millivolts and power in microwatts are converted to display/API units. Fan inputs are reported in RPM. Unreadable inputs remain unavailable.

Some distributions expose more processor temperatures after their usual `lm-sensors` package is installed. GPU enumeration can depend on PCI discovery utilities and an active graphics driver. `nvidia-smi` supplies NVIDIA measurements when installed with the vendor driver; available DRM files can supply GPU utilisation and VRAM counters for other adapters.

mTUI does not run sensor detection tools, write sysfs controls or change fan curves.

## Windows

Processor, memory and graphics readings use the Windows facilities supported by systeminformation. NVIDIA driver telemetry is discovered when `nvidia-smi` is available.

Additional motherboard and DIMM sensors can be exposed by a running **LibreHardwareMonitor** or **OpenHardwareMonitor** WMI provider. mTUI checks `root/LibreHardwareMonitor` followed by `root/OpenHardwareMonitor`. The query runs with the current user's permissions. mTUI does not install, start or elevate those programs.

If no provider is accessible, the extra sensor collector is marked unavailable. Processor, memory and graphics views continue to operate. Reported processor frequencies can be nominal or static, depending on the Windows API and driver.

## macOS

Processor load, per-thread usage, memory and graphics inventory use the OS information available to systeminformation. Temperature and graphics telemetry depend on the model, operating system and available sensor support. Unsupported values appear as N/A. A dedicated additional-sensor adapter is not included.

Reported processor frequencies can be nominal rather than instantaneous. On systems with shared graphics memory, the graphics detail view identifies that allocation model instead of assuming dedicated VRAM.

## Terminal compatibility

A dark terminal theme best matches mTUI's cyan, violet, green and amber accents. `--no-colour` uses the terminal's default colours, and `--ascii` replaces borders, meters and charts with ASCII characters. `--no-motion` disables the activity animation. Ink screen-reader mode is available through `INK_SCREEN_READER=true` and also disables animation.

The interface uses the alternate screen and restores the previous terminal content on a normal exit or handled termination. Below 70 columns or 24 rows it displays a resize message; `--once` remains useful for a printable overview.

## Network operation

The API uses `.env` in the current working directory. Change `MTUI_PORT` when the default port is already in use. A bind failure is reported at startup, and `--no-api` runs a local terminal independently of a listener.

From another computer, use the host's actual LAN address. `0.0.0.0` is the listener address, rather than a destination address. When a bearer token is configured, set the same `MTUI_TOKEN` on remote clients or include the HTTP authorisation header.

Pressing P in a local terminal pauses its shared monitor and leaves its API available with `paused: true`. Pressing P in a remote terminal pauses the client's polling; it does not pause the host. Use `bun run serve` for continuous monitoring without a terminal session.
