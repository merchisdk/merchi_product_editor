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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = __importStar(require("react"));
var fabric_1 = require("fabric");
var ProductEditor = function (_a) {
    var product = _a.product, _b = _a.width, width = _b === void 0 ? 800 : _b, _c = _a.height, height = _c === void 0 ? 600 : _c, onSave = _a.onSave, onCancel = _a.onCancel;
    var canvasRef = (0, react_1.useRef)(null);
    var _d = (0, react_1.useState)(null), canvas = _d[0], setCanvas = _d[1];
    var _e = (0, react_1.useState)(null), selectedTemplate = _e[0], setSelectedTemplate = _e[1];
    (0, react_1.useEffect)(function () {
        var _a;
        if (canvasRef.current) {
            var fabricCanvas_1 = new fabric_1.fabric.Canvas(canvasRef.current, {
                width: width,
                height: height,
                backgroundColor: '#ffffff',
            });
            setCanvas(fabricCanvas_1);
            // If there are draft templates, use the first one as default
            if (product.draftTemplates && product.draftTemplates.length > 0) {
                var template = product.draftTemplates[0];
                setSelectedTemplate(template);
                if ((_a = template.file) === null || _a === void 0 ? void 0 : _a.url) {
                    fabric_1.fabric.Image.fromURL(template.file.url, function (img) {
                        // Scale image to fit canvas while maintaining aspect ratio
                        var scale = Math.min(width / img.width, height / img.height);
                        img.scale(scale);
                        // Center the image
                        img.set({
                            left: (width - img.width * scale) / 2,
                            top: (height - img.height * scale) / 2,
                        });
                        fabricCanvas_1.add(img);
                        fabricCanvas_1.renderAll();
                    });
                }
            }
        }
        return function () {
            if (canvas) {
                canvas.dispose();
            }
        };
    }, [product, width, height]);
    var handleSave = function () {
        if (!canvas)
            return;
        var dataUrl = canvas.toDataURL({
            format: 'png',
            quality: 1,
        });
        onSave === null || onSave === void 0 ? void 0 : onSave(dataUrl);
    };
    var handleTemplateChange = function (template) {
        var _a;
        if (!canvas || !((_a = template.file) === null || _a === void 0 ? void 0 : _a.url))
            return;
        // Clear existing objects
        canvas.clear();
        // Load new template image
        fabric_1.fabric.Image.fromURL(template.file.url, function (img) {
            var scale = Math.min(width / img.width, height / img.height);
            img.scale(scale);
            img.set({
                left: (width - img.width * scale) / 2,
                top: (height - img.height * scale) / 2,
            });
            canvas.add(img);
            canvas.renderAll();
        });
        setSelectedTemplate(template);
    };
    return (react_1.default.createElement("div", { className: "product-editor" },
        react_1.default.createElement("div", { className: "editor-toolbar" },
            product.draftTemplates && product.draftTemplates.length > 0 && (react_1.default.createElement("select", { value: (selectedTemplate === null || selectedTemplate === void 0 ? void 0 : selectedTemplate.id) || '', onChange: function (e) {
                    var _a;
                    var template = (_a = product.draftTemplates) === null || _a === void 0 ? void 0 : _a.find(function (t) { return t.id === Number(e.target.value); });
                    if (template)
                        handleTemplateChange(template);
                } }, product.draftTemplates.map(function (template) { return (react_1.default.createElement("option", { key: template.id, value: template.id }, template.name || "Template ".concat(template.id))); }))),
            react_1.default.createElement("button", { onClick: handleSave }, "Save"),
            react_1.default.createElement("button", { onClick: onCancel }, "Cancel")),
        react_1.default.createElement("canvas", { ref: canvasRef })));
};
exports.default = ProductEditor;
