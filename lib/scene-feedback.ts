export type SceneFeedbackTarget = {
  room: string;
  object: string;
  walkway: boolean;
  portalId?: string;
};

export const EMPTY_SCENE_FEEDBACK: SceneFeedbackTarget = {
  room: '',
  object: '',
  walkway: false,
};

/** One input owner for all scene feedback. DOM focus is retained for keyboard
 * navigation, but a pointer gesture must never inherit an old focused target. */
export function createSceneFeedback() {
  let input: 'pointer' | 'keyboard' | 'touch' = 'keyboard';
  let point: { x: number; y: number } | null = null;
  return {
    get input() {
      return input;
    },
    move(x: number, y: number, pointerType: string) {
      if (pointerType === 'touch') {
        input = 'touch';
        point = null;
      } else if (!point || point.x !== x || point.y !== y) {
        // Layout-driven pointer events at the same coordinates must not steal
        // keyboard feedback. The final real move is always retained.
        input = 'pointer';
        point = { x, y };
      }
    },
    press(x: number, y: number, pointerType: string) {
      input = pointerType === 'touch' ? 'touch' : 'pointer';
      point = pointerType === 'touch' ? null : { x, y };
    },
    keyboard() {
      input = 'keyboard';
    },
    reset() {
      input = 'pointer';
      point = null;
    },
    resolve(
      blocked: boolean,
      pointerTarget: (x: number, y: number) => SceneFeedbackTarget,
      focusTarget: () => SceneFeedbackTarget,
    ): SceneFeedbackTarget {
      if (blocked || input === 'touch') return EMPTY_SCENE_FEEDBACK;
      if (input === 'keyboard') return focusTarget();
      return point ? pointerTarget(point.x, point.y) : EMPTY_SCENE_FEEDBACK;
    },
  };
}
