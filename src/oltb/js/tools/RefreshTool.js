import { DOM } from '../helpers/browser/DOM';
import { Events } from '../helpers/constants/Events';
import { Control } from 'ol/control';
import { LogManager } from '../core/managers/LogManager';
import { ShortcutKeys } from '../helpers/constants/ShortcutKeys';
import { ElementManager } from '../core/managers/ElementManager';
import { SvgPaths, getIcon } from '../core/icons/GetIcon';
import { isShortcutKeyOnly } from '../helpers/browser/IsShortcutKeyOnly';

const FILENAME = 'tools/RefreshTool.js';
const CLASS_TOOL_BUTTON = 'oltb-tool-button';

const DefaultOptions = Object.freeze({
    click: undefined
});

class RefreshTool extends Control {
    constructor(options = {}) {
        LogManager.logDebug(FILENAME, 'constructor', 'init');
        
        super({
            element: ElementManager.getToolbarElement()
        });
        
        const icon = getIcon({
            path: SvgPaths.arrowClockwise.stroked,
            class: `${CLASS_TOOL_BUTTON}__icon`
        });

        const button = DOM.createElement({
            element: 'button',
            html: icon,
            class: CLASS_TOOL_BUTTON,
            attributes: {
                type: 'button',
                'data-tippy-content': `Refresh page (${ShortcutKeys.refreshPageTool})`
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

        window.addEventListener(Events.browser.keyUp, this.onWindowKeyUp.bind(this));
    }

    onWindowKeyUp(event) {
        if(isShortcutKeyOnly(event, ShortcutKeys.refreshPageTool)) {
            this.handleClick(event);
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
        window.location.reload();
    }
}

export { RefreshTool };