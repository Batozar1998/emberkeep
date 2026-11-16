// Keyboard and mouse, read by the main loop: which keys were just pressed,
// where the pointer is, and which clicks happened since the last frame.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';
export const ACTION_SPEED = 'speed';
export const ACTION_UPGRADE = 'upgrade';
export const ACTION_SELL = 'sell';
export const ACTION_DESELECT = 'deselect';

export function createInput(canvas) {
  const pressed = new Set();
  const clicks = [];
  let mouseX = -1;
  let mouseY = -1;
  let mouseInside = false;

  function keyAction(code) {
    switch (code) {
      case 'Enter': case 'Space': return ACTION_CONFIRM;
      case 'KeyP': case 'Escape': return ACTION_PAUSE;
      case 'KeyR': return ACTION_RESTART;
      case 'KeyM': return ACTION_MUTE;
      case 'KeyF': return ACTION_SPEED;
      case 'KeyU': return ACTION_UPGRADE;
      case 'KeyX': return ACTION_SELL;
      case 'Digit1': return 'tower-spire';
      case 'Digit2': return 'tower-frost';
      case 'Digit3': return 'tower-cannon';
      default: return null;
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const action = keyAction(event.code);
    if (action) {
      pressed.add(action);
      if (event.code === 'Space') event.preventDefault();
    }
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    mouseInside = true;
  });
  canvas.addEventListener('mouseleave', () => { mouseInside = false; });
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    clicks.push({
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    });
  });

  return {
    // Actions pressed since the last call, then cleared.
    takePressed() {
      const out = [...pressed];
      pressed.clear();
      return out;
    },
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
    get mouse() {
      return { x: mouseX, y: mouseY, inside: mouseInside };
    },
  };
}
