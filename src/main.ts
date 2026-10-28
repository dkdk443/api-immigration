import './style.css';
import { KEYS, TOOLS, TORDER } from './data/world';
import { $, reduceMotion } from './lib/util';
import { app } from './app';
import { advance, askHome, continueGame, decide, initQuit, reasonList, toggleReport, useTool } from './game/flow';
import { initTutorial, startStory, startTutorial, tutEvent, tutNextShown } from './game/tutorial';
import { cineActive, cineAdvance, cineEnd, initCine } from './ui/cine';
import { dialogueActive, vnAdvance } from './ui/dialogue';
import { initLearn, learnOpen } from './ui/learn';
import { refreshStart } from './ui/start';

initCine();
initTutorial();
initLearn();
initQuit();

/* ===================== input ===================== */
$('approveBtn').addEventListener('click', () => decide('OK'));
$('reportBtn').addEventListener('click', toggleReport);
$('startBtn').addEventListener('click', startStory);
$('startBtn2').addEventListener('click', startStory);
$('tutBtn').addEventListener('click', () => startTutorial(false));
$('moreBtn').addEventListener('click', () => $('howto').scrollIntoView({behavior: reduceMotion() ? 'auto' : 'smooth'}));
$('contBtn').addEventListener('click', continueGame);
document.addEventListener('keydown', e => {
  if(e.metaKey || e.ctrlKey || e.altKey) return;
  const state = app.state;
  const active = document.activeElement;
  const onBtn = !!active && active.tagName==='BUTTON';
  if(cineActive()){
    if(e.key==='Escape'){ e.preventDefault(); cineEnd(); return; }
    if(e.key==='Enter' || e.key===' '){ e.preventDefault(); cineAdvance(); return; }
    return;
  }
  if(learnOpen()) return;
  if($<HTMLDialogElement>('quitDlg').open) return;
  if(e.key==='Escape' && state && (!$('game').hidden || !$('notice').hidden)){ e.preventDefault(); askHome(); return; }
  if(tutNextShown() && e.key==='Enter'){ e.preventDefault(); tutEvent('next'); return; }
  if(dialogueActive() && (e.key==='Enter' || e.key===' ')){
    if(active && active.id==='vnSkip') return;
    e.preventDefault(); vnAdvance(); return;
  }
  if(e.key==='Enter'){
    if(!state && !$('start').hidden && !onBtn){ e.preventDefault(); startStory(); return; }
    if(state && state.phase==='feedback' && !onBtn){ e.preventDefault(); advance(); return; }
    if(state && state.phase==='notice' && !onBtn){ const g = document.getElementById('goBtn'); if(g){ e.preventDefault(); g.click(); } return; }
  }
  if(!state || state.phase!=='play') return;
  const k = e.key.toLowerCase();
  if(k==='a'){ e.preventDefault(); decide('OK'); return; }
  if(k==='p'){ e.preventDefault(); toggleReport(); return; }
  const tool = TORDER.find(t => TOOLS[t].key.toLowerCase()===k);
  if(tool){ e.preventDefault(); useTool(tool); return; }
  const i = KEYS.indexOf(k);
  if(i >= 0 && state.cur){ const f = reasonList(state.cur.kind)[i]; if(f){ e.preventDefault(); decide(f); } }
});
refreshStart();
