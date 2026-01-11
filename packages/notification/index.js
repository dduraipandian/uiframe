import "../../components/css/notification.css";

import { Notification } from "../../components/notification.js";

let instance = new WeakMap();

function getInstance(params) {
  // const params = { name, options = {} };
  if (!instance.has(params)) {
    instance.set(params, new Notification(params));
  }

  return instance.get(params);
}

export { Notification, getInstance as notification };
