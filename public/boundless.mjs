const BOUNDLESS = {};

BOUNDLESS.ABILITIES_LONG = {
  strength: "BOUNDLESS.ability_strength",
  agility: "BOUNDLESS.ability_agility",
  presence: "BOUNDLESS.ability_presence",
  willpower: "BOUNDLESS.ability_willpower",
};

BOUNDLESS.ABILITY_KEYS = ["strength", "agility", "presence", "willpower"];

BOUNDLESS.POSITIONS = ["absolute", "good", "standard", "bad", "impossible"];

const systemID = "boundless";

/**
 * Translates repository paths to Foundry Data paths.
 * @param {string} path - A path relative to the root of this repository.
 * @returns {string} The path relative to the Foundry data folder.
 */
const systemPath = (path) => `systems/${systemID}/${path}`;

/* -------------------------------------------------- */

/**
 * Roll a check and add a ChatMessage with the result.
 */
async function rollCheck(rollAmount, rollBonus, targetLabel, rollLabel, position, rollDamage, rollShortRest) {
  const speaker = foundry.documents.ChatMessage.getSpeaker();
  const roll = new foundry.dice.Roll(`${rollAmount}d6`);
  await roll.evaluate();

  let successCount = 0;
  let minimumRoll = 5;
  switch (position) {
    case "absolute":
      minimumRoll = 1;
      break;
    case "good":
      minimumRoll = 4;
      break;
    case "standard":
      minimumRoll = 5;
      break;
    case "bad":
      minimumRoll = 6;
      break;
    case "impossible":
      minimumRoll = 7;
      break;
    default:;
  }

  for (let i = 0; i < roll.dice.length; i++) {
    const results = roll.dice[i].results;
    for (let j = 0; j < results.length; j++) {
      if (results[j].result >= minimumRoll) {
        successCount++;
      }
    }
  }

  const rollDamageWBonus = parseInt(roll.result)+parseInt(rollBonus);
  const rollShortRestTotal = parseInt(roll.result)
  let formula = `${rollAmount}D`;
  if (rollDamage) {formula += `+${rollBonus}`};
  const renderedTemplate = await foundry.applications.handlebars.renderTemplate(
    systemPath("templates/shared/roll-message.hbs"),
    {
      rollDamage: rollDamage,
      rollDamageWBonus: rollDamageWBonus,
      rollShortRest: rollShortRest,
      rollShortRestTotal: rollShortRestTotal,
      maxSuccesses: successCount > 1,
      success: successCount > 0,
      rollLabel: rollLabel,
      targetLabel: targetLabel,
      position: `TYPES.Position.${position}`,
      formula: formula,
      rolls: roll.dice[0].results,
    },
  );

  const messageData = {
    speaker: speaker,
    content: renderedTemplate,
    rolls: [roll],
  };

  foundry.documents.ChatMessage.create(messageData);

  if (rollShortRest) {
    return rollShortRestTotal;
  }
}

const { api: api$1, sheets: sheets$1 } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications.
 */
class BoundlessActorSheet extends api$1.HandlebarsApplicationMixin(sheets$1.ActorSheet) {
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
        context.recovery = this._getRecovery();
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

    // context.isplayer = await (this.type === "player");

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Handles the system fields for the Notes form-fields.
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
    console.log("source", source);
    const systemFields = CONFIG.Actor.dataModels[doc.type]?.schema.fields;

    let fieldSets = [];


    if (doc.type === "player") {
    fieldSets = await this._addField(systemFields["strength"], source, fieldSets, 'current');
    fieldSets = await this._addField(systemFields["presence"], source, fieldSets, 'current');
    fieldSets = await this._addField(systemFields["agility"], source, fieldSets,'current');
    fieldSets = await this._addField(systemFields["willpower"], source, fieldSets, 'current');
    }
    if (doc.type === "npc") {
    fieldSets = await this._addField(systemFields["battle"], source, fieldSets, 'damage');
    }
    fieldSets = await this._addField(systemFields["hitPoints"], source, fieldSets, null);


