import { Notification } from "../../components/notification.js";

let instance = null;

function getInstance({ app, options = {} }) {
  // IIFE / Browser path
  if (typeof window !== "undefined" && window.uiframe) {
    window.uiframe._notification =
      window.uiframe._notification || new Notification({ name: app, options });

    return window.uiframe._notification;
  }

  // ESM / CJS path
  if (!instance) {
    instance = new Notification({ name: app, options });
  }

  return instance;
}

export { Notification, getInstance as notification };
