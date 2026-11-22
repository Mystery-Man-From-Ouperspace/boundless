/**
 * A simple extension that adds a hook at the end of data prep.
 */
export default class BoundlessUser extends foundry.documents.User {
  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    /**
     * Flexible hook for modules to alter derived document data.
     * @param {BoundlessUser} user      The user preparing derived data.
     */
    Hooks.callAll("Boundless.prepareUserData", this);
  }
}
