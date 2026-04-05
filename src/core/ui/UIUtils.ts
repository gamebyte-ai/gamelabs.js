export class UIUtils {
  static updateFields(base: string, overrides: string): string {
    return JSON.stringify({ ...JSON.parse(base), ...JSON.parse(overrides) });
  }
}
