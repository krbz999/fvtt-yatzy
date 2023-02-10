import { MODULE } from "./scripts/constants.mjs";
import { _renderYatzy } from "./scripts/publicAPI.mjs";

// set up prototype functions.
Hooks.once("setup", () => {
  game.modules.get(MODULE).api = {
    render: _renderYatzy
  }
});
