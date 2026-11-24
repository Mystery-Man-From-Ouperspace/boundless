export default class ActorBaseBoundless extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["Boundless.Actor"];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true }
    const { SchemaField, NumberField, HTMLField } = foundry.data.fields;
    return {
      hitPoints: new SchemaField({
        current: new NumberField({ ...requiredInteger, initial: 0 }),
        max: new NumberField({ ...requiredInteger, initial: 0 }),
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
