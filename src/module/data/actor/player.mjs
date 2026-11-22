import ActorBaseBoundless from "./_actorBase.mjs";

export default class PlayerBoundless extends ActorBaseBoundless {
  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["BOUNDLESS.Player", ...super.LOCALIZATION_PREFIXES];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const { NumberField, SchemaField } = foundry.data.fields;
    const schema = {
      strength: new SchemaField({
        current: new NumberField(),
        max: new NumberField(),
      }),
      presence: new SchemaField({
        current: new NumberField(),
        max: new NumberField(),
      }),
      agility: new SchemaField({
        current: new NumberField(),
        max: new NumberField(),
      }),
      willpower: new SchemaField({
        current: new NumberField(),
        max: new NumberField(),
      }),
    };

    return Object.assign(super.defineSchema(), schema);
  }
}
