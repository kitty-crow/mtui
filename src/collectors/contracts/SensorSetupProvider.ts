/** A host adapter prepares or checks its own sensor prerequisites. */
export interface SensorSetupProvider { run(): Promise<void> }
