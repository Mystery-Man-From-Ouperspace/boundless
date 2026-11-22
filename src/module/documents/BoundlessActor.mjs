/**
 * A simple extension that adds a hook at the end of data prep.
 */
export default class BoundlessActor extends foundry.documents.Actor {
  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    /**
     * Flexible hook for modules to alter derived document data.
     * @param {BoundlessActor} actor      The actor preparing derived data.
     */
    Hooks.callAll("Boundless.prepareActorData", this);
  }
}
