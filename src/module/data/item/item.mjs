import ItemBaseBoundless from "./_itemBase.mjs";

export default class ItemBoundless extends ItemBaseBoundless {
  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["BOUNDLESS.Item", ...super.LOCALIZATION_PREFIXES];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true }
    const { NumberField, StringField, HTMLField } = foundry.data.fields;
    const schema = {
      slots: new NumberField({ ...requiredInteger, initial: 0 }),
      damage: new NumberField({ ...requiredInteger, initial: 0 }),
      damageBonus: new NumberField({ ...requiredInteger, initial: 0 }),
      armor: new NumberField({ ...requiredInteger, initial: 0 }),
      uses: new NumberField({ ...requiredInteger, initial: 0 }),
      used: new NumberField({ ...requiredInteger, initial: 0 }),
      type: new StringField(),
      effets: new StringField(),
      notes: new HTMLField({}),
    };

    return Object.assign(super.defineSchema(), schema);
  }

}