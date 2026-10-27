export const discovery = {
  product: 'mTUI', schemaVersion: 1,
  routes: {
    '/health': 'Readiness and collector states', '/system': 'Host identity and monitor state',
    '/snapshot': 'Complete versioned telemetry snapshot', '/schema': 'Snapshot JSON Schema',
    '/gpu': 'All graphics adapters, indexed from zero', '/gpu/0': 'One graphics adapter',
    '/gpu/0/temp': 'GPU temperature in Celsius', '/gpu/0/fan': 'GPU fan duty in percent',
    '/gpu/0/vram/used': 'GPU memory allocation in bytes', '/proc': 'Processor package and logical cores',
    '/proc/cores/0/usage': 'One logical core utilisation in percent', '/ram': 'Memory, swap and installed modules',
    '/ram/used': 'Active memory in bytes', '/sensors': 'All reported sensors with individual freshness',
    '/sensors/0/value': 'One sensor measurement', '/history': 'Bounded timestamped chart series',
  },
  traversal: 'Append an object property or zero-based array index to any resource path.',
  aliases: { 'gpu/:index/temp': 'temperature', 'gpu/:index/fan': 'fanPercent', 'gpu/:index/vram': '{total, used, usage}', 'proc/temp': 'temperature', 'ram/used': 'active' },
  units: { memory: 'bytes', utilisation: '%', temperature: '°C', processorSpeed: 'GHz', graphicsClock: 'MHz', memoryModuleSpeed: 'MHz as reported', power: 'W', fanDuty: '%', fanSpeed: 'RPM', timestamps: 'Unix milliseconds' },
  freshness: 'Each resource includes status, updatedAt and message. Null measurements are unsupported or unavailable; zero is a valid reading.',
} as const;
