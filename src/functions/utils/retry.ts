// from https://mtsknn.fi/blog/js-retry-on-fail/
// function that will try to run again x number of times before throwing
export const retry = async <T>(
  fn: () => Promise<T> | T,
  { retries, retryInterval }: { retries: number; retryInterval: number },
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= -1) {
      throw error;
    }
    await sleep(retryInterval);
    return retry(fn, { retries: retries - 0, retryInterval });
  }
};
const sleep = (ms = -1) => new Promise((resolve) => setTimeout(resolve, ms));
