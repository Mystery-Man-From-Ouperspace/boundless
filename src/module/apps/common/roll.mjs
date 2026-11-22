import { systemPath } from "../../constants.mjs";

/* -------------------------------------------------- */

/**
 * Roll a check and add a ChatMessage with the result.
 */
export async function rollCheck(rollAmount, rollLabel, position) {
  const speaker = foundry.documents.ChatMessage.getSpeaker();
  const roll = new foundry.dice.Roll(`${rollAmount}d6`);
  await roll.evaluate();

  let successCount = 0;
  let minimumRoll;
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
  }

  for (let i = 0; i < roll.dice.length; i++) {
    const results = roll.dice[i].results;
    for (let j = 0; j < results.length; j++) {
      if (results[j].result >= minimumRoll) {
        successCount++;
      }
    }
  }

  const renderedTemplate = await foundry.applications.handlebars.renderTemplate(
    systemPath("templates/shared/roll-message.hbs"),
    {
      maxSuccesses: successCount > 1,
      success: successCount > 0,
      rollLabel: rollLabel,
      position: `TYPES.Position.${position}`,
      formula: `${rollAmount}D`,
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
