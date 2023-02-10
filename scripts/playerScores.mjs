import { MODULE } from "./constants.mjs";

export class playerScores extends FormApplication {
  constructor(player, options) {
    super(player, options);
    this.player = player;
    this.board = options.board;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: "modules/fvtt-yatzy/templates/player-scores.hbs",
      classes: [MODULE],
      height: 500,
      width: "max-content"
    });
  }

  get id() {
    return `${MODULE}-${this.object.id}`;
  }

  async getData() {
    const data = await super.getData();
    data.name = this.player.name;
    data.userId = this.player.id;
    foundry.utils.mergeObject(data, this.player.flags[MODULE]);
    foundry.utils.mergeObject(data, { playing: !!this.player.flags[MODULE] || this.player === game.user });
    return data;
  }

  async _updateObject(event, formData) {
    formData = foundry.utils.flattenObject({ [`flags.${MODULE}`]: formData });
    await this.player.update(formData);
  }

  async render(...T) {
    const data = await this.getData();
    foundry.utils.mergeObject(data, this.player.flags[MODULE]);
    const temp = this.options.template;
    const r = await renderTemplate(temp, data);
    if (this.board.rendered) {
      this.board._replacePlayerColumnWithNewStats(r, this.player.id);
    }
    return r;
  }

  async close(...T) {
    //delete this.player.apps[this.appId];
    await this.player.update({ [`flags.-=${MODULE}`]: null });
  }

  async performUpdate(category) {
    if (!category) return;
    const dice = this.board._dice;
    const upper = `flags.${MODULE}.upper.${category}`;
    const lower = `flags.${MODULE}.lower.${category}`;

    const a = foundry.utils.getProperty(this.player, upper);
    const b = foundry.utils.getProperty(this.player, lower);
    if (a !== undefined || b !== undefined) return;

    const u = {
      aces: 1,
      twos: 2,
      threes: 3,
      fours: 4,
      fives: 5,
      sixes: 6
    };

    const kind = {
      "three-of-a-kind": 3,
      "four-of-a-kind": 4
    }[category];

    // top level bonus.
    if (u[category]) {
      const w = u[category];
      const sum = dice.reduce((acc, e) => acc += (e === w ? e : 0), 0);
      if (sum === 0) return;
      const total = Object.keys(u).reduce((acc, e) => {
        const t = foundry.utils.getProperty(this.player, `flags.${MODULE}.upper.${e}`) ?? (e === category ? sum : null);
        if (!t) return acc;
        return acc + t;
      }, 0);
      console.log(total);
      return this.player.update({
        [upper]: sum,
        [`flags.${MODULE}.upper.sum`]: total,
        [`flags.${MODULE}.upper.bonus`]: total >= 64 ? 50 : 0
      });
    }

    // three or four of a kind.
    else if (kind) {
      const denom = dice.find(d => {
        return dice.filter(e => e === d).length >= kind;
      });
      if (denom) return this.player.update({ [lower]: kind * denom });
      else return;
    }

    // full house.
    else if (category === "full-house") {
      const three = dice.find(d => {
        return dice.filter(e => e === d).length === 3;
      });
      const two = dice.find(d => {
        return dice.filter(e => e === d).length === 2;
      });
      if (three && two) return this.player.update({ [lower]: 3 * three + 2 * two });
      else return;
    }

    // straights.
    else if (category === "small-straight") {
      const has = [1, 2, 3, 4, 5].every(d => dice.includes(d));
      if (has) return this.player.update({ [lower]: 30 });
      else return;
    } else if (category === "large-straight") {
      const has = [2, 3, 4, 5, 6].every(d => dice.includes(d));
      if (has) return this.player.update({ [lower]: 40 });
      else return;
    }

    // yahtzee.
    else if (category === "yahtzee") {
      const has = new Set(dice).size === 1;
      if (has) return this.player.update({ [lower]: 50 });
      else return;
    }

    // chance.
    else if (category === "chance") {
      const sum = dice.reduce((acc, e) => acc += e, 0);
      return this.player.update({ [lower]: sum });
    }
  }

  async performFinalScore() {
    const us = `flags.${MODULE}.upper.sum`;
    const ub = `flags.${MODULE}.upper.bonus`;
    const l = `flags.${MODULE}.lower`;

    const keys = [
      "three-of-a-kind",
      "four-of-a-kind",
      "full-house",
      "small-straight",
      "large-straight",
      "yahtzee",
      "chance"
    ].map(key => `${l}.${key}`);

    const final = [us, ub, ...keys].reduce((acc, key) => {
      const val = foundry.utils.getProperty(this.player, key);
      if (!val) return acc;
      return acc + val;
    }, 0);
    return this.player.update({ [`flags.${MODULE}.final`]: final });
  }
}
