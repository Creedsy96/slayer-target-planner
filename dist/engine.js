/* Pure calculations. The catalogue and saved preferences are supplied explicitly. */
(function (root) {
  'use strict';
  const sum = (rows, fn) => rows.reduce((total, row) => total + fn(row), 0);
  const alphabet = (a, b) => a.localeCompare(b, 'en', {sensitivity: 'base'});
  const slowFirst = (a, b) => b.minutes - a.minutes || alphabet(a.id, b.id);

  function taskRows(data, master, settings, overrides) {
    const lookup = new Map(data.creatures.map(c => [c.id, {...c, ...overrides[c.id]}]));
    return master.tasks.map(task => {
      const creature = lookup.get(task.id);
      const kills = settings.extended && task.extendedMax > 0
        ? (task.extendedMin + task.extendedMax) / 2 : (task.minimum + task.maximum) / 2;
      const seconds = creature.hp / (settings.dps * creature.multiplier) + settings.delay;
      const reason = creature.level > settings.level ? `Requires Slayer ${creature.level}`
        : creature.excluded ? 'Excluded in task inputs' : '';
      return {...task, name: creature.name, minutes: kills * seconds / 60 + settings.overhead,
        reward: master.choices > 1 ? (creature.pointsMin + creature.pointsMax) / 2 * settings.modifierChance
          : master.basePoints * (settings.streak ? 1.775 : 1),
        reason, blocked: false, probability: 0, skip: 0};
    });
  }

  function applyBlocks(rows, master, settings) {
    const slots = master.blockKind === 'regular' ? settings.blocks
      : master.blockKind === 'mortimer' ? settings.mortimerBlocks : 0;
    rows.filter(r => !r.reason && r.id !== settings.target)
      .sort((a,b) => b.weight-a.weight || slowFirst(a,b))
      .slice(0, slots).forEach(row => { row.blocked = true; });
    return rows.filter(r => !r.reason && !r.blocked && r.weight > 0);
  }

  function selectionProbabilities(rows, requestedChoices, target) {
    const total = sum(rows, r => r.weight);
    const choices = Math.min(requestedChoices, rows.length);
    if (!choices) return;
    if (choices === 1) {
      rows.forEach(r => { r.probability = r.weight / total; });
      return;
    }
    // Enumerate ordered draws without replacement; each offer picks the target,
    // or the shortest other task. Ties follow the workbook's slow-rank order.
    function draw(selected, remainingWeight, probability) {
      if (selected.length === choices) {
        const chosen = selected.find(r => r.id === target)
          || selected.reduce((best, r) => slowFirst(best, r) < 0 ? r : best);
        chosen.probability += probability;
        return;
      }
      for (const row of rows) {
        if (!selected.includes(row)) draw([...selected, row], remainingWeight-row.weight,
          probability * row.weight / remainingWeight);
      }
    }
    draw([], total, 1);
  }

  function balanceSkips(rows, skipCost, target) {
    let budget = sum(rows, r => r.probability * r.reward);
    for (const row of rows.filter(r => r.id !== target).sort(slowFirst)) {
      const cost = row.probability * (skipCost + row.reward);
      if (cost <= 1e-14) { row.skip = budget > 1e-12 ? 1 : 0; continue; }
      row.skip = Math.max(0, Math.min(1, budget / cost));
      budget = Math.max(0, budget - row.skip * cost);
    }
  }

  function calculate(data, master, settings, overrides = {}) {
    const rows = taskRows(data, master, settings, overrides);
    const active = applyBlocks(rows, master, settings);
    selectionProbabilities(active, master.choices, settings.target);
    balanceSkips(active, master.skipCost, settings.target);
    const chance = sum(active.filter(r => r.id === settings.target), r => r.probability);
    const nonTarget = active.filter(r => r.id !== settings.target);
    const cycle = sum(active, r => r.probability * ((1-r.skip)*r.minutes+r.skip*settings.skipSeconds/60));
    const completed = sum(active, r => r.probability*(1-r.skip));
    const spent = sum(active, r => r.probability*r.skip*master.skipCost);
    const earned = sum(active, r => r.probability*(1-r.skip)*r.reward);
    const targetRow = rows.find(r => r.id === settings.target);
    const boundaryRow = active.find(r => r.skip > 1e-9 && r.skip < 1-1e-9);
    return {master, rows, chance, available: chance > 0,
      reason: chance > 0 ? '' : targetRow?.reason || 'Cannot assign this creature',
      hours: chance ? sum(nonTarget,r=>r.probability*r.minutes)/chance/60 : null,
      sustainableHours: chance ? sum(nonTarget,r=>r.probability*((1-r.skip)*r.minutes+r.skip*settings.skipSeconds/60))/chance/60 : null,
      average: sum(active,r=>r.probability*r.minutes),
      afterSkips: completed ? sum(active,r=>r.probability*(1-r.skip)*r.minutes)/completed : 0,
      offers: chance ? 1/chance : null, blocks: rows.filter(r=>r.blocked),
      fullSkips: active.filter(r=>r.skip>=1-1e-9).length,
      boundary: boundaryRow?.skip || 0, boundaryName: boundaryRow?.name || '',
      skippedPercent: sum(active,r=>r.probability*r.skip),
      pointsSpent: cycle ? spent*60/cycle : 0, pointsEarned: cycle ? earned*60/cycle : 0};
  }

  root.SlayerEngine = {calculate, selectionProbabilities};
  if (typeof module !== 'undefined') module.exports = root.SlayerEngine;
})(globalThis);
