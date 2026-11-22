/**
 * A simple extension that adds a hook at the end of data prep.
 */
export default class BoundlessChatMessage extends foundry.documents.ChatMessage {
  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    /**
     * Flexible hook for modules to alter derived document data.
     * @param {BoundlessChatMessage} message      The chat message preparing derived data.
     */
    Hooks.callAll("Boundless.prepareChatMessageData", this);
  }
}
