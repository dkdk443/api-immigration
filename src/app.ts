import { MAX_TRUST } from './data/world';
import type { GameState } from './types';

/** 進行中のゲーム。タイトル画面では null */
export const app: { state: GameState | null } = { state: null };

export function freshState(over: Partial<GameState> = {}): GameState {
  return {
    day:0, list:[], idx:0, score:0, trust:MAX_TRUST, total:0, correct:0, half:0, reports:0, phantomsSeen:0, falseReports:0, misses:[], phase:'notice',
    clock:9*60, dayStats:{ok:0, n:0, miss:0, score0:0, rep:0, phantoms:0, phCaught:0}, shiftLen:1, shiftEnd:Infinity,
    cur:null, used:{}, t0:0, rows:[], marks:{}, report:false, sayTyper:null, leave:'', pausedAt:null, tut:null,
    ...over
  };
}
