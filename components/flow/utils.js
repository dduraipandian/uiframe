class DragHandler {
    constructor(
        element,
        onMoveHandler,
        initialPosition = { x: 0, y: 0 },
        startDragPosition = { x: 0, y: 0 },
        zoom = 1
    ) {
        this.element = element;
        this.onMoveHandler = onMoveHandler;
        this.zoomGetter = typeof zoom === "function" ? zoom : () => zoom;

        this.isDragging = false;
        this.dragStartPosition = startDragPosition;
        this.initialPosition = initialPosition;

        this.elementX = this.initialPosition.x;
        this.elementY = this.initialPosition.y;

        this.rafId = null;

        this.MOUSE_RIGHT_CLICK = 2;
    }

    destroy() {
        this.element.removeEventListener("mousedown", this.onHold.bind(this));
        window.removeEventListener("mousemove", this.onMove.bind(this));
        window.removeEventListener("mouseup", this.onRelease.bind(this));
    }

    registerDragEvent() {
        // Canvas Panning Listeners for click and drag, draggable will not work
        // as it will go to initial position when click is released
        this.element.addEventListener("mousedown", this.onHold.bind(this));
    }

    onHold(e) {
        if (e.button === this.MOUSE_RIGHT_CLICK) {
            console.debug("FLOW: Ignoreing Right click on ", this.element);
            return;
        }

        e.stopPropagation();
        this.isDragging = true;
        this.dragStartPosition = { x: e.clientX, y: e.clientY };
        this.initialPosition = { x: this.elementX, y: this.elementY };
        this.element.style.cursor = "grabbing";

        window.addEventListener("mousemove", this.onMove.bind(this));
        window.addEventListener("mouseup", this.onRelease.bind(this));
        this.startRaf();
    }

    onMove(e) {
        if (e.button === this.MOUSE_RIGHT_CLICK) {
            console.debug("FLOW: Ignoreing Right click on", this.element);
            return;
        }
        e.stopPropagation();

        if (!this.isDragging) {
            return;
        }

        const zoom = this.zoomGetter();
        const dx = (e.clientX - this.dragStartPosition.x) / zoom;
        const dy = (e.clientY - this.dragStartPosition.y) / zoom;

        this.elementX = this.initialPosition.x + dx;
        this.elementY = this.initialPosition.y + dy;
    }

    onRelease(e) {
        if (e.button === this.MOUSE_RIGHT_CLICK) {
            console.debug("FLOW: Ignoreing right click on", this.element);
            return;
        }

        e.stopPropagation();
        this.isDragging = false;
        this.element.style.cursor = "grab";

        window.removeEventListener("mousemove", this.onMove.bind(this));
        window.removeEventListener("mouseup", this.onRelease.bind(this));
    }

    static register(element, onMoveHandler, zoom = 1) {
        const dragHandler = new DragHandler(
            element,
            onMoveHandler,
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            zoom
        );
        dragHandler.registerDragEvent();
        return dragHandler;
    }

    startRaf() {
        if (this.rafId) return;

        const loop = () => {
            if (!this.isDragging) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
                return;
            }

            // DOM update happens ONLY here
            this.onMoveHandler(this.elementX, this.elementY);
            this.rafId = requestAnimationFrame(loop);
        };

        this.rafId = requestAnimationFrame(loop);
    }
}

export default DragHandler;