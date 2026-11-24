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
        armor: new NumberField({ ...requiredInteger, initial: 0 }),
        damage: new NumberField({ ...requiredInteger, initial: 0 }),
        damageBonus: new NumberField({ ...requiredInteger, initial: 0 }),

      }),
    };
    return Object.assign(super.defineSchema(), schema);
  }
}