import { MODULE } from "./constants.mjs";
import { playerScores } from "./playerScores.mjs";

export class YatzyPlayer extends FormApplication {
  constructor(...T) {
    super(...T);
    this.scores = [];
    this._roll = 0;
    for (const user of game.users) {
      const board = new playerScores(user, { board: this });
      user.apps[board.appId] = board;
      this.scores.push(board);
    }
    this._myBoard = this.scores.find(b => b.player === game.user);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "modules/fvtt-yatzy/templates/fvtt-yatzy.hbs",
      classes: [MODULE],
      height: 800,
      width: 1200,
      resizable: true
    });
  }

  get id() {
    return `${MODULE}-yatzyPlayer`;
  }

  async getData() {
    const board = await Promise.all(this.scores.map(s => s.render(true)));
    return { board };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const btn = html[0].querySelector(".rollers [type='button']");
    btn.addEventListener("click", async () => {
      const num = this._roll === 3 ? 5 : html[0].querySelectorAll(".rollers .results .die:not(.locked)").length;
      const roll = await new Roll(`${num}d6`).evaluate({ async: true });
      await roll.toMessage({ flavor: "Yahtzee!", speaker: ChatMessage.getSpeaker() });
      this._dice = [...html[0].querySelectorAll(".rollers .results .die.locked")].map(d => Number(d.innerText));
      this._dice.push(...roll.dice[0].results.map(d => d.result));
      this._roll = this._roll === 3 ? 1 : this._roll + 1;
      btn.innerHTML = `<i class="fa-solid fa-dice"></i> Roll (${this._roll}/3)`;
      if (num === 5) this._dice = [...roll.dice[0].results.map(d => d.result)];
      const dice = html[0].querySelectorAll(".rollers .results .die");
      for (let i = 0; i < 5; i++) {
        dice[i].innerText = this._dice[i];
        dice[i].classList.toggle("locked", false);
      }
    });

    html[0].addEventListener("click", (event) => {
      event.target.closest(".rollers .results .die")?.classList.toggle("locked");
    });

    html[2].addEventListener("click", async (event) => {
      await this._myBoard.performUpdate(event.target.closest("a")?.dataset.category);
      return this._myBoard.performFinalScore();
    });
  }

  _replacePlayerColumnWithNewStats(column, userId) {
    const board = this.element[0].querySelector(`.score-board[data-user-id='${userId}']`);
    const DIV = document.createElement("DIV");
    DIV.innerHTML = column;
    board.replaceWith(DIV.firstChild);
  }

  async close(...T) {
    this._myBoard.close(...T);
    super.close(...T);
  }
}
