export interface IStatsPanel {
  get isVisible(): boolean;
  show(show: boolean): void;
  destroy(): void;
}

