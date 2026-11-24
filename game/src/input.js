// Keyboard and mouse input. Held keys steer and drive; one-shot presses (enter
// a car, pause, confirm, abilities, weapon switch) are queued as flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_SHOOT = 8;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const CONFIRM = new Set(['Enter', 'Space']);
const PAUSE = new Set(['Escape', 'KeyP']);
const ENTER = new Set(['KeyE']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const ABILITY = { KeyZ: 0, KeyX: 1, KeyC: 2 };
const WEAPON = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6 };

export function createInput(canvas) {
  let forward = false;
  let back = false;
  let left = false;
  let right = false;
  let run = false;
  let turn = 0;
  let actions = 0;
  let ability = -1;
  let weapon = -1;
  let mouseDown = false;
  let lastMouseX = 0;

  window.addEventListener('keydown', (event) => {
    if (FORWARD.has(event.code)) forward = true;
    else if (BACK.has(event.code)) back = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (RUN.has(event.code)) run = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (ENTER.has(event.code)) {
      if (!event.repeat) actions |= ACTION_ENTER;
    } else if (event.code in ABILITY) {
      if (!event.repeat) ability = ABILITY[event.code];
    } else if (event.code in WEAPON) {
      if (!event.repeat) weapon = WEAPON[event.code];
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (FORWARD.has(event.code)) forward = false;
    else if (BACK.has(event.code)) back = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (RUN.has(event.code)) run = false;
  });
  window.addEventListener('blur', () => {
    forward = back = left = right = run = false;
    mouseDown = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    lastMouseX = event.clientX;
    actions |= ACTION_SHOOT;
  });
  window.addEventListener('pointerup', () => {
    mouseDown = false;
  });
  window.addEventListener('pointermove', (event) => {
    if (mouseDown) {
      turn += (event.clientX - lastMouseX) * 0.004;
      lastMouseX = event.clientX;
    }
  });

  return {
    /** The held-keys frame the world steps with. */
    frame() {
      const out = {
        forward, back, left, right, run,
        turn,
        enter: Boolean(actions & ACTION_ENTER),
        shoot: Boolean(actions & ACTION_SHOOT) || mouseDown,
        ability,
        weapon,
      };
      turn = 0;
      ability = -1;
      weapon = -1;
      actions &= ~(ACTION_ENTER | ACTION_SHOOT);
      return out;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. Only
     * CONFIRM and PAUSE are owned here; ENTER and SHOOT belong to frame(),
     * which reads them every step — clearing them here would eat the press. */
    takeActions() {
      const taken = actions & (ACTION_CONFIRM | ACTION_PAUSE);
      actions &= ~(ACTION_CONFIRM | ACTION_PAUSE);
      return taken;
    },
  };
}
