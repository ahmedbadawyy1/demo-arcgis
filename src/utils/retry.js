function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(operation, { attempts = 2, delayMs = 500, onRetry } = {}) {
  let lastError;
  for (let i = 0; i <= attempts; i += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i === attempts) break;
      if (onRetry) onRetry(error, i + 1);
      await wait(delayMs * (i + 1));
    }
  }
  throw lastError;
}

module.exports = { withRetry };
