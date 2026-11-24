import ActorBaseBoundless from "./_actorBase.mjs";

export default class PlayerBoundless extends ActorBaseBoundless {
  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["BOUNDLESS.Player", ...super.LOCALIZATION_PREFIXES];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true }
    const { NumberField, SchemaField } = foundry.data.fields;
    const schema = {
      strength: new SchemaField({
        current: new NumberField({ ...requiredInteger, initial: 0 }),
        max: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
      presence: new SchemaField({
        current: new NumberField({ ...requiredInteger, initial: 0 }),
        max: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
      agility: new SchemaField({
        current: new NumberField({ ...requiredInteger, initial: 0 }),
        max: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
      willpower: new SchemaField({
        current: new NumberField({ ...requiredInteger, initial: 0 }),
        max: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
    };

    return Object.assign(super.defineSchema(), schema);
  }
}
