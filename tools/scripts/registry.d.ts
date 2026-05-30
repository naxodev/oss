// The owner teardown awaits a refcount drain, so the stop callback may
// be async. Non-owner teardowns are sync; either shape is accepted.
declare function stopLocalRegistry(): void | Promise<void>;
