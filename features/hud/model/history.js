// features/hud/model/history.js  [ISOLATED world]

// מחסנית undo לסשן עריכה אחד: snapshot של ההעדפות לפני כל פעולה. טהור.
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};

  const LIMIT = 100;

  window.TankiQoL.HudHistory = {
    create() {
      const stack = [];
      return {
        push(snapshot) {
          stack.push(JSON.parse(JSON.stringify(snapshot)));
          if (stack.length > LIMIT) stack.shift();
        },
        undo() {
          return stack.length ? stack.pop() : null;
        },
        clear() {
          stack.length = 0;
        },
        size() {
          return stack.length;
        },
      };
    },
  };
})();
