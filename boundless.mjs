import * as apps from "./src/module/apps/_module.mjs";
import * as dataModels from "./src/module/data/_module.mjs";
import * as documents from "./src/module/documents/_module.mjs";
import BOUNDLESS from "./src/module/config.mjs";
import { localizeHelper } from "./src/module/helpers/utils.mjs";

Hooks.once("init", () => {
  CONFIG.BOUNDLESS = BOUNDLESS;

  // Assign document classes
  for (const docCls of Object.values(documents)) {
    console.log(`applying ${docCls.documentName} as ${docCls.name}`);
    CONFIG[docCls.documentName].documentClass = docCls;
  }

  Object.assign(CONFIG.Actor.dataModels, dataModels.Actor.config);

  CONFIG.Actor.defaultType = "player";

  // Document Sheets
  foundry.documents.collections.Actors.registerSheet("boundless", apps.Actor.BoundlessActorSheet, {
    makeDefault: true,
    label: "Boundless.Sheets.Labels.ActorSheet",
  });
  foundry.documents.collections.Items.registerSheet("boundless", apps.Item.BoundlessItemSheet, {
    makeDefault: true,
    label: "Boundless.Sheets.Labels.ActorSheet",
  });
});

Hooks.once("i18nInit", () => {
  // Localizing the system's CONFIG object
  localizeHelper(CONFIG.BOUNDLESS);
});
