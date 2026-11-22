import ActorBaseBoundless from "./_actorBase.mjs";

export default class NpcBoundless extends ActorBaseBoundless {
  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["BOUNDLESS.Npc", ...super.LOCALIZATION_PREFIXES];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const { NumberField } = foundry.data.fields;
    const schema = {
      armor: new NumberField(),
      damage: new NumberField(),
    };

    return Object.assign(super.defineSchema(), schema);
  }
}
