import type {Profile} from '../domain/types';
import {derivedQuestPoints,QUEST_POINTS} from '../rules/quest-points';
import {escapeHtml as esc} from './html';

export function questPointSummary(p:Profile):string{
  const total=derivedQuestPoints(p),derived=total.complete?`${total.minimum} quest points from completed quests`:`At least ${total.minimum} confirmed quest points; ${total.missing} quest reward records missing${total.unmapped.length?`; ${total.unmapped.length} unrecognised started/completed quests`:''}`;
  return `${p.questPoints!==null?`Using ${p.questPoints} quest points (manual override). `:''}${derived}.`;
}
export function renderQuestPoints(p:Profile,compact=false):string{
  return `<div class="quest-point-setting"><label>Quest points (manual override)<input type="number" data-setting="questPoints" min="0" max="1000" value="${p.questPoints??''}" placeholder="Automatic from quests"></label><p class="small muted">${esc(questPointSummary(p))}</p>${p.questPoints!==null?'<button type="button" class="text-button" data-action="quest-points-auto">Use quest-derived total</button>':''}${compact?'':`<p class="small muted">Used for Slayer block slots: one per 50 QP, up to six, plus Lumbridge Elite. Missing quests stay unknown; partial lists provide confirmed minimum slots. <a href="${esc(QUEST_POINTS.source.url)}" target="_blank" rel="noopener">Reward source</a> · captured ${QUEST_POINTS.captured}.</p>`}</div>`;
}
