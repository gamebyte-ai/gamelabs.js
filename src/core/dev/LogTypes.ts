export const LogTypes = {
  Info: "Info",
  Warning: "Warning",
  Error: "Error",
} as const;

export type LogType = (typeof LogTypes)[keyof typeof LogTypes];
