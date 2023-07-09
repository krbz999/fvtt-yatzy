import {MODULE} from "./scripts/constants.mjs";
import {_renderYatzy} from "./scripts/publicAPI.mjs";

// set up api functions.
Hooks.once("setup", () => {
  game.modules.get(MODULE.id).api = {
    render: _renderYatzy
  }
});
