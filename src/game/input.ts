export interface FrameInput {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  actionPressed: boolean;
  pausePressed: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
  pointerX: number;
  pointerY: number;
  clicked: boolean;
}

type Hold = 'left' | 'right' | 'jump' | 'action';

const KEY: Record<string, Hold | 'pause'> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  KeyE: 'action',
  Enter: 'action',
  Escape: 'pause',
  KeyP: 'pause',
};

export class Input {
  private keys: Record<Hold, boolean> = { left: false, right: false, jump: false, action: false };
  private padHeld: Record<Hold, boolean> = { left: false, right: false, jump: false, action: false };
  private held: Record<Hold, boolean> = { left: false, right: false, jump: false, action: false };
  private queue: Record<Hold | 'pause', boolean> = { left: false, right: false, jump: false, action: false, pause: false };
  private prev: Record<Hold, boolean> = { left: false, right: false, jump: false, action: false };
  private pointer = { x: 0, y: 0, queued: false };
  frame: FrameInput = {
    left: false,
    right: false,
    jumpHeld: false,
    jumpPressed: false,
    actionPressed: false,
    pausePressed: false,
    leftPressed: false,
    rightPressed: false,
    pointerX: 0,
    pointerY: 0,
    clicked: false,
  };

  constructor(canvas: HTMLCanvasElement, touchRoot: HTMLElement) {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      const mapped = KEY[event.code];
      if (!mapped) return;
      event.preventDefault();
      if (mapped === 'pause') this.queue.pause = true;
      else {
        this.keys[mapped] = true;
        this.queue[mapped] = true;
      }
    });
    window.addEventListener('keyup', (event) => {
      const mapped = KEY[event.code];
      if (!mapped || mapped === 'pause') return;
      this.keys[mapped] = false;
    });
    window.addEventListener('blur', () => {
      this.keys = { left: false, right: false, jump: false, action: false };
      this.syncHeld();
    });
    canvas.addEventListener('pointerdown', (event) => {
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
    });
    canvas.addEventListener('pointermove', (event) => {
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
    });
    canvas.addEventListener('pointerup', (event) => {
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.queued = true;
    });
    touchRoot.querySelectorAll<HTMLButtonElement>('[data-hold]').forEach((button) => {
      const name = button.dataset.hold as Hold;
      const down = (event: PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        button.setPointerCapture(event.pointerId);
        this.keys[name] = true;
        this.queue[name] = true;
      };
      const up = (event: PointerEvent) => {
        event.preventDefault();
        this.keys[name] = false;
      };
      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointercancel', up);
      button.addEventListener('lostpointercapture', up);
    });
  }

  begin(): FrameInput {
    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      const axis = pad.axes[0] ?? 0;
      this.edgePad('left', axis < -0.35 || Boolean(pad.buttons[14]?.pressed));
      this.edgePad('right', axis > 0.35 || Boolean(pad.buttons[15]?.pressed));
      this.edgePad('jump', Boolean(pad.buttons[0]?.pressed));
      this.edgePad('action', Boolean(pad.buttons[1]?.pressed || pad.buttons[2]?.pressed));
      const pause = Boolean(pad.buttons[9]?.pressed);
      if (pause && !this.padPause) this.queue.pause = true;
      this.padPause = pause;
    } else {
      this.padHeld = { left: false, right: false, jump: false, action: false };
    }
    this.syncHeld();
    const edge = (name: Hold) => this.queue[name] || (this.held[name] && !this.prev[name]);
    this.frame = {
      left: this.held.left,
      right: this.held.right,
      jumpHeld: this.held.jump,
      jumpPressed: edge('jump'),
      actionPressed: edge('action'),
      pausePressed: this.queue.pause,
      leftPressed: edge('left'),
      rightPressed: edge('right'),
      pointerX: this.pointer.x,
      pointerY: this.pointer.y,
      clicked: this.pointer.queued,
    };
    this.queue = { left: false, right: false, jump: false, action: false, pause: false };
    this.prev = { ...this.held };
    this.pointer.queued = false;
    return this.frame;
  }

  private padPause = false;
  private padWas: Record<Hold, boolean> = { left: false, right: false, jump: false, action: false };

  private edgePad(name: Hold, down: boolean): void {
    if (down && !this.padWas[name]) this.queue[name] = true;
    this.padHeld[name] = down;
    this.padWas[name] = down;
  }

  private syncHeld(): void {
    this.held = {
      left: this.keys.left || this.padHeld.left,
      right: this.keys.right || this.padHeld.right,
      jump: this.keys.jump || this.padHeld.jump,
      action: this.keys.action || this.padHeld.action,
    };
  }
}
