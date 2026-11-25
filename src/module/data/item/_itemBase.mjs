export default class ItemBaseBoundless extends foundry.abstract.TypeDataModel {

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["Boundless.Item"];

  /** @inheritdoc */
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true }
    const { HTMLField } = foundry.data.fields;
    return {
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