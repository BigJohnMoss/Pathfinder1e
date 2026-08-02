function randomDie(sides, random) {
  return Math.floor(random() * sides) + 1;
}

export function rollDice(count, sides, modifier = 0, random = Math.random) {
  if (!Number.isInteger(count) || count < 1 || count > 100)
    throw new RangeError("Dice count must be between 1 and 100.");
  if (!Number.isInteger(sides) || sides < 2 || sides > 1000)
    throw new RangeError("Die sides must be between 2 and 1000.");
  if (!Number.isInteger(modifier) || modifier < -999 || modifier > 999)
    throw new RangeError("Modifier must be between -999 and 999.");
  const rolls = Array.from({ length: count }, () => randomDie(sides, random));
  const subtotal = rolls.reduce((total, roll) => total + roll, 0);
  return { count, sides, modifier, rolls, subtotal, total: subtotal + modifier };
}

export function parseDiceExpression(expression) {
  const match = String(expression).trim().match(/^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?$/i);
  if (!match) throw new TypeError("Dice expression must look like 1d20 or 2d6+3.");
  const modifier = match[3] ? Number(match[4]) * (match[3] === "-" ? -1 : 1) : 0;
  const parsed = { count: Number(match[1]), sides: Number(match[2]), modifier };
  rollDice(parsed.count, parsed.sides, parsed.modifier, () => 0);
  return parsed;
}

export function rollDiceExpression(expression, extraModifier = 0, random = Math.random) {
  const parsed = parseDiceExpression(expression);
  return rollDice(parsed.count, parsed.sides, parsed.modifier + extraModifier, random);
}

export function rollD20Check(modifier = 0, random = Math.random) {
  const result = rollDice(1, 20, modifier, random);
  return {
    ...result,
    natural: result.rolls[0],
    outcome: result.rolls[0] === 20 ? "natural-20" : result.rolls[0] === 1 ? "natural-1" : "normal",
  };
}

export function parseCriticalThreatRange(critical) {
  const match = String(critical).match(/^(?:(\d{1,2})\s*[^0-9]\s*)?20\s*\/\s*[^0-9]?(\d+)$/i);
  if (!match) return { minimum: 20, multiplier: 2 };
  return { minimum: match[1] ? Number(match[1]) : 20, multiplier: Number(match[2]) };
}

export function resolveAttackRoll(roll, armorClass, critical = "20/x2") {
  if (!Number.isInteger(armorClass) || armorClass < 1 || armorClass > 999)
    throw new RangeError("Armor Class must be between 1 and 999.");
  const threat = parseCriticalThreatRange(critical);
  const hit = roll.natural === 20 || (roll.natural !== 1 && roll.total >= armorClass);
  return {
    hit,
    criticalThreat: hit && roll.natural >= threat.minimum,
    armorClass,
    threatMinimum: threat.minimum,
    criticalMultiplier: threat.multiplier,
  };
}
