import ActorBaseBoundless from "./_actorBase.mjs";

export default class NpcBoundless extends ActorBaseBoundless {
  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["BOUNDLESS.Npc", ...super.LOCALIZATION_PREFIXES];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const { SchemaField, NumberField } = foundry.data.fields;
    const schema = {
      battle: new SchemaField({
        armor: new NumberField(),
        damage: new NumberField(),
        damageBonus: new NumberField(),

      }),
    };
    return Object.assign(super.defineSchema(), schema);
  }
}