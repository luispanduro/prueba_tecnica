'use strict';
// Stub for until-async (ESM-only package used by msw's experimental API).
async function until(callback) {
  try {
    return [null, await callback()];
  } catch (error) {
    return [error, null];
  }
}
module.exports = { until };
