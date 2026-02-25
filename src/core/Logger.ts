import type { ILogger } from "./ILogger.js";
import type { LogPanel } from "./LogPanel.js";

export class LogItem {
  public readonly message: string;
  public next: LogItem | null = null;

  public constructor(message: string) {
    this.message = message;
  }
}

export class Logger implements ILogger {
  private _panel: LogPanel | null = null;
  private _pendingVisible = false;

  private _itemsHead: LogItem | null = null;
  private _itemsTail: LogItem | null = null;

  public constructor() {}

  public attachPanel(panel: LogPanel): void {
    if (this._panel === panel) return;
    this._panel = panel;
    this._panel.show(this._pendingVisible);

    let it = this._itemsHead;
    while (it) {
      this._panel.log(it.message);
      it = it.next;
    }
  }

  public detachPanel(): void {
    this._panel = null;
  }

  public resize(width: number, height: number): void {
    this._panel?.resize(width, height);
  }

  public get isVisible(): boolean {
    return this._panel?.isVisible ?? this._pendingVisible;
  }

  public show(show: boolean): void {
    this._pendingVisible = show;
    this._panel?.show(show);
  }

  public log(message: string): void {
    const item = new LogItem(message);
    if (!this._itemsHead || !this._itemsTail) {
      this._itemsHead = item;
      this._itemsTail = item;
    } else {
      this._itemsTail.next = item;
      this._itemsTail = item;
    }

    this._panel?.log(message);
  }
}

