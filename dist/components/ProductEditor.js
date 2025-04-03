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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductEditor = void 0;
var react_1 = __importStar(require("react"));
var fabric_1 = require("fabric");
var ProductEditorContext_1 = require("../context/ProductEditorContext");
var Toolbar_1 = require("./Toolbar");
require("./ProductEditor.css");
var ProductEditor = function (_a) {
    var product = _a.product, job = _a.job, _b = _a.width, width = _b === void 0 ? 800 : _b, _c = _a.height, height = _c === void 0 ? 600 : _c, onSave = _a.onSave, onCancel = _a.onCancel;
    var canvasRef = (0, react_1.useRef)(null);
    var _d = (0, ProductEditorContext_1.useProductEditor)(), canvas = _d.canvas, setCanvas = _d.setCanvas, selectedTemplate = _d.selectedTemplate, setSelectedTemplate = _d.setSelectedTemplate, showGrid = _d.showGrid, setShowGrid = _d.setShowGrid, handleUndo = _d.handleUndo, handleRedo = _d.handleRedo, handleUploadImage = _d.handleUploadImage, handleSave = _d.handleSave, handleCancel = _d.handleCancel;
    (0, react_1.useEffect)(function () {
        var _a, _b;
        if (canvasRef.current && !canvas) {
            var fabricCanvas_1 = new fabric_1.fabric.Canvas(canvasRef.current, {
                width: width,
                height: height,
                backgroundColor: '#ffffff',
            });
            setCanvas(fabricCanvas_1);
            // Load the selected template
            var template = (_a = product.draftTemplates) === null || _a === void 0 ? void 0 : _a.find(function (t) { var _a; return ((_a = t.id) === null || _a === void 0 ? void 0 : _a.toString()) === selectedTemplate; });
            if ((_b = template === null || template === void 0 ? void 0 : template.file) === null || _b === void 0 ? void 0 : _b.url) {
                fabric_1.fabric.Image.fromURL(template.file.url, function (img) {
                    var scale = Math.min(width / img.width, height / img.height);
                    img.scale(scale);
                    img.set({
                        left: (width - img.width * scale) / 2,
                        top: (height - img.height * scale) / 2,
                    });
                    fabricCanvas_1.add(img);
                    fabricCanvas_1.renderAll();
                });
            }
        }
        return function () {
            if (canvas) {
                canvas.dispose();
                setCanvas(null);
            }
        };
    }, [canvas, setCanvas, selectedTemplate, product.draftTemplates, width, height]);
    var toggleGrid = function () {
        if (!canvas)
            return;
        setShowGrid(!showGrid);
        if (!showGrid) {
            // Add grid lines
            var gridSize = 20;
            for (var i = 0; i < width; i += gridSize) {
                canvas.add(new fabric_1.fabric.Line([i, 0, i, height], {
                    stroke: '#ddd',
                    selectable: false,
                }));
            }
            for (var i = 0; i < height; i += gridSize) {
                canvas.add(new fabric_1.fabric.Line([0, i, width, i], {
                    stroke: '#ddd',
                    selectable: false,
                }));
            }
        }
        else {
            // Remove grid lines
            canvas.getObjects().forEach(function (obj) {
                if (obj instanceof fabric_1.fabric.Line) {
                    canvas.remove(obj);
                }
            });
        }
        canvas.renderAll();
    };
    return (react_1.default.createElement("div", { className: "product-editor" },
        react_1.default.createElement("div", { className: "main-editor-layout" },
            react_1.default.createElement(Toolbar_1.Toolbar, null),
            react_1.default.createElement("div", { className: "editor-container" },
                react_1.default.createElement("div", { className: "canvas-container" },
                    react_1.default.createElement("canvas", { ref: canvasRef }))))));
};
exports.ProductEditor = ProductEditor;
