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
var EditorGrid_1 = require("./EditorGrid");
var AddText_1 = require("../utils/AddText");
var ImageHandler_1 = require("../utils/ImageHandler");
var grommet_icons_1 = require("grommet-icons");
var react_icons_1 = require("@radix-ui/react-icons");
var ProductEditor = function (_a) {
    var product = _a.product, _b = _a.width, width = _b === void 0 ? 800 : _b, _c = _a.height, height = _c === void 0 ? 600 : _c, onSave = _a.onSave, onCancel = _a.onCancel;
    var canvasRef = (0, react_1.useRef)(null);
    var _d = (0, react_1.useState)(null), canvas = _d[0], setCanvas = _d[1];
    var _e = (0, react_1.useState)(null), selectedTemplate = _e[0], setSelectedTemplate = _e[1];
    var _f = (0, react_1.useState)(false), showGrid = _f[0], setShowGrid = _f[1];
    var _g = (0, react_1.useState)(false), isMobileView = _g[0], setIsMobileView = _g[1];
    var _h = (0, react_1.useState)(false), canvasInitialized = _h[0], setCanvasInitialized = _h[1];
    // Check if we're on a small screen
    (0, react_1.useEffect)(function () {
        if (typeof window !== 'undefined') {
            var updateViewMode_1 = function () {
                setIsMobileView(window.innerWidth < 480);
            };
            updateViewMode_1();
            window.addEventListener('resize', updateViewMode_1);
            return function () { return window.removeEventListener('resize', updateViewMode_1); };
        }
    }, []);
    // 使用useLayoutEffect确保在DOM更新后同步执行
    (0, react_1.useLayoutEffect)(function () {
        // 确保canvas元素已经准备好并且只初始化一次
        if (canvasRef.current && !canvasInitialized) {
            try {
                var fabricCanvas = new fabric_1.fabric.Canvas(canvasRef.current, {
                    width: width,
                    height: height,
                    backgroundColor: '#ffffff',
                });
                setCanvas(fabricCanvas);
                setCanvasInitialized(true);
                // 初始化后的其他操作会由下面的useEffect处理
            }
            catch (err) {
                console.error('Error initializing canvas:', err);
            }
        }
        return function () {
            // 这里只处理组件卸载时的清理，不处理canvas的重新创建
            if (canvas && !canvasInitialized) {
                canvas.dispose();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasInitialized]); // 只依赖于canvas是否已初始化
    // 负责处理canvas的内容和功能
    (0, react_1.useEffect)(function () {
        var _a;
        if (canvas && canvasInitialized) {
            // 如果有模板，加载第一个
            if (product.draftTemplates && product.draftTemplates.length > 0) {
                var template = product.draftTemplates[0];
                setSelectedTemplate(template);
                if ((_a = template.file) === null || _a === void 0 ? void 0 : _a.url) {
                    loadTemplateImage(canvas, template);
                }
            }
            // Draw grid after loading the template
            (0, EditorGrid_1.drawGrid)(canvas, width, height, 20, '#a0a0a0', showGrid);
            // setup keyboard delete event
            var cleanupKeyboardEvents_1 = (0, ImageHandler_1.setupKeyboardEvents)(canvas, onSave);
            return function () {
                cleanupKeyboardEvents_1();
                // 注意：不在这里dispose canvas，而是在组件卸载时
            };
        }
    }, [product, width, height, onSave, canvas, canvasInitialized]);
    // 组件卸载时清理
    (0, react_1.useEffect)(function () {
        return function () {
            if (canvas) {
                canvas.dispose();
            }
        };
    }, [canvas]);
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
            if (!fabricCanvas)
                return;
            // Scale image to fit canvas while maintaining aspect ratio
            var scale = Math.min(width / img.width, height / img.height);
            img.scale(scale);
            // Center the image
            img.set({
                left: (width - img.width * scale) / 2,
                top: (height - img.height * scale) / 2,
                selectable: false,
                evented: false, // template image is not responsive to events
            });
            fabricCanvas.add(img);
            fabricCanvas.sendToBack(img); // ensure the template is on the bottom
            // Redraw grid to ensure it's on top
            if (hasGrid && showGrid) {
                (0, EditorGrid_1.drawGrid)(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);
            }
            fabricCanvas.renderAll();
        });
    };
    // handle upload image
    var handleUploadImage = function () {
        if (canvas) {
            (0, ImageHandler_1.uploadImage)(canvas, width, height, onSave);
        }
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
    // Add handleAddText function before the return statement
    var handleAddText = function () {
        if (!canvas)
            return;
        (0, AddText_1.addText)(canvas, width, height);
    };
    // Create toolbar content
    var renderToolbarContent = function () { return (react_1.default.createElement(react_1.default.Fragment, null,
        react_1.default.createElement("div", { className: "toolbar-content" },
            react_1.default.createElement("div", { className: "toolbar-button", onClick: handleUploadImage },
                react_1.default.createElement(react_icons_1.ImageIcon, { width: 24, height: 24 }),
                react_1.default.createElement("span", null, "Upload Image"))),
        react_1.default.createElement("div", { className: "grid-toggle" },
            react_1.default.createElement("div", { className: "toolbar-button ".concat(showGrid ? 'active' : ''), onClick: toggleGrid },
                react_1.default.createElement(grommet_icons_1.Apps, { width: 24, height: 24 }),
                react_1.default.createElement("span", null, showGrid ? 'Hide Grid' : 'Show Grid'))),
        react_1.default.createElement("div", { className: "toolbar-content" },
            react_1.default.createElement("div", { className: "toolbar-button" },
                react_1.default.createElement(grommet_icons_1.Undo, { width: 24, height: 24 }),
                react_1.default.createElement("span", null, "Undo")),
            react_1.default.createElement("div", { className: "toolbar-button", onClick: handleAddText },
                react_1.default.createElement(grommet_icons_1.Redo, { width: 24, height: 24 }),
                react_1.default.createElement("span", null, "Redo"))))); };
    return (react_1.default.createElement("div", { className: "product-editor" },
        product.draftTemplates && product.draftTemplates.length > 0 && (react_1.default.createElement("div", { className: "template-buttons" }, product.draftTemplates.map(function (template) { return (react_1.default.createElement("div", { key: template.id, className: "template-button ".concat((selectedTemplate === null || selectedTemplate === void 0 ? void 0 : selectedTemplate.id) === template.id ? 'selected' : ''), onClick: function () { return handleTemplateChange(template); } },
            react_1.default.createElement("span", { className: "template-name" }, template.name || "Template ".concat(template.id)))); }))),
        react_1.default.createElement("div", { className: "main-editor-layout" },
            !isMobileView && (react_1.default.createElement("div", { className: "left-toolbar" }, renderToolbarContent())),
            react_1.default.createElement("div", { className: "editor-container" },
                react_1.default.createElement("div", { className: "canvas-area", onClick: disableCanvasEvents },
                    react_1.default.createElement("canvas", { ref: canvasRef })))),
        isMobileView && (react_1.default.createElement("div", { className: "bottom-toolbar" }, renderToolbarContent()))));
};
exports.default = ProductEditor;
