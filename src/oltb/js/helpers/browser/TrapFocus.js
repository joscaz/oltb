import { Keys } from "../constants/Keys";

const trapFocus = function(event) {
    const isTabKey = event.key === Keys.valueTab;
    if(!isTabKey) {
        return;
    }

    const elements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const firstElement = this.querySelectorAll(elements)[0];
    const content = this.querySelectorAll(elements);
    const lastElement = content[content.length - 1];

    if(event.shiftKey) {
        if(document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
        }
    }else {
        if(document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
        }
    }
}

export { trapFocus };