export default class ActorBaseBoundless extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["Boundless.Actor"];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const { SchemaField, NumberField, HTMLField } = foundry.data.fields;
    return {
      hitPoints: new SchemaField({
        current: new NumberField(),
        max: new NumberField(),
      }),
      notes: new HTMLField({}),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
  }
}
