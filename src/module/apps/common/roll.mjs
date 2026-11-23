import { systemPath } from "../../constants.mjs";

/* -------------------------------------------------- */

/**
 * Roll a check and add a ChatMessage with the result.
 */
export async function rollCheck(rollAmount, rollBonus, targetLabel, rollLabel, position, rollDamage) {
  const speaker = foundry.documents.ChatMessage.getSpeaker();
  const roll = new foundry.dice.Roll(`${rollAmount}d6`);
  await roll.evaluate();

  let successCount = 0;
  let minimumRoll = 5;
  switch (position) {
    case "absolute":
      minimumRoll = 1;
      break;
    case "good":
      minimumRoll = 4;
      break;
    case "standard":
      minimumRoll = 5;
      break;
    case "bad":
      minimumRoll = 6;
      break;
    case "impossible":
      minimumRoll = 7;
      break;
    default:;
  }

  for (let i = 0; i < roll.dice.length; i++) {
    const results = roll.dice[i].results;
    for (let j = 0; j < results.length; j++) {
      if (results[j].result >= minimumRoll) {
        successCount++;
      }
    }
  }

  const rollDamageWBonus = parseInt(roll.result)+parseInt(rollBonus);
  let formula = `${rollAmount}D`;
  if (rollDamage) {formula += `+${rollBonus}`};
  const renderedTemplate = await foundry.applications.handlebars.renderTemplate(
    systemPath("templates/shared/roll-message.hbs"),
    {
      rollDamage: rollDamage,
      rollDamageWBonus: rollDamageWBonus,
      maxSuccesses: successCount > 1,
      success: successCount > 0,
      rollLabel: rollLabel,
      targetLabel: targetLabel,
      position: `TYPES.Position.${position}`,
      formula: formula,
      rolls: roll.dice[0].results,
    },
  );

  const messageData = {
    speaker: speaker,
    content: renderedTemplate,
    rolls: [roll],
  };

  foundry.documents.ChatMessage.create(messageData);
}
