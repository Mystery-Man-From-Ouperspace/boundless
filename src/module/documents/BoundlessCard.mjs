/**
 * A simple extension that adds a hook at the end of data prep.
 */
export default class BoundlessCard extends foundry.documents.Card {
  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    /**
     * Flexible hook for modules to alter derived document data.
     * @param {BoundlessCard} card      The card preparing derived data.
     */
    Hooks.callAll("Boundless.prepareCardData", this);
  }
}
