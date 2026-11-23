import BOUNDLESS from "../../config.mjs";
import { rollCheck } from "../common/roll.mjs";
import { systemPath } from "../../constants.mjs";

const { api, sheets } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications.
 */
export class BoundlessActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheet) {
  static MAXITEMS = 10;

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["boundless", "actor", "standard-form"],
    position: {
      width: 600,
      height: "auto",
    },
    actions: {
      viewDoc: this.#viewDoc,
      createDoc: this.#createDoc,
      deleteDoc: this.#deleteDoc,
      addItem: this.#addItem,
      rollDice: this.#rollDice,
    },
    form: {
      submitOnChange: true,
    },
  };

  /* -------------------------------------------------- */

  static TABS = {
    primary: {
      tabs: [
        {
          id: "attributes",
        },
        {
          id: "items",
        },
        {
          id: "notes",
        },
      ],
      initial: "attributes",
      labelPrefix: "Boundless.Sheets.Tabs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: systemPath("templates/actor/header.hbs"),
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    attributes: {
      template: systemPath("templates/shared/attributes.hbs"),
      scrollable: [""],
    },
    items: {
      template: systemPath("templates/actor/items.hbs"),
      scrollable: [""],
    },
    notes: {
      template: systemPath("templates/shared/notes.hbs"),
      scrollable: [""],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _initializeApplicationOptions(options) {
    const initialized = super._initializeApplicationOptions(options);

    initialized.classes.push(initialized.document.type);

    return initialized;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    Object.assign(context, {
      owner: this.document.isOwner,
      limited: this.document.limited,
      actor: this.actor,
      system: this.actor.system,
      flags: this.actor.flags,
      actorFields: this.actor.schema.fields,
      config: CONFIG,
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case "attributes":
        context.fields = await this._getFields();
        context.tab = context.tabs[partId];
        break;
      case "items":
        context.itemTypes = this._getItemTypes();
        context.items = this._getItems();
        context.canAdd = Array.from(context.items).length < BoundlessActorSheet.MAXITEMS;
        context.tab = context.tabs[partId];
        break;
      case "notes":
        context.notes = await this._getNotes();
        context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.notes.outer.value, { async: true });

        context.tab = context.tabs[partId];
        break;
    }
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Handles the system fields for the notes form-fields.
   * @returns {object[]}
   */
  async _getNotes() {
    const doc = this.actor;
    const source = doc._source;
    const systemFields = CONFIG.Actor.dataModels[doc.type]?.schema.fields;

    let fieldSets = [];
    fieldSets = await this._addField(systemFields["notes"], source, fieldSets, null);

    return fieldSets[0];
  }

  /**
   * Handles the system fields for the form-fields generic.
   * @returns {object[]}
   */
  async _getFields() {
    const doc = this.actor;
    const source = doc._source;
    const systemFields = CONFIG.Actor.dataModels[doc.type]?.schema.fields;

    let fieldSets = [];
    if (doc.type === "player") {
    fieldSets = await this._addField(systemFields["strength"], source, fieldSets, "current");
    fieldSets = await this._addField(systemFields["presence"], source, fieldSets, "current");
    fieldSets = await this._addField(systemFields["agility"], source, fieldSets, "current");
    fieldSets = await this._addField(systemFields["willpower"], source, fieldSets, "current");
    }
    fieldSets = await this._addField(systemFields["hitPoints"], source, fieldSets, null);
    if (doc.type === "npc") {
    fieldSets = await this._addField(systemFields["battle"], source, fieldSets, "damage");
    }

    return fieldSets;
  }

  /* -------------------------------------------------- */

  /**
   * Add system model fields to the fieldset.
   */
  async _addField(field, source, fieldSets, rollValuePath) {
    const path = `system.${field.name}`;
    if (field instanceof foundry.data.fields.SchemaField) {
      const legend = game.i18n.localize(field.label);
      const fieldset = {
        fieldset: true,
          label: field.name,
          legend: legend,
        className: field.name.toLowerCase(),
        canRoll: !!rollValuePath,
        rollValuePath: rollValuePath ? `${path}.${rollValuePath}` : "",
        fields: [],
      };
      await this.#addSystemFields(fieldset, field.fields, source, path);
      fieldSets.push(fieldset);
    } else {
      fieldSets.push({ outer: { field, value: foundry.utils.getProperty(source, path) } });
    }

    return fieldSets;
  }

  /* -------------------------------------------------- */

  /**
   * Recursively add system model fields to the fieldset.
   */
  async #addSystemFields(fieldset, schema, source, _path = "system") {
    for (const field of Object.values(schema)) {
      const path = `${_path}.${field.name}`;
      if (field instanceof foundry.data.fields.SchemaField) {
        this.#addSystemFields(fieldset, field.fields, source, path);
      } else if (field.constructor.hasFormSupport) {
        fieldset.fields.push({ field, value: foundry.utils.getProperty(source, path) });
      }
    }
  }

  /* -------------------------------------------------- */

  /**
   * Adapted from Actor#itemTypes.
   */
  _getItemTypes() {
    return Object.fromEntries(
      game.documentTypes.Item.map((t) => {
        return [t, { label: game.i18n.localize(CONFIG.Item.typeLabels[t]) }];
      }),
    );
  }

  /* -------------------------------------------------- */

  /* -------------------------------------------------- */

  /**
   * Adapted from Actor#items.
   */
  _getItems() {
    return this.actor.items;
  }

  /* -------------------------------------------------- */

  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data.
   * @param {RenderOptions} options                 Provided render options.
   * @protected
   * @inheritdoc
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#disableOverrides();
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Renders an embedded document's sheet.
   *
   * @this BoundlessActorSheet
   * @param {PointerEvent} event   The originating click event.
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action].
   * @protected
   */
  static async #viewDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    doc.sheet.render(true);
  }

  /* -------------------------------------------------- */

  /**
   * Handles item deletion.
   *
   * @this BoundlessActorSheet
   * @param {PointerEvent} event   The originating click event.
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action].
   * @protected
   */
  static async #deleteDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    doc.delete();
  }

  /* -------------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset.
   *
   * @this BoundlessActorSheet
   * @param {PointerEvent} event   The originating click event.
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action].
   * @private
   */
  static async #createDoc(event, target) {
    if (target.dataset.documentClass === "Item") {
      if (Array.from(this.actor.items).length >= BoundlessActorSheet.MAXITEMS) {
        return;
      }
    }

    const docCls = getDocumentClass(target.dataset.documentClass);
    const docData = {
      name: docCls.defaultName({
        type: target.dataset.type,
        parent: this.actor,
      }),
    };
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      if (["action", "documentClass"].includes(dataKey)) continue;
      foundry.utils.setProperty(docData, dataKey, value);
    }
    docCls.create(docData, { parent: this.actor });
  }

  /* -------------------------------------------------- */

  /**
   * Opens a dialog to add an roll dice.
   *
   * @this BoundlessActorSheet
   * @param {PointerEvent} event   The originating click event.
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action].
   * @private
   */
  static async #rollDice(event, target) {
    const options = BOUNDLESS.POSITIONS.map(
      (t) =>
        `<option value='${t}' ${t === "standard" ? "selected" : ""}>${game.i18n.localize(`TYPES.Position.${t}`)}</option>`,
    );

    const targetLabel = target.dataset.rollLabel;
    const rollLabelBeforeTranslation = `Boundless.Sheets.Labels.`+targetLabel+`Check`
    const rollLabel = game.i18n.localize(rollLabelBeforeTranslation);
    let fdObject = {};
    let rollBonus = 0;
    if (target.dataset.rollLabel === "battle") {
      fdObject = await foundry.applications.api.DialogV2.input({
        window: { title: "Boundless.Sheets.Labels.Roll" },
        content: `
          <div>
            <h1>${rollLabel}</h1>
          </div>
          `,
      });
      // rollBonus = await _getBattle().damageBonus;
      rollBonus = this.actor.system.battle.damageBonus;
    } else {
      fdObject = await foundry.applications.api.DialogV2.input({
        window: { title: "Boundless.Sheets.Labels.Roll" },
        content: `
          <div>
            <h1>${rollLabel}</h1>
            <label>
            ${game.i18n.localize("TYPES.Position.label")}
            <select name='position'>
            ${options}
            </select>
            </label>
          </div>
          `,
      });
    }

    if (!fdObject) {
      return;
    }

    const doc = this.actor;
    const source = doc._source;
    const rollAmount = foundry.utils.getProperty(source, target.dataset.rollPath);

    const rollDamage = (target.dataset.rollLabel === "battle");
    if (rollDamage) {
      await rollCheck(rollAmount, rollBonus, targetLabel, rollLabel, "standard", rollDamage);
    } else {
      await rollCheck(rollAmount, rollBonus, targetLabel, rollLabel, fdObject.position, rollDamage);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Opens a dialog to add an item.
   *
   * @this BoundlessActorSheet
   * @param {PointerEvent} event   The originating click event.
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action].
   * @private
   */
  static async #addItem(event, target) {
    if (Array.from(this.actor.items).length >= BoundlessActorSheet.MAXITEMS) {
      return;
    }

    const options = game.documentTypes.Item.map((t) =>
      t === "base" ? "" : `<option value='${t}'>${game.i18n.localize(CONFIG.Item.typeLabels[t])}</option>`,
    );
    const fdObject = await foundry.applications.api.DialogV2.input({
      window: { title: "Boundless.Sheets.Labels.AddItem" },
      content: `
        <select name='itemtype'>
        ${options}
        </select>
        `,
    });

    const docCls = getDocumentClass("Item");
    const docData = {
      name: docCls.defaultName({
        type: fdObject.itemtype,
        parent: this.actor,
      }),
    };

    foundry.utils.setProperty(docData, "type", fdObject.itemtype);
    docCls.create(docData, { parent: this.actor });
  }

  /* -------------------------------------------------- */
  /*   Helper functions                                 */
  /* -------------------------------------------------- */

  /**
   * Fetches the embedded document representing the containing HTML element.
   *
   * @param {HTMLElement} target      The element subject to search.
   * @returns {Item}     The embedded Item.
   */
  _getEmbeddedDocument(target) {
    const docRow = target.closest("li[data-document-class]");
    if (docRow.dataset.documentClass === "Item") {
      return this.actor.items.get(docRow.dataset.itemId);
    } else {
      console.warn("Could not find document class");
    }
  }

  /* -------------------------------------------------- */
  /*   Actor override handling                          */
  /* -------------------------------------------------- */

  /**
   * Submit a document update based on the processed form data.
   * @param {SubmitEvent} event                   The originating form submission event.
   * @param {HTMLFormElement} form                The form element that was submitted.
   * @param {object} submitData                   Processed and validated form data to be used for a document update.
   * @returns {Promise<void>}
   * @protected
   * @inheritdoc
   */
  async _processSubmitData(event, form, submitData) {
    const overrides = foundry.utils.flattenObject(this.actor.overrides);
    for (const k of Object.keys(overrides)) delete submitData[k];
    this.document.update(submitData);
  }

  /* -------------------------------------------------- */

  /**
   * Disables inputs subject to active effects.
   */
  #disableOverrides() {
    const flatOverrides = foundry.utils.flattenObject(this.actor.overrides);
    for (const override of Object.keys(flatOverrides)) {
      const input = this.element.querySelector(`[name="${override}"]`);
      if (input) input.disabled = true;
    }
  }
}
