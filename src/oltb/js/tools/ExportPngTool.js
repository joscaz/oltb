import html2canvas from 'html2canvas';
import { DOM } from '../helpers/browser/DOM';
import { Toast } from '../common/Toast';
import { Config } from '../core/Config';
import { Events } from '../helpers/constants/Events';
import { Control } from 'ol/control';
import { download } from '../helpers/browser/Download';
import { LogManager } from '../core/managers/LogManager';
import { UrlManager } from '../core/managers/UrlManager';
import { ShortcutKeys } from '../helpers/constants/ShortcutKeys';
import { ElementManager } from '../core/managers/ElementManager';
import { SvgPaths, getIcon } from '../core/icons/GetIcon';
import { isShortcutKeyOnly } from '../helpers/browser/IsShortcutKeyOnly';

const FILENAME = 'tools/ExportPngTool.js';
const CLASS_TOOL_BUTTON = 'oltb-tool-button';

const DefaultOptions = Object.freeze({
    filename: 'map-image-export',
    appendTime: false,
    click: undefined,
    exported: undefined,
    error: undefined
});

class ExportPngTool extends Control {
    constructor(options = {}) {
        LogManager.logDebug(FILENAME, 'constructor', 'init');

        super({
            element: ElementManager.getToolbarElement()
        });
        
        const icon = getIcon({
            path: SvgPaths.image.mixed,
            class: `${CLASS_TOOL_BUTTON}__icon`
        });

        const button = DOM.createElement({
            element: 'button',
            html: icon,
            class: CLASS_TOOL_BUTTON,
            attributes: {
                type: 'button',
                'data-tippy-content': `Export PNG (${ShortcutKeys.exportPngTool})`
            },
            listeners: {
                'click': this.handleClick.bind(this)
            }
        });

        DOM.appendChildren(this.element, [
            button
        ]);

        this.button = button;
        this.options = { ...DefaultOptions, ...options };
        this.isDebug = UrlManager.getParameter(Config.urlParameters.debug) === 'true';
        
        window.addEventListener(Events.browser.contentLoaded, this.onDOMContentLoaded.bind(this));
        window.addEventListener(Events.browser.keyUp, this.onWindowKeyUp.bind(this));
    }

    onWindowKeyUp(event) {
        if(isShortcutKeyOnly(event, ShortcutKeys.exportPngTool)) {
            this.handleClick(event);
        }
    }

    onDOMContentLoaded() {
        const mapElement = ElementManager.getMapElement();
        const attributions = mapElement.querySelector('.ol-attribution');
        if(attributions) {
            attributions.setAttribute('data-html2canvas-ignore', 'true');
        }
    }

    handleClick() {
        LogManager.logDebug(FILENAME, 'handleClick', 'User clicked tool');
        
        // User defined callback from constructor
        if(this.options.click instanceof Function) {
            this.options.click();
        }

        this.momentaryActivation();
    }

    momentaryActivation() {
        const map = this.getMap();
        if(!map) {
            return;
        }

        // RenderSync will trigger the export the png
        map.once(Events.openLayers.renderComplete, this.onRenderCompleteAsync.bind(this));
        map.renderSync();
    }

    async onRenderCompleteAsync() {
        const map = this.getMap();
        if(!map) {
            return;
        }

        try {
            const mapElement = ElementManager.getMapElement();
            const size = map.getSize();
            const pngCanvas = DOM.createElement({
                element: 'canvas',
                attributes: {
                    width: size[0],
                    height: size[1]
                }
            });
            
            const pngContext = pngCanvas.getContext('2d');

            // Draw map layers (Canvases)
            const fullOpacity = 1;
            const mapCanvas = mapElement.querySelector('.ol-layer canvas');
            const opacity = mapCanvas.parentNode.style.opacity;
            pngContext.globalAlpha = opacity === '' ? fullOpacity : Number(opacity);
    
            const matrix = mapCanvas.style.transform
                .match(/^matrix\(([^(]*)\)$/)[1]
                .split(',')
                .map(Number);

            CanvasRenderingContext2D.prototype.setTransform.apply(pngContext, matrix);
            pngContext.drawImage(mapCanvas, 0, 0);

            // Draw overlays souch as Tooltips and InfoWindows
            const overlay = mapElement.querySelector('.ol-overlaycontainer-stopevent');
            const overlayCanvas = await html2canvas(overlay, {
                scrollX: 0,
                scrollY: 0,
                backgroundColor: null,
                logging: this.isDebug
            });

            pngContext.drawImage(overlayCanvas, 0, 0);

            this.downloadCanvas(pngCanvas);
        }catch(error) {
            // User defined callback from constructor
            if(this.options.error instanceof Function) {
                this.options.error(error);
            }

            const errorMessage = 'Failed to export canvas image';
            LogManager.logError(FILENAME, 'onRenderCompleteAsync', {
                message: errorMessage,
                error: error
            });
            
            Toast.error({
                title: 'Error',
                message: errorMessage
            });
        }
    }

    downloadCanvas(pngCanvas) {
        const timestamp = this.options.appendTime 
            ? `-${new Date().toLocaleString(Config.locale)}`
            : '';

        const filename = `${this.options.filename}${timestamp}.png`;
        const content = navigator.msSaveBlob
            ? pngCanvas.msToBlob()
            : pngCanvas.toDataURL();

        if(navigator.msSaveBlob) {
            navigator.msSaveBlob(content, filename);
        }else {
            download(filename, content);
        }

        // User defined callback from constructor
        if(this.options.exported instanceof Function) {
            this.options.exported(filename, content);
        }
    }
}

export { ExportPngTool };