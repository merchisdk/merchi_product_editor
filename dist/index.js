"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductEditorProvider = exports.ProductEditor = void 0;
var ProductEditor_1 = require("./components/ProductEditor");
Object.defineProperty(exports, "ProductEditor", { enumerable: true, get: function () { return ProductEditor_1.ProductEditor; } });
__exportStar(require("./components/EditorGrid"), exports);
__exportStar(require("./types"), exports);
require("./styles.css");
var ProductEditorContext_1 = require("./context/ProductEditorContext");
Object.defineProperty(exports, "ProductEditorProvider", { enumerable: true, get: function () { return ProductEditorContext_1.ProductEditorProvider; } });
