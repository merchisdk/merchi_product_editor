"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = __importDefault(require("react"));
var ProductEditorContext_1 = require("../context/ProductEditorContext");
var Toolbar_1 = __importDefault(require("./Toolbar"));
require("../styles/ProductEditor.css");
var Product = function () {
    var _a = (0, ProductEditorContext_1.useProductEditor)(), canvasRef = _a.canvasRef, draftTemplates = _a.draftTemplates, handleTemplateChange = _a.handleTemplateChange, isMobileView = _a.isMobileView, selectedTemplate = _a.selectedTemplate;
    // Disable canvas events to prevent accidental template changes
    var disableCanvasEvents = function (e) {
        e.stopPropagation();
    };
    return (react_1.default.createElement("div", { className: "product-editor" },
        draftTemplates.length > 0 && (react_1.default.createElement("div", { className: "template-buttons" }, draftTemplates.map(function (_a) {
            var template = _a.template;
            return (react_1.default.createElement("div", { key: template.id, className: "template-button ".concat(selectedTemplate === template.id ? 'selected' : ''), onClick: function () { return handleTemplateChange(template); } },
                react_1.default.createElement("span", { className: "template-name" }, template.name || "Template ".concat(template.id))));
        }))),
        react_1.default.createElement("div", { className: "main-editor-layout" },
            !isMobileView && (react_1.default.createElement("div", { className: "left-column" },
                react_1.default.createElement("div", { className: "left-toolbar" },
                    react_1.default.createElement(Toolbar_1.default, null)),
                react_1.default.createElement("div", { className: "preview-section" },
                    react_1.default.createElement("h4", { className: "preview-heading" }, "Preview"),
                    react_1.default.createElement("div", { className: "preview-images" },
                        react_1.default.createElement("div", { className: "preview-image-box" }),
                        react_1.default.createElement("div", { className: "preview-image-box" }))))),
            react_1.default.createElement("div", { className: "editor-container" },
                react_1.default.createElement("div", { className: "canvas-area", onClick: disableCanvasEvents },
                    react_1.default.createElement("canvas", { ref: canvasRef })))),
        isMobileView && (react_1.default.createElement("div", { className: "bottom-toolbar" },
            react_1.default.createElement(Toolbar_1.default, null)))));
};
var ProductEditor = function (props) {
    return (react_1.default.createElement(ProductEditorContext_1.ProductEditorProvider, __assign({}, props),
        react_1.default.createElement(Product, null)));
};
exports.default = ProductEditor;
