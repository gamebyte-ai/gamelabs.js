import * as THREE from "three";
import gsap from "gsap";
import { WorldViewBase, World, type IInstanceResolver, type IPointerInputHandler, type Unsubscribe } from "@gamebyte/gamelabsjs";
import type { CardClickedInfo, CardsDragReleaseInfo, DragEligibilityPredicate, IBoardView } from "./IBoardView";
import type { IBoardModel } from "../models/IBoardModel";
import type { IPile } from "../models/IPile";
import { SolitaireConfig } from "../SolitaireConfig";
import { SlotObject } from "./SlotObject";
import { CardObject } from "./CardObject";

const CARD_STACK_LIFT_Y = 0.001;
const DRAG_LIFT_Y = 0.4;
const DRAG_CARD_SUBLIFT_Y = 0.01;
const RELEASE_ANIMATION_DURATION = 0.18;
const RELEASE_ANIMATION_EASE = "power2.out";
const DRAG_START_THRESHOLD_PX = 5;
const QUICK_PLACEMENT_DURATION = 0.12;
const QUICK_PLACEMENT_LIFT_Y = 0.25;
const DEAL_PER_CARD_DURATION = 0.06;
const CARD_FLIP_HALF_DURATION = 0.08;

interface CardLookupEntry {
  readonly pile: IPile;
  readonly indexInPile: number;
  readonly faceUp: boolean;
  readonly cardObject: CardObject;
}

interface DragSession {
  readonly originPile: IPile;
  readonly fromIndex: number;
  readonly pointerId: number;
  /** Card at the bottom of the dragged stack — the anchor used to
   *  compute the release-animation target from the current model. */
  readonly bottomCardId: number;
}

interface PendingPickup {
  readonly pile: IPile;
  readonly fromIndex: number;
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startClientY: number;
}

export class BoardView extends WorldViewBase implements IBoardView, IPointerInputHandler {
  private _slotsRoot: THREE.Group | null = null;
  private _cardsRoot: THREE.Group | null = null;
  private _dragRoot: THREE.Group | null = null;
  private readonly _slotObjects: SlotObject[] = [];
  private readonly _cardObjects: CardObject[] = [];
  private readonly _cardLookup = new Map<number, CardLookupEntry>();

  private _world: World | null = null;
  private _config: SolitaireConfig | null = null;
  private _board: IBoardModel | null = null;

  private readonly _raycaster = new THREE.Raycaster();
  private readonly _ndc = new THREE.Vector2();
  private readonly _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly _groundHit = new THREE.Vector3();

