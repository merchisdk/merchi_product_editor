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
var react_icons_1 = require("@radix-ui/react-icons");
var EditorGrid_1 = require("./EditorGrid");
var ProductEditor = function (_a) {
    var product = _a.product, _b = _a.width, width = _b === void 0 ? 800 : _b, _c = _a.height, height = _c === void 0 ? 600 : _c, onSave = _a.onSave, onCancel = _a.onCancel;
    var canvasRef = (0, react_1.useRef)(null);
    var _d = (0, react_1.useState)(null), canvas = _d[0], setCanvas = _d[1];
    var _e = (0, react_1.useState)(null), selectedTemplate = _e[0], setSelectedTemplate = _e[1];
    var _f = (0, react_1.useState)(false), showGrid = _f[0], setShowGrid = _f[1];
    (0, react_1.useEffect)(function () {
        var _a;
        if (canvasRef.current) {
            var fabricCanvas = new fabric_1.fabric.Canvas(canvasRef.current, {
                width: width,
                height: height,
                backgroundColor: '#ffffff',
            });
            setCanvas(fabricCanvas);
            // If there are draft templates, use the first one as default
            if (product.draftTemplates && product.draftTemplates.length > 0) {
                var template = product.draftTemplates[0];
                setSelectedTemplate(template);
                if ((_a = template.file) === null || _a === void 0 ? void 0 : _a.url) {
                    loadTemplateImage(fabricCanvas, template);
                }
            }
            // Draw grid after loading the template
            (0, EditorGrid_1.drawGrid)(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);
        }
        return function () {
            if (canvas) {
                canvas.dispose();
            }
        };
    }, [product, width, height]);
    // draw grid when the grid state or canvas size changes
    (0, react_1.useEffect)(function () {
        if (canvas) {
            (0, EditorGrid_1.drawGrid)(canvas, width, height, 20, '#a0a0a0', showGrid);
        }
    }, [showGrid, width, height, canvas]);
    var loadTemplateImage = function (fabricCanvas, template) {
        var _a;
        if (!((_a = template.file) === null || _a === void 0 ? void 0 : _a.url))
            return;
        // save the existing grid lines
        var gridLines = (0, EditorGrid_1.saveGridState)(fabricCanvas);
        var hasGrid = gridLines.length > 0;
        // clear all objects except the grid
        (0, EditorGrid_1.clearCanvasExceptGrid)(fabricCanvas);
        fabric_1.fabric.Image.fromURL(template.file.url, function (img) {
            // Scale image to fit canvas while maintaining aspect ratio
            var scale = Math.min(width / img.width, height / img.height);
            img.scale(scale);
            // Center the image
            img.set({
                left: (width - img.width * scale) / 2,
                top: (height - img.height * scale) / 2,
            });
            fabricCanvas.add(img);
            // Redraw grid to ensure it's on top
            if (hasGrid && showGrid) {
                (0, EditorGrid_1.drawGrid)(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);
            }
            fabricCanvas.renderAll();
        });
    };
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
        if (!canvas)
            return;
        setSelectedTemplate(template);
        loadTemplateImage(canvas, template);
    };
    // toggle grid visibility
    var toggleGrid = function () {
        setShowGrid(!showGrid);
    };
    // Disable canvas events to prevent accidental template changes
    var disableCanvasEvents = function (e) {
        e.stopPropagation();
    };
    return (react_1.default.createElement("div", { className: "product-editor" },
        product.draftTemplates && product.draftTemplates.length > 0 && (react_1.default.createElement("div", { className: "template-buttons" }, product.draftTemplates.map(function (template) { return (react_1.default.createElement("div", { key: template.id, className: "template-button ".concat((selectedTemplate === null || selectedTemplate === void 0 ? void 0 : selectedTemplate.id) === template.id ? 'selected' : ''), onClick: function () { return handleTemplateChange(template); } },
            react_1.default.createElement("span", { className: "template-name" }, template.name || "Template ".concat(template.id)))); }))),
        react_1.default.createElement("div", { className: "main-editor-layout" },
            react_1.default.createElement("div", { className: "left-toolbar" },
                react_1.default.createElement("div", { className: "toolbar-content" },
                    react_1.default.createElement("div", { className: "toolbar-button" },
                        react_1.default.createElement(react_icons_1.ImageIcon, { width: 24, height: 24 }),
                        react_1.default.createElement("span", null, "Upload Image")),
                    react_1.default.createElement("div", { className: "toolbar-button" },
                        react_1.default.createElement(react_icons_1.TextIcon, { width: 24, height: 24 }),
                        react_1.default.createElement("span", null, "Add Text"))),
                react_1.default.createElement("div", { className: "grid-toggle" },
                    react_1.default.createElement("div", { className: "toolbar-button ".concat(showGrid ? 'active' : ''), onClick: toggleGrid },
                        react_1.default.createElement(react_icons_1.DashboardIcon, { width: 24, height: 24 }),
                        react_1.default.createElement("span", null, showGrid ? 'Hide Grid' : 'Show Grid')))),
            react_1.default.createElement("div", { className: "editor-container" },
                react_1.default.createElement("div", { className: "canvas-area", onClick: disableCanvasEvents },
                    react_1.default.createElement("canvas", { ref: canvasRef }))))));
};
exports.default = ProductEditor;
