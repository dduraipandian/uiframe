if (typeof window !== "undefined" && !window.uiframe) {
    throw new Error("uiframe core must be loaded before components");
}

export * from "../../components/dropdown.js";
