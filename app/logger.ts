// Lightweight logger. Debug-level output (`log`/`info`) is compiled out of
// release builds — NativeScript's webpack sets `__DEV__` to `false` there — so
// the app stops shipping verbose BLE traffic logs to end users. Warnings and
// errors always print, since they matter in production too.

export const log = (...args: unknown[]): void => {
  if (__DEV__) console.log(...args);
};

export const info = (...args: unknown[]): void => {
  if (__DEV__) console.info(...args);
};

export const warn = (...args: unknown[]): void => {
  console.warn(...args);
};

export const error = (...args: unknown[]): void => {
  console.error(...args);
};