  private _dragSession: DragSession | null = null;
  private _pendingPickup: PendingPickup | null = null;
  private _dragEligibility: DragEligibilityPredicate | null = null;
  private _releaseTween: gsap.core.Tween | null = null;
  private _quickPlacementTween: gsap.core.Timeline | null = null;
  private _dealTimeline: gsap.core.Timeline | null = null;
  private _flipTimeline: gsap.core.Timeline | null = null;
  private readonly _dragReleaseListeners = new Set<(info: CardsDragReleaseInfo) => void>();
  private readonly _cardClickListeners = new Set<(info: CardClickedInfo) => void>();
  private readonly _pileTapListeners = new Set<(pile: IPile) => void>();

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._world = resolver.getInstance(World);
    this._config = resolver.getInstance(SolitaireConfig);
  }

  public override postInitialize(): void {
    super.postInitialize();

    const scene = this.parent;
    if (scene instanceof THREE.Scene) {
      scene.fog = new THREE.Fog(0x0b0f14, 15, 50);
      if (!scene.getObjectByName("Solitaire.AmbientLight")) {
        const ambient = new THREE.AmbientLight(0xffffff, 1);
        ambient.name = "Solitaire.AmbientLight";
        scene.add(ambient);
      }
    }

    this._slotsRoot = new THREE.Group();
    this._slotsRoot.name = "Solitaire.SlotsRoot";
    this.add(this._slotsRoot);

    this._cardsRoot = new THREE.Group();
    this._cardsRoot.name = "Solitaire.CardsRoot";
    this.add(this._cardsRoot);

    this._dragRoot = new THREE.Group();
    this._dragRoot.name = "Solitaire.DragRoot";
    this.add(this._dragRoot);
  }

  public bindBoard(model: IBoardModel): void {
    this._board = model;
  }

  public refresh(): void {
    this._quickPlacementTween?.kill();
    this._quickPlacementTween = null;
    this._dealTimeline?.kill();
    this._dealTimeline = null;
    this._flipTimeline?.kill();
    this._flipTimeline = null;
    this.endDragSession();
    this.clearSlots();
    this.clearCards();
    if (!this._slotsRoot || !this._cardsRoot || !this._board || !this._config) return;

    for (const pile of this._board.allPiles) {
      const slotObject = this.createSlotObject(pile);
      slotObject.position.set(pile.worldX, 0, pile.worldZ);
      this._slotsRoot.add(slotObject);
      this._slotObjects.push(slotObject);

      this.renderCardsForPile(pile);
    }
  }

  public commitDragRelease(autoFlippedCardId: number | null): void {
    const session = this._dragSession;
    if (!session || !this._dragRoot || !this._board) {
      this.refresh();
      return;
    }
    const target = this.findCardWorldPosition(session.bottomCardId);
    if (!target) {
      this.refresh();
      return;
    }
    this._releaseTween?.kill();
    this._releaseTween = gsap.to(this._dragRoot.position, {
      x: target.x,
      y: 0,
      z: target.z,
      duration: RELEASE_ANIMATION_DURATION,
      ease: RELEASE_ANIMATION_EASE,
      onComplete: () => {
        this._releaseTween = null;
        this.playAutoFlipThenRefresh(autoFlippedCardId);
      },
    });
  }

  public animateQuickPlacement(cardId: number, autoFlippedCardId: number | null): void {
    if (!this._cardsRoot || !this._board) {
      this.refresh();
      return;
    }
    const entry = this._cardLookup.get(cardId);
    const target = this.findCardWorldPosition(cardId);
    if (!entry || !target) {
      this.refresh();
      return;
    }
    const cardObject = entry.cardObject;
    this._quickPlacementTween?.kill();
    const tl = gsap.timeline({
      onComplete: () => {
        this._quickPlacementTween = null;
        this.playAutoFlipThenRefresh(autoFlippedCardId);
      },
    });
    tl.to(cardObject.position, { x: target.x, z: target.z, duration: QUICK_PLACEMENT_DURATION, ease: "power2.in" }, 0);
    tl.to(cardObject.position, { y: QUICK_PLACEMENT_LIFT_Y, duration: QUICK_PLACEMENT_DURATION / 2, ease: "power1.out" }, 0);
    tl.to(cardObject.position, { y: target.y, duration: QUICK_PLACEMENT_DURATION / 2, ease: "power1.in" }, QUICK_PLACEMENT_DURATION / 2);
    this._quickPlacementTween = tl;
  }

  private playAutoFlipThenRefresh(autoFlippedCardId: number | null): void {
    if (autoFlippedCardId === null) {
      this.refresh();
      return;
    }
    const entry = this._cardLookup.get(autoFlippedCardId);
    if (!entry) {
      this.refresh();
      return;
    }
    this._flipTimeline?.kill();
    const tl = gsap.timeline({
      onComplete: () => {
        this._flipTimeline = null;
        this.refresh();
      },
    });
    this.appendCardFlip(tl, entry.cardObject, 0);
    this._flipTimeline = tl;
  }

  private appendCardFlip(tl: gsap.core.Timeline, cardObject: CardObject, startTime: number): void {
    // Squish-and-swap flip: scale.x → 0 (card edge-on), swap visible
    // face, scale.x → 1. With the meshes rotated −π/2 around X, local
    // X corresponds to world X, so this collapses the card into a
    // vertical line and back.
    tl.to(cardObject.scale, { x: 0, duration: CARD_FLIP_HALF_DURATION, ease: "power1.in" }, startTime);
    tl.call(() => cardObject.setFaceUp(true), undefined, startTime + CARD_FLIP_HALF_DURATION);
    tl.to(cardObject.scale, { x: 1, duration: CARD_FLIP_HALF_DURATION, ease: "power1.out" }, startTime + CARD_FLIP_HALF_DURATION);
  }

  public playDealAnimation(orderedCardIds: readonly number[], onComplete: () => void): void {
    if (!this._board || !this._cardsRoot) {
      onComplete();
      return;
    }
    if (orderedCardIds.length === 0) {
      onComplete();
      return;
    }

    // Phase 1 (synchronous): stack every to-be-dealt card on top of
    // the stock pile face-down. Index 0 in the order sits on top so
    // it's the first one to fly out. Older stock cards stay in place
    // beneath. This runs before the next frame is rendered, so the
    // player never sees the unanimated final-state layout.
    const stockX = this._board.stock.worldX;
    const stockZ = this._board.stock.worldZ;
    const stockBaseStackHeight = this._board.stock.cards.length;
    for (let i = 0; i < orderedCardIds.length; i++) {
      const entry = this._cardLookup.get(orderedCardIds[i]);
      if (!entry) continue;
      const stackY = (stockBaseStackHeight + (orderedCardIds.length - i)) * CARD_STACK_LIFT_Y;
      entry.cardObject.position.set(stockX, stackY, stockZ);
      entry.cardObject.setFaceUp(false);
    }

    // Phase 2: continuous deal. Card N+1's position tween starts the
    // moment card N has landed; flips run in parallel — when a card
    // ends face-up, its flip is scheduled at its landing time but the
    // deal cursor does not wait for the flip to finish before
    // dispatching the next card. Each flip animates its own
    // cardObject.scale.x, so parallel flips on different cards don't
    // conflict. The timeline's natural duration covers the trailing
    // flip on the last face-up card.
    this._dealTimeline?.kill();
    const dealTl = gsap.timeline({
      onComplete: () => {
        this._dealTimeline = null;
        onComplete();
      },
    });
    let time = 0;
    for (const cardId of orderedCardIds) {
      const entry = this._cardLookup.get(cardId);
      if (!entry) continue;
      const target = this.findCardWorldPosition(cardId);
      if (!target) continue;
      dealTl.to(
        entry.cardObject.position,
        {
          x: target.x,
          y: target.y,
          z: target.z,
          duration: DEAL_PER_CARD_DURATION,
          ease: "power1.out",
        },
        time,
      );
      // The _cardLookup entry's faceUp is the model state captured by
      // the initial refresh — true for the top of each tableau, false
      // for everything else. Schedule the flip at the landing time but
      // do not advance the deal cursor past it.
      if (entry.faceUp) {
        this.appendCardFlip(dealTl, entry.cardObject, time + DEAL_PER_CARD_DURATION);
      }
      time += DEAL_PER_CARD_DURATION;
    }
    this._dealTimeline = dealTl;
  }

  private findCardWorldPosition(cardId: number): { x: number; y: number; z: number } | null {
    if (!this._board) return null;
    for (const pile of this._board.allPiles) {
      for (let i = 0; i < pile.cards.length; i++) {
        if (pile.cards[i].id !== cardId) continue;
        const offset = pile.getCardOffset(i);
        return {
          x: pile.worldX + offset.x,
          y: CARD_STACK_LIFT_Y * (i + 1),
          z: pile.worldZ + offset.z,
        };
      }
    }
    return null;
  }

  public onCardsDragReleased(callback: (info: CardsDragReleaseInfo) => void): Unsubscribe {
    this._dragReleaseListeners.add(callback);
    return () => {
      this._dragReleaseListeners.delete(callback);
    };
  }

  public onCardClicked(callback: (info: CardClickedInfo) => void): Unsubscribe {
    this._cardClickListeners.add(callback);
    return () => {
      this._cardClickListeners.delete(callback);
    };
  }

  public onPileTapped(callback: (pile: IPile) => void): Unsubscribe {
    this._pileTapListeners.add(callback);
    return () => {
      this._pileTapListeners.delete(callback);
    };
  }

  public setDragEligibilityPredicate(predicate: DragEligibilityPredicate | null): void {
    this._dragEligibility = predicate;
  }

  // IPointerInputHandler — view performs its own raycast against card
  // and slot meshes, so `onThisObject` from the InputManager is ignored.
  public onPointerDown(event: PointerEvent, _onThisObject: boolean): void {
    if (this.isAnimating()) return;
    if (this._dragSession !== null || this._pendingPickup !== null) return;
    const hit = this.pickCard(event);
    if (hit) {
      if (this._dragEligibility && !this._dragEligibility(hit.pile, hit.fromIndex)) return;
      // Defer the drag visual until the pointer actually moves past
      // the click/drag threshold. A pointer-up before that point is
      // treated as a click (quick-placement candidate); after, as a
      // drag start. The card is not visually lifted while pending.
      this._pendingPickup = {
        pile: hit.pile,
        fromIndex: hit.fromIndex,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
      };
      return;
    }
    const pile = this.pickPile(event);
    if (pile === null) return;
    for (const cb of this._pileTapListeners) cb(pile);
  }

  public onPointerMove(event: PointerEvent, _onThisObject: boolean): void {
    if (this.isAnimating()) return;
    if (this._pendingPickup !== null && event.pointerId === this._pendingPickup.pointerId) {
      const dx = event.clientX - this._pendingPickup.startClientX;
      const dy = event.clientY - this._pendingPickup.startClientY;
      if (Math.hypot(dx, dy) < DRAG_START_THRESHOLD_PX) return;
      const pickup = this._pendingPickup;
      this._pendingPickup = null;
      this.beginDragSession(pickup.pile, pickup.fromIndex, event);
      return;
    }
    if (!this._dragSession) return;
    if (event.pointerId !== this._dragSession.pointerId) return;
    const ground = this.projectToGround(event);
    if (!ground || !this._dragRoot) return;
    this._dragRoot.position.set(ground.x, DRAG_LIFT_Y, ground.z);
  }

  public onPointerUp(event: PointerEvent, _onThisObject: boolean): void {
    if (this.isAnimating()) return;
    if (this._pendingPickup !== null && event.pointerId === this._pendingPickup.pointerId) {
      // Click: pointer-up with no significant movement. The drag was
      // never started so there's no visual state to revert.
      const info: CardClickedInfo = {
        pile: this._pendingPickup.pile,
        fromIndex: this._pendingPickup.fromIndex,
      };
      this._pendingPickup = null;
      for (const cb of this._cardClickListeners) cb(info);
      return;
    }
    if (!this._dragSession) return;
    if (event.pointerId !== this._dragSession.pointerId) return;
    const targetPile = this.pickPile(event);
    const info: CardsDragReleaseInfo = {
      originPile: this._dragSession.originPile,
      fromIndex: this._dragSession.fromIndex,
      targetPile,
    };
    // _dragSession stays set; the controller calls commitDragRelease
    // which runs the settling animation and clears it on completion.
    for (const cb of this._dragReleaseListeners) cb(info);
  }

  public onPointerCancel(_event: PointerEvent): void {
    if (this.isAnimating()) return;
    if (this._pendingPickup !== null) {
      this._pendingPickup = null;
      return;
    }
    if (!this._dragSession) return;
    const info: CardsDragReleaseInfo = {
      originPile: this._dragSession.originPile,
      fromIndex: this._dragSession.fromIndex,
      targetPile: null,
    };
    for (const cb of this._dragReleaseListeners) cb(info);
  }

  private isAnimating(): boolean {
    return this._releaseTween !== null || this._quickPlacementTween !== null || this._dealTimeline !== null || this._flipTimeline !== null;
  }

  private beginDragSession(originPile: IPile, fromIndex: number, event: PointerEvent): void {
    if (!this._dragRoot) return;
    const entries = this.collectPileEntriesFrom(originPile, fromIndex);
    if (entries.length === 0) return;
    const offset = originPile.stackingOffset;

    for (const entry of entries) {
      const co = entry.cardObject;
      co.removeFromParent();
      this._dragRoot.add(co);
      const stackIndex = entry.indexInPile - fromIndex;
      co.position.set(offset.x * stackIndex, DRAG_CARD_SUBLIFT_Y * (stackIndex + 1), offset.z * stackIndex);
    }

    this._dragSession = {
      originPile,
      fromIndex,
      pointerId: event.pointerId,
      bottomCardId: entries[0].cardObject.cardId,
    };

    const ground = this.projectToGround(event);
    if (ground) this._dragRoot.position.set(ground.x, DRAG_LIFT_Y, ground.z);
  }

  private endDragSession(): void {
    this._releaseTween?.kill();
    this._releaseTween = null;
    this._dragSession = null;
    if (this._dragRoot) this._dragRoot.position.set(0, 0, 0);
  }

  private collectPileEntriesFrom(pile: IPile, fromIndex: number): CardLookupEntry[] {
    const entries: CardLookupEntry[] = [];
    for (const entry of this._cardLookup.values()) {
      if (entry.pile === pile && entry.indexInPile >= fromIndex) entries.push(entry);
    }
    entries.sort((a, b) => a.indexInPile - b.indexInPile);
    return entries;
  }

  private pickCard(event: PointerEvent): { pile: IPile; fromIndex: number } | null {
    if (!this._world) return null;
    if (!this.updatePointerNdc(event)) return null;
    const meshes: THREE.Mesh[] = [];
    for (const entry of this._cardLookup.values()) {
      if (entry.faceUp) meshes.push(...entry.cardObject.getPickableMeshes());
    }
    if (meshes.length === 0) return null;
    this._raycaster.setFromCamera(this._ndc, this._world.activeCamera);
    const hits = this._raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    const cardId = (hits[0].object.userData as { cardId?: number }).cardId;
    if (typeof cardId !== "number") return null;
    const entry = this._cardLookup.get(cardId);
    if (!entry) return null;
    return { pile: entry.pile, fromIndex: entry.indexInPile };
  }

  private pickPile(event: PointerEvent): IPile | null {
    if (!this._world) return null;
    if (!this.updatePointerNdc(event)) return null;
    const meshes: THREE.Mesh[] = [];
    // The pile's hit area always matches what the player sees as
    // representing the pile right now. Empty piles expose the slot
    // rectangle. Non-empty piles are addressed only through their
    // topmost card — cards earlier in a fanned tableau are visible
    // but are not drop targets.
    for (const slotObject of this._slotObjects) {
      const pile = slotObject.pile;
      if (pile.cards.length === 0) {
        meshes.push(slotObject.fillMesh);
        continue;
      }
      const topCard = pile.topCard;
      if (topCard === null) continue;
      const entry = this._cardLookup.get(topCard.id);
      // Skip if the topmost card is currently being dragged — that
      // pile has no visible representation right now.
      if (!entry || entry.cardObject.parent !== this._cardsRoot) continue;
      meshes.push(...entry.cardObject.getHitTestMeshes());
    }
    if (meshes.length === 0) return null;
    this._raycaster.setFromCamera(this._ndc, this._world.activeCamera);
    const hits = this._raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    const data = hits[0].object.userData as { pile?: IPile; cardId?: number };
    if (data.pile) return data.pile;
    if (typeof data.cardId === "number") {
      const entry = this._cardLookup.get(data.cardId);
      if (entry) return entry.pile;
    }
    return null;
  }

  private projectToGround(event: PointerEvent): { x: number; z: number } | null {
    if (!this._world) return null;
    if (!this.updatePointerNdc(event)) return null;
    this._raycaster.setFromCamera(this._ndc, this._world.activeCamera);
    const hit = this._raycaster.ray.intersectPlane(this._groundPlane, this._groundHit);
    if (!hit) return null;
    return { x: this._groundHit.x, z: this._groundHit.z };
  }

  private updatePointerNdc(event: PointerEvent): boolean {
    if (!this._world) return false;
    const canvas = this._world.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    this._ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return true;
  }

  private renderCardsForPile(pile: IPile): void {
    if (!this._cardsRoot || !this._config) return;
    for (let i = 0; i < pile.cards.length; i++) {
      const card = pile.cards[i];
      const offset = pile.getCardOffset(i);
      const cardObject = new CardObject(card, this._config.cardVisual);
      cardObject.position.set(pile.worldX + offset.x, CARD_STACK_LIFT_Y * (i + 1), pile.worldZ + offset.z);
      this._cardsRoot.add(cardObject);
      this._cardObjects.push(cardObject);
      this._cardLookup.set(card.id, {
        pile,
        indexInPile: i,
        faceUp: card.faceUp,
        cardObject,
      });
    }
  }

  private createSlotObject(pile: IPile): SlotObject {
    if (!this._config) throw new Error("BoardView: config not injected");
    return new SlotObject({
      pile,
      width: this._config.slotWidth,
      height: this._config.slotHeight,
      palette: this._config.slotPalettes[pile.type],
    });
  }

  private clearSlots(): void {
    for (const slotObject of this._slotObjects) {
      slotObject.removeFromParent();
      slotObject.dispose();
    }
    this._slotObjects.length = 0;
  }

  private clearCards(): void {
    for (const cardObject of this._cardObjects) {
      cardObject.removeFromParent();
      cardObject.dispose();
    }
    this._cardObjects.length = 0;
    this._cardLookup.clear();
  }

  public override preDestroy(): void {
    this._dragReleaseListeners.clear();
    this._cardClickListeners.clear();
    this._pileTapListeners.clear();
    this._dragEligibility = null;
    this._pendingPickup = null;
    this._quickPlacementTween?.kill();
    this._quickPlacementTween = null;
    this._dealTimeline?.kill();
    this._dealTimeline = null;
    this._flipTimeline?.kill();
    this._flipTimeline = null;
    this.endDragSession();
    this.clearSlots();
    this.clearCards();
    if (this._slotsRoot) {
      this._slotsRoot.removeFromParent();
      this._slotsRoot = null;
    }
    if (this._cardsRoot) {
      this._cardsRoot.removeFromParent();
      this._cardsRoot = null;
    }
    if (this._dragRoot) {
      this._dragRoot.removeFromParent();
      this._dragRoot = null;
    }
    this._board = null;
    this._config = null;
    this._world = null;
    super.preDestroy();
  }
}