    return fieldSets;
  }

  /* -------------------------------------------------- */

  /**
   * Add system model fields to the fieldset.
   */
  async _addField(field, source, fieldSets, rollValuePath) {
    await console.log("rollValuePath", rollValuePath);
    const path = `system.${field.name}`;
    if (field instanceof foundry.data.fields.SchemaField) {
      console.log("field", field);
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
    console.log("fieldset", fieldset);
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

  _getRecovery() {
    // Création de la section
    const section = `
    <div class="recovery">
    <h4>`+game.i18n.localize("Boundless.Recovery.label")+`</h4>
    <div class="form-group">
      <div class="recovery-roll"></div>
      <a class="item-control recovery-roll" data-action="rollDice" data-roll-label="shortrest" data-roll-path="{{rollValuePath}}">
        <i class='fas fa-seat' data-tooltip="`+game.i18n.localize('Boundless.Recovery.10min')+`"><label> `+game.i18n.localize("Boundless.Recovery.ShortRest")+`</label></i>
      </a>
      <a class="item-control recovery-roll" data-action="rollDice" data-roll-label="longrest" data-roll-path="{{rollValuePath}}">
        <i class='fas fa-bed' data-tooltip="`+game.i18n.localize('Boundless.Recovery.8h')+`"><label> `+game.i18n.localize("Boundless.Recovery.LongRest")+`</label></i>
      </a>
    </div>
    </div>
    `;

    return section;
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

    const abilities = BOUNDLESS.ABILITY_KEYS.map(
      (t) =>
        `<option value='${t}' ${t === "strength" ? "selected" : ""}>${game.i18n.localize(`TYPES.Ability.${t}`)}</option>`,
    );

    const targetLabel = target.dataset.rollLabel;
    const rollLabelBeforeTranslation = `Boundless.Sheets.Labels.`+targetLabel+`Check`
    const rollLabel = game.i18n.localize(rollLabelBeforeTranslation);
    let fdObject = {};
    let fdAbility = {};
    let rollBonus = 0;
    console.log("target.dataset.rollLabel", target.dataset.rollLabel);
    if (target.dataset.rollLabel === "battle" || target.dataset.rollLabel === "shortrest" || (target.dataset.rollLabel === "longrest" && this.actor.type != "player")) {
      fdObject = await foundry.applications.api.DialogV2.input({
        window: { title: "Boundless.Sheets.Labels.Roll" },
        content: `
          <div>
            <h1>${rollLabel}</h1>
          </div>
        `,
      });
      if (target.dataset.rollLabel === "battle") {
        rollBonus = this.actor.system.battle.damageBonus;
      }
    } else if (target.dataset.rollLabel === "longrest" && this.actor.type === "player") {
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
    const rollShortRest = (target.dataset.rollLabel === "shortrest");
    const rollLongRest = (target.dataset.rollLabel === "longrest");

    if (rollDamage) {
      await rollCheck(rollAmount, rollBonus, targetLabel, rollLabel, "standard", rollDamage, rollShortRest);
    } else if (rollShortRest) {
      const rollShortRestTotal = await rollCheck(1, rollBonus, targetLabel, rollLabel, "standard", rollDamage, rollShortRest);
      const currentHP = doc.system.hitPoints.current;
      const maxHP = doc.system.hitPoints.max;
      let newHP = currentHP + rollShortRestTotal;
      if (newHP > maxHP) {
        newHP = maxHP;
      }

      function update(actor, newHP) {
        actor.update({"system.hitPoints.current":newHP});
      }

      setTimeout(update, 3000, doc, newHP);

    } else if (rollLongRest) {
      if (doc.type === "player") {
        fdAbility = await foundry.applications.api.DialogV2.input({
          window: { title: "Boundless.Sheets.Labels.chooseAbility" },
          content: `
            <div>
              <h1>${rollLabel}</h1>
              <label>
              ${game.i18n.localize("TYPES.Ability.label")}
              <select name='ability'>
              ${abilities}
              </select>
              </label>
            </div>
            `,
        });
        if (!fdAbility) {
          return;
        }

        console.log("fdAbility.ability", fdAbility.ability);
        let updatedAbilityCurrent;
        let abilityMax;

        switch (fdAbility.ability) {
          case "strength":
            updatedAbilityCurrent = doc.system.strength.current;
            abilityMax = doc.system.strength.max;
            break;
          case "agility":
            updatedAbilityCurrent = doc.system.agility.current;
            abilityMax = doc.system.agility.max;
            break;
          case "presence":
            updatedAbilityCurrent = doc.system.presence.current;
            abilityMax = doc.system.presence.max;
            break;
          case "willpower":
            updatedAbilityCurrent = doc.system.willpower.current;
            abilityMax = doc.system.willpower.max;
            break;
          default:
            updatedAbilityCurrent = doc.system.strength.current;
            abilityMax = doc.system.strength.max;
        }

        console.log("updatedAbilityCurrent", updatedAbilityCurrent);
        console.log("abilityMax", abilityMax);

        updatedAbilityCurrent++;
        if (updatedAbilityCurrent > abilityMax) {
          updatedAbilityCurrent = abilityMax;
        }

        console.log("updatedAbilityCurrent", updatedAbilityCurrent);

        switch (fdAbility.ability) {
          case "strength":
            doc.update({"system.strength.current":updatedAbilityCurrent});
            break;
          case "agility":
            doc.update({"system.agility.current":updatedAbilityCurrent});
            break;
          case "presence":
            doc.update({"system.presence.current":updatedAbilityCurrent});
            break;
          case "willpower":
            doc.update({"system.willpower.current":updatedAbilityCurrent});
            break;
          default:
            doc.update({"system.strength.current":updatedAbilityCurrent});
        }
      }
      const maxHP = doc.system.hitPoints.max;
      doc.update({"system.hitPoints.current":maxHP});

      // return ui.notifications.error(game.i18n.localize("Boundless.error.non-implemented"));

    } else {
      await rollCheck(rollAmount, rollBonus, targetLabel, rollLabel, fdObject.position, rollDamage, rollShortRest);
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



const { api, sheets } = foundry.applications;

/**
 * Extend the basic ItemSheet with some very simple modifications.
 */
class BoundlessItemSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheet) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    position: {
      width: 600,
    },
    classes: ["boundless", "item", "standard-form"],
    form: {
      submitOnChange: true,
    },
    // Custom property that's merged into `this.options`
    dragDrop: [{ dragSelector: ".draggable", dropSelector: null }],
  };

  /* -------------------------------------------------- */

  static TABS = {
    primary: {
      tabs: [
        {
          id: "attributes",
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
      template: systemPath("templates/item/header.hbs"),
    },
    tabs: {
      // Foundry-provided generic template
      template: "templates/generic/tab-navigation.hbs",
    },
    attributes: {
      template: systemPath("templates/shared/attributes.hbs"),
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
      item: this.item,
      actor: this.actor,
      system: this.item.system,
      flags: this.item.flags,
      itemFields: this.item.schema.fields,
      config: CONFIG,
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context) {
    // TODO: Come up with clever way to automatically handle enriching HTML fields
    switch (partId) {
      case "attributes":
        context.fields = await this._getFields();
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
    const doc = this.item;
    const source = doc._source;
    const systemFields = CONFIG.Item.dataModels[doc.type]?.schema.fields;

    let fieldSets = [];
    fieldSets = await this.#addSystemFields(systemFields["notes"], source, fieldSets, null);

    return fieldSets[0];
  }

  /* -------------------------------------------------- */

  /**
   * Handles the system fields for the form-fields generic.
   */
  async _getFields() {
    const doc = this.item;
    const source = doc._source;
    const systemFields = CONFIG.Item.dataModels[doc.type]?.schema.fields;
    console.log("systemFields", systemFields);
    const fieldSets = [];
    // TODO: Find a clever way to handle enrichment
    for (const field of Object.values(systemFields ?? {})) {
      const path = `system.${field.name}`;
      if (field instanceof foundry.data.fields.SchemaField) {
        const legend = game.i18n.localize(field.label);
        const fieldset = {
          fieldset: true,
          label: field.name,
          legend: legend,
          fields: []
        };
        await this.#addSystemFields(fieldset, field.fields, source, path);
        fieldSets.push(fieldset);
      } else {
        fieldSets.push({ outer: { field, value: foundry.utils.getProperty(source, path) } });
      }
    }
    console.log("fieldSets", fieldSets);
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
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data.
   * @param {RenderOptions} options                 Provided render options.
   * @protected
   */
  _onRender(context, options) {
    this.#dragDrop.forEach((d) => d.bind(this.element));
  }

  /* -------------------------------------------------- */
  /*   Drag and drop                                    */
  /* -------------------------------------------------- */

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector.
   * @param {string} selector       The candidate HTML selector for dragging.
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(selector) {
    return this.isEditable;
  }

  /* -------------------------------------------------- */

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector.
   * @param {string} selector       The candidate HTML selector for the drop target.
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(selector) {
    return this.isEditable;
  }

  /* -------------------------------------------------- */

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent.
   * @protected
   */
  _onDragOver(event) {}

  /* -------------------------------------------------- */

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent.
   * @protected
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const item = this.item;
    const allowed = Hooks.call("dropItemSheetData", item, this, data);
    if (allowed === false) return;

    // Handle different data types
    switch (data.type) {
      case "Actor":
        return this._onDropActor(event, data);
      case "Item":
        return this._onDropItem(event, data);
      case "Folder":
        return this._onDropFolder(event, data);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Handle dropping of an Actor data onto another Actor sheet.
   * @param {DragEvent} event            The concluding DragEvent which contains drop data.
   * @param {object} data                The data transfer extracted from the event.
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(event, data) {
    if (!this.item.isOwner) return false;
  }

  /* -------------------------------------------------- */

  /**
   * Handle dropping of an item reference or item data onto an Actor Sheet.
   * @param {DragEvent} event            The concluding DragEvent which contains drop data.
   * @param {object} data                The data transfer extracted from the event.
   * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
   * @protected
   */
  async _onDropItem(event, data) {
    if (!this.item.isOwner) return false;
  }

  /* -------------------------------------------------- */

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
   * @param {DragEvent} event     The concluding DragEvent which contains drop data.
   * @param {object} data         The data transfer extracted from the event.
   * @returns {Promise<Item[]>}
   * @protected
   */
  async _onDropFolder(event, data) {
    if (!this.item.isOwner) return [];
  }

  /* -------------------------------------------------- */
  /*   The following pieces set up drag                 */
  /*   handling and are unlikely to need modification   */
  /* -------------------------------------------------- */

  // This is marked as private because there's no real need
  // for subclasses or external hooks to mess with it directly
  #dragDrop = this.#createDragDropHandlers();

  /**
   * Returns an array of DragDrop instances.
   * @type {DragDrop[]}
   */
  get dragDrop() {
    return this.#dragDrop;
  }

  /* -------------------------------------------------- */

  /**
   * Create drag-and-drop workflow handlers for this Application.
   * @returns {DragDrop[]}     An array of DragDrop handlers.
   * @private
   */
  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new foundry.applications.ux.DragDrop(d);
    });
  }
}

class ActorBaseBoundless extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["Boundless.Actor"];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    const { SchemaField, NumberField, HTMLField } = foundry.data.fields;
    return {
      hitPoints: new SchemaField({
        current: new NumberField({ ...requiredInteger, initial: 0 }),
        max: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
      notes: new HTMLField({}),
    };
   /*
    return {
      hitPoints: new SchemaField({
        current: new NumberField(),
        max: new NumberField(),
      }),
      notes: new HTMLField({}),
    };
    */

  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
  }
}

class NpcBoundless extends ActorBaseBoundless {
  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["BOUNDLESS.Npc", ...super.LOCALIZATION_PREFIXES];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true }
    const { SchemaField, NumberField } = foundry.data.fields;
    const schema = {
      battle: new SchemaField({
        armor: new NumberField({ ...requiredInteger, initial: 0 }),
        damage: new NumberField({ ...requiredInteger, initial: 0 }),
        damageBonus: new NumberField({ ...requiredInteger, initial: 0 }),

      }),
    };
    /*
    const schema = {
      battle: new SchemaField({
        armor: new NumberField(),
        damage: new NumberField(),
        damageBonus: new NumberField(),

      }),
    };
    */

    return Object.assign(super.defineSchema(), schema);
  }
}

class PlayerBoundless extends ActorBaseBoundless {
  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["BOUNDLESS.Player", ...super.LOCALIZATION_PREFIXES];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    const { NumberField, SchemaField } = foundry.data.fields;
    const schema = {
      strength: new SchemaField({
        current: new NumberField({ ...requiredInteger, initial: 0 }),
        max: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
      presence: new SchemaField({
        current: new NumberField({ ...requiredInteger, initial: 0 }),
        max: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
      agility: new SchemaField({
        current: new NumberField({ ...requiredInteger, initial: 0 }),
        max: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
      willpower: new SchemaField({
        current: new NumberField({ ...requiredInteger, initial: 0 }),
        max: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
    };
    /*
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
    */

    return Object.assign(super.defineSchema(), schema);
  }
}

const config_actor = {
  player: PlayerBoundless,
  npc: NpcBoundless,
};

const config_item = {
    // item: ItemBoundless, ///////////////?
}

/**
 * A simple extension that adds a hook at the end of data prep.
 */
class BoundlessActor extends foundry.documents.Actor {
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

/**
 * A simple extension that adds a hook at the end of data prep.
 */
class BoundlessCard extends foundry.documents.Card {
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

/**
 * A simple extension that adds a hook at the end of data prep.
 */
class BoundlessCards extends foundry.documents.Cards {
  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    /**
     * Flexible hook for modules to alter derived document data.
     * @param {BoundlessCards} cards      The cards preparing derived data.
     */
    Hooks.callAll("Boundless.prepareCardsData", this);
  }
}

/**
 * A simple extension that adds a hook at the end of data prep.
 */
class BoundlessChatMessage extends foundry.documents.ChatMessage {
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



////////////////////////////////////////////////////////////////////////////////

class ItemBaseBoundless extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["Boundless.Item"];

  /* -------------------------------------------------- */

  /** @inheritdoc */

  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
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

/* -------------------------------------------------- */


class ItemBoundless extends ItemBaseBoundless {
  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["BOUNDLESS.Item", ...super.LOCALIZATION_PREFIXES];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    const { BooleanField, NumberField, StringField } = foundry.data.fields;
    const schema = {
      equipped: new BooleanField({ initial: false }),
      slots: new NumberField({ ...requiredInteger, initial: 0 }),
      damage: new NumberField({ ...requiredInteger, initial: 0 }),
      damageBonus: new NumberField({ ...requiredInteger, initial: 0 }),
      armor: new NumberField({ ...requiredInteger, initial: 0 }),
      uses: new NumberField({ ...requiredInteger, initial: 0 }),
      used: new NumberField({ ...requiredInteger, initial: 0 }),
      type: new StringField(),
      effets: new StringField(),
    };

    return Object.assign(super.defineSchema(), schema);
  }

}

//////////////////////////////////////////////////////////////////





/**
 * A simple extension that adds a hook at the end of data prep.
 */
class BoundlessItem extends foundry.documents.Item {
  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    /**
     * Flexible hook for modules to alter derived document data.
     * @param {BoundlessItem} item      The item preparing derived data.
     */
    Hooks.callAll("Boundless.prepareItemData", this);
  }
}

/**
 * A simple extension that adds a hook at the end of data prep.
 */
class BoundlessScene extends foundry.documents.Scene {
  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    /**
     * Flexible hook for modules to alter derived document data.
     * @param {BoundlessScene} scene      The scene preparing derived data.
     */
    Hooks.callAll("Boundless.prepareSceneData", this);
  }
}

/**
 * A simple extension that adds a hook at the end of data prep.
 */
class BoundlessUser extends foundry.documents.User {
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

var documents = /*#__PURE__*/Object.freeze({
  __proto__: null,
  BoundlessActor: BoundlessActor,
  BoundlessCard: BoundlessCard,
  BoundlessCards: BoundlessCards,
  BoundlessChatMessage: BoundlessChatMessage,
  BoundlessItem: BoundlessItem,
  BoundlessScene: BoundlessScene,
  BoundlessUser: BoundlessUser
});

/**
 * Searches through an object recursively and localizes strings.
 * @param {Record<string, unknown>} object
 */
function localizeHelper(object) {
  for (const [key, value] of Object.entries(object)) {
    // const type = foundry.utils.getType(value)
    switch (typeof value) {
      case "object":
        if (value) localizeHelper(value);
        break;
      case "string":
        if (key === "label") object[key] = game.i18n.localize(value);
        break;
    }
  }
}

/* -------------------------------------------------- */

Hooks.once("init", () => {
  CONFIG.BOUNDLESS = BOUNDLESS;

  // Assign document classes
  for (const docCls of Object.values(documents)) {
    console.log(`applying ${docCls.documentName} as ${docCls.name}`);
    CONFIG[docCls.documentName].documentClass = docCls;
  }

  Object.assign(CONFIG.Actor.dataModels, config_actor);
  Object.assign(CONFIG.Item.dataModels, config_item);

  CONFIG.Actor.defaultType = "player";

  // Document Sheets
  foundry.documents.collections.Actors.registerSheet("boundless", BoundlessActorSheet, {
    makeDefault: true,
    label: "Boundless.Sheets.Labels.ActorSheet",
  });
  foundry.documents.collections.Items.registerSheet("boundless", BoundlessItemSheet, {
    makeDefault: true,
    label: "Boundless.Sheets.Labels.ActorSheet",
  });
});

Hooks.once("i18nInit", () => {
  // Localizing the system's CONFIG object
  localizeHelper(CONFIG.BOUNDLESS);
});