import * as PIXI from 'pixi.js';
import { ScreenView } from '@gamebyte/gamelabsjs';
import type { IGameScreenView } from './IGameScreenView';

export class GameScreenView extends ScreenView implements IGameScreenView {
  private readonly _title = new PIXI.Text({
    text: '',
    style: {
      fill: 0xffffff,
      fontSize: 32,
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontWeight: '700',
    },
  });

  public override postInitialize(): void {
    super.postInitialize();
    this._title.anchor.set(0.5, 0);
    this.addChild(this._title);
  }

  public setTitle(title: string): void {
    this._title.text = title;
  }

  public override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    this._title.x = width / 2;
    this._title.y = 32;
  }
}
