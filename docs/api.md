# JSON API

mTUI starts its read-only API with the local terminal or through `bun run serve`. Bun loads `.env` from the working directory. The listener binds to `0.0.0.0`, and the default port is 9700.

```dotenv
MTUI_PORT=9700
# Optional:
# MTUI_TOKEN=a-shared-secret
```

Use the host's LAN address from other computers. For example, `http://192.168.1.50:9700/gpu`. When `MTUI_TOKEN` is configured, include `Authorization: Bearer <token>` on every request, including health and discovery routes. Remote TUI clients read their token from the same environment variable.

## Routes

| Route | Response |
| --- | --- |
| `/` or `/api` | Discovery, route examples, aliases and units |
| `/health` | Readiness and individual collector states |
| `/system` | Host identity, version, uptime and monitor state |
| `/snapshot` | Complete schema-versioned snapshot |
| `/schema` | JSON Schema for `/snapshot` |
| `/gpu` | All adapters, with current enumeration indices |
| `/gpu/0` | First adapter overview |
| `/gpu/0/temp` | GPU temperature, Celsius |
| `/gpu/0/memoryTemperature` | GPU memory temperature, Celsius |
| `/gpu/0/usage` | GPU engine utilisation, percent |
| `/gpu/0/fan` | Fan duty, percent |
| `/gpu/0/power` | Current power, watts |
| `/gpu/0/powerLimit` | Reported power limit, watts |
| `/gpu/0/coreClock` | Core clock, MHz |
| `/gpu/0/memoryClock` | Memory clock, MHz |
| `/gpu/0/vram` | Allocated bytes, capacity and occupancy percentage |
| `/proc` | Processor package and logical processors |
| `/proc/temp` | Processor package temperature, Celsius |
| `/proc/coreTemperatures` | Separately enumerated temperature sensors |
| `/proc/cores` | Logical processor measurements |
| `/proc/cores/0` | First logical processor |
| `/proc/cores/0/usage` | Logical processor utilisation, percent |
| `/proc/cores/0/speed` | Reported logical processor frequency, GHz |
| `/ram` | Memory, swap and module overview |
| `/ram/used` | Active memory, bytes |
| `/ram/available` | Available memory, bytes |
| `/ram/cached` | Buffer/cache memory, bytes |
| `/ram/swapUsed` | Allocated swap, bytes |
| `/ram/modules/0` | First installed memory module |
| `/sensors` | All channels displayed in the Sensors view |
| `/sensors/0/value` | First sensor's value, with its unit |
| `/history` | All retained chart series |

Properties remain addressable below these routes. `/gpu/0/vram/used`, `/ram/modules/0/size`, `/proc/cores/0/system` and `/snapshot/readings/cpu/status` are examples. Object keys are case-sensitive; array indices start at zero.

GPU `temp` aliases `temperature`, `fan` aliases `fanPercent`, and `vram` groups `memoryTotal`, `memoryUsed` and `memoryUsage`. Processor `temp` aliases `temperature`; RAM `used` aliases `active`.

## Resource envelope

Hardware routes return an envelope. An individual temperature request looks like:

```json
{
  "schemaVersion": 1,
  "resource": "/gpu/0/temp",
  "status": "live",
  "updatedAt": 1793095200000,
  "message": null,
  "unit": "°C",
  "value": 62
}
```

`value` can be a number, string, boolean, object, array or `null`, depending on the path. `unit` describes scalar measurements; compound objects use the units below. Sensor entries also carry their own status, timestamp, source and unit because a catalogue can combine several providers.

`updatedAt` is the successful-acquisition timestamp, in Unix milliseconds. `stale` readings retain that timestamp and value, accompanied by the collector diagnostic. `null` means a measurement is unavailable. **Zero is a valid reading**, including stopped fans and idle processors.

## Complete snapshot

`/snapshot` returns `schemaVersion`, `product`, `version`, `host`, `demo`, `intervalMs`, `paused` and `snapshot`. The snapshot contains `sequence`, `sampledAt`, `uptime` and the four typed readings: `cpu`, `memory`, `graphics` and `sensors`.

`/system`, `/snapshot` and `/history` return their objects directly, rather than a resource envelope. Every field below those objects is traversable. `/schema` describes the complete snapshot contract for client generation or validation.

## Units

| Measurement | API unit |
| --- | --- |
| Memory, VRAM, module capacity, swap | bytes |
| GPU, memory and processor utilisation | percent, 0–100 |
| Temperature | °C |
| Processor frequency | GHz |
| Graphics and reported module clocks | MHz |
| Power | W |
| Fan duty | percent |
| Measured fan speed | RPM |
| Voltage | V |
| Timestamps | Unix milliseconds |
| Uptime | seconds |

`memoryUsage` is allocated VRAM as a percentage of capacity. It does not represent memory-engine activity. Active RAM excludes reclaimable cache; `available` can include it. Temperature sensors retain their reporting driver's identity and are not assumed to correspond one-to-one with logical processors.

## History

History is a JSON object of arrays containing `{ "at": <timestamp>, "value": <number-or-null> }` points. Keys include `cpu.usage`, `cpu.temperature`, `memory.usage`, `gpu.<device-id>.usage` and `gpu.<device-id>.temperature`.

For one series, use `/history/cpu.usage` or percent-encode a GPU history key as a single path segment. The sample limit is configured when the host starts, using `--history`. Failed readings produce gaps; unplugged adapters have their histories removed.

## HTTP behaviour

| Status | Meaning |
| --- | --- |
| 200 | Available resource; individual unsupported metrics can still be `null` |
| 400 | Malformed request path |
| 401 | Missing or invalid configured bearer token |
| 404 | Unknown resource, device index or property |
| 405 | Method other than GET or HEAD |
| 503 | Requested hardware resource has no available value, or health is still starting |

Errors use `{ "error": { "code": "...", "message": "..." } }`. Unavailable hardware resources return their reading envelope with `value: null`. Responses use `application/json`, `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. HEAD returns the equivalent status and headers without a body.

The server publishes the latest completed sample. Requests do not trigger a collection, and no endpoint changes hardware settings or the host's monitoring state.
