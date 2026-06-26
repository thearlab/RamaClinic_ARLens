// UI Scroll View.js
// Event: onAwake
// Version 3.0
// Description : A Scroll View is a custom component that allows one to scroll one screen transform within the bounds of another.  
// It can be used when content that takes up a lot of space needs to be displayed in a small area - for example a map, a long block of text or a long list of items.

// @input Component.ScreenTransform contentScreenTransform {"label" : "Content"}
/** @type {ScreenTransform} */
let contentScreenTransform = script.contentScreenTransform;

//@input bool useMask
/** @type {boolean} */
const useMask = script.useMask;

//@input float radius = 0.25 {"label" : "   Radius", "showIf" : "useMask", "widget":"slider", "min":0.0, "max":5.0, "step":0.01 }
/** @type {number} */
const radius = script.radius;

// @ui {"widget":"separator"}
// @ui {"label" : "<b>Scrolling</b>"}
// @input bool dragX = true {"label": "Horizontal"}
/** @type {boolean} */
let dragX = script.dragX;

// @input bool dragY = true {"label": "Vertical"}
/** @type {boolean} */
let dragY = script.dragY;

// @input int scrollType = 0 {"widget":"combobox", "values":[{"label":"Restricted", "value":0}, {"label":"Elastic", "value":1}]}
/** @type {number} */
let scrollType = script.scrollType;

//@input float elasticity = 0.5 {"label" : "   Elasticity", "widget":"slider", "min":0.0, "max":0.99, "step":0.01, "showIf" : "scrollType", "showIfValue": 1 }
/** @type {number} */
let elasticity = script.elasticity;

//@input bool inertia
/** @type {boolean} */
let inertia = script.inertia;

//@input float dampening {"label" : "   Dampening", "widget":"slider", "min":0.00, "max":0.99, "step":0.01, "showIf" : "inertia", "showIfValue": true }
/** @type {number} */
let dampening = script.dampening;

//@input bool useGlobalTouchEvents = true {"label" : "Global Touch", "hint" : "Detect swipes via global touch events instead of this object's InteractionComponent. Enable so child elements with their own InteractionComponents (e.g. tappable grid cells) don't block scrolling."}
/** @type {boolean} */
const useGlobalTouchEvents = script.useGlobalTouchEvents;
// @ui {"widget":"separator"}

// @ui {"widget":"label","label":"<b>Scroll Bars</b>"}
// @input bool enableHorizontalScrollBar = false {"label" : "Horizontal"}
/** @type {boolean} */
let enableHorizontalScrollBar = script.enableHorizontalScrollBar;

// @input bool enableVerticalScrollBar = false {"label" : "Vertical"}
/** @type {boolean} */
let enableVerticalScrollBar = script.enableVerticalScrollBar;

//@input float scrollBarWidth = 0.5
/** @type {number} */
let scrollBarWidth = script.scrollBarWidth;

//@input int scrollBarType = 0 {"label":"Show", "widget":"combobox", "values":[{"label":"Always", "value":0}, {"label":"On Scroll", "value":1}]}
/** @type {number} */
let scrollBarType = script.scrollBarType;

// @input Asset.Material scrollBarMaterial
/** @type {Material} */

//@input Asset.Material scrollBarOverrideMaterial { "label" : "Scroll Bar Material", "hint" : "Try using 9 Slicing material from the Asset Library"}
/** @type {Material} */
const scrollBarMaterial = script.scrollBarOverrideMaterial ? script.scrollBarOverrideMaterial : script.scrollBarMaterial;

const EventWrapper = require("./Modules/EventModule").EventWrapper;
const DestructionHelper = require("./Modules/DestructionHelper");
const manager = new DestructionHelper(script);

/**
 * Enum for ScrollDirection
 * @readonly
 * @enum {number}
 */
const ScrollDirection = { "Horizontal": 0, "Vertical": 1 };

/**
 * Enum for scroll type
 * @readonly
 * @enum {number}
 */
const ScrollType = { "Restricted": 0, "Elastic": 1 };
/**
 * Enum for scroll type
 * @readonly
 * @enum {number}
 */
const ScrollBarType = { "Always": 0, "OnScroll": 1 };

const BOTTOM_LEFT = new vec2(-1, -1);
const TOP_RIGHT = new vec2(1, 1);

/** @type {vec2} */
let startPos;
/** @type {vec2} */
let targetPos;
/** @type {vec2} */
let targetDir = vec2.zero();
/** @type {vec2} */
let touchOffset = vec2.zero();
/** @type {Rect} */
const bounds = Rect.create(-1, 1, -1, 1);
/** @type {vec2} */
let boundsSize = bounds.getSize();
/** @type {vec2} */
let boundsCenter = bounds.getCenter();
/** @type {vec2} */
let boundsOffset = vec2.zero();
/** @type {SceneObject} */
let so;
/** @type {ScreenTransform} */
let screenTransform;
/** @type {ScrollBar} */
let verticalScrollBar;
/** @type {ScrollBar} */
let horizontalScrollBar;
/** @type {number} */
let targetAlpha = scrollBarType == ScrollBarType.Always ? 1 : 0;
/** @type {boolean} */
let dirty = true;
/** @type {boolean} */
let active = false;
/** @type {number} */
const eps = 0.001;

/**
 * Initializes component
 */
function onStart() {
    so = script.getSceneObject();
    screenTransform = so.getComponent("Component.ScreenTransform");
    if (screenTransform == null) {
        Studio.log("Error, Requires Screen Transform component");
        return;
    }
    if (!contentScreenTransform) {
        Studio.log("Error, Please set [Content] Screen Transform input on [" + so.name + "] Scene Object");
        return false;
    }
    const contentSo = contentScreenTransform.getSceneObject();
    if (contentSo.getParent() != so) {
        contentSo.setParent(so);
        Studio.log("Info, [" + contentSo.name + "] Scene Object was force parented to [" + so.name + "] Scene Object");
    }

    startPos = contentScreenTransform.anchors.getCenter();
    targetPos = startPos.uniformScale(1.0);
    startScale = contentScreenTransform.scale;

    updateRectangle();

    if (useMask) {
        let mask = so.getComponent("MaskingComponent");
        if (!mask) {
            mask = manager.createComponent(so, "MaskingComponent");
        }
        mask.cornerRadius = radius;
        //add rounded borders in 4.49
    }
    let interactionComponent = so.getComponent("InteractionComponent");

    if (interactionComponent == null) {
        interactionComponent = manager.createComponent(so, "InteractionComponent");
    }

    [horizontalScrollBar, verticalScrollBar] = createScrollBars();

    if (useGlobalTouchEvents) {
        // Global touch events fire regardless of which InteractionComponent is
        // front-most, so child elements with their own InteractionComponents
        // (e.g. tappable grid cells) can't swallow the swipe. containsScreenPoint
        // inside onTouchStart still scopes the gesture to the content bounds.
        let activeTouchId = null;
        // Global TouchStartEventArgs expose getTouchPosition()/getTouchId(),
        // not the .position field that InteractionComponent args use.
        script.createEvent("TouchStartEvent").bind(function (e) {
            if (activeTouchId != null) return;          // already tracking a finger
            onTouchStart({ position: e.getTouchPosition() });
            if (active) activeTouchId = e.getTouchId();  // only lock on if we engaged
        });
        script.createEvent("TouchMoveEvent").bind(function (e) {
            if (activeTouchId != null && e.getTouchId() != activeTouchId) return;
            onTouchMove({ position: e.getTouchPosition() });
        });
        script.createEvent("TouchEndEvent").bind(function (e) {
            if (activeTouchId != null && e.getTouchId() != activeTouchId) return;
            onTouchEnd({ position: e.getTouchPosition() });
            activeTouchId = null;
        });
    } else {
        interactionComponent.onTouchStart.add(onTouchStart);
        interactionComponent.onTouchMove.add(onTouchMove);
        interactionComponent.onTouchEnd.add(onTouchEnd);
    }

    global.touchSystem.touchBlocking = true;

    script.createEvent("LateUpdateEvent").bind(onLateUpdate);
}

/**
 * calculates a final rect of a screen transform (offsets applied)
 * this is needed to support any configuration of the content screen transform 
 */
function updateRectangle() {
    const bottomLeft = localToParentPoint(BOTTOM_LEFT);
    const topRight = localToParentPoint(TOP_RIGHT);

    if (bottomLeft == null || topRight == null) {
        active = false;
        return false;
    }

    bounds.left = bottomLeft.x;
    bounds.right = topRight.x;
    bounds.bottom = bottomLeft.y;
    bounds.top = topRight.y;

    boundsSize = bounds.getSize();
    boundsCenter = bounds.getCenter();
    //offset from real center
    boundsOffset = contentScreenTransform.anchors.getCenter().sub(boundsCenter);
    return true;
}

/**
 * Get local point of content screen transform in parent space
 * @param {vec2} pos 
 * @returns {vec2} relative pos in parent space
 */
function localToParentPoint(pos) {
    return screenTransform.worldPointToLocalPoint(contentScreenTransform.localPointToWorldPoint(pos));
}

/**
 * 
 * @param {LateUpdateEvent} eventData 
 */
function onLateUpdate(eventData) {
    if (dirty) {
        const startAnchors = copyRect(contentScreenTransform.anchors);
        //attempt to shift
        contentScreenTransform.anchors.setCenter(targetPos);

        if (updateRectangle()) {
            if (!active || scrollType == ScrollType.Restricted) {
                if (inertia && !active && targetDir.lengthSquared > eps) {
                    targetPos = targetPos.add(targetDir);
                    targetDir = targetDir.uniformScale(1.0 - dampening);
                }
                //add inertia
                const newAnchors = clampBounds(copyRect(contentScreenTransform.anchors));
                if (newAnchors.getCenter().distance(startAnchors.getCenter()) <= eps) {
                    contentScreenTransform.anchors = newAnchors;
                    dirty = false;
                } else {
                    contentScreenTransform.anchors = lerpRect(startAnchors, newAnchors, scrollType == ScrollType.Elastic ? 1.0 - elasticity : 1.0);
                }
                updateRectangle();
            }
        } else {
            contentScreenTransform.anchors = startAnchors;
            updateRectangle();
        }
        verticalScrollBar.update(bounds);
        horizontalScrollBar.update(bounds);
    }
    verticalScrollBar.setAlpha(targetAlpha);
    horizontalScrollBar.setAlpha(targetAlpha);
}

/**
 * 
 * @param {Rect} anchors - screen transform anchors calculated on this frame
 * @returns {Rect} - updated anchors
 */
function clampBounds(anchors) {
    //anchors are just used for manipulating object center 
    //real anchors are local points converted to parent points and take into account anchors and offsets
    if (dragX) {
        let dx = 0;
        if (boundsSize.x <= 2.0 && bounds.left < -1.0
            || boundsSize.x > 2.0 && bounds.left > -1.0) {
            dx = bounds.left + 1;
        } else if (boundsSize.x <= 2.0 && bounds.right > 1.0
            || boundsSize.x > 2.0 && bounds.right < 1.0) {
            dx = bounds.right - 1;
        }
        anchors.left -= dx;
        anchors.right -= dx;
    }
    if (dragY) {
        let dy = 0;
        if (boundsSize.y <= 2.0 && bounds.bottom < -1.0
            || boundsSize.y > 2.0 && bounds.bottom > -1.0) {
            dy = bounds.bottom + 1;
        } else if (boundsSize.y <= 2.0 && bounds.top > 1.0
            || boundsSize.y > 2.0 && bounds.top < 1.0) {
            dy = bounds.top - 1;
        }
        anchors.bottom -= dy;
        anchors.top -= dy;
    }
    return anchors;
}

/**
 * on touch start 
 * @param {TouchStartEventArgs} eventData 
 */
function onTouchStart(eventData) {
    if (!contentScreenTransform.containsScreenPoint(eventData.position)) {
        active = false;
        return;
    }
    active = true;
    if (active) {
        if (dragX || dragY) {
            const localPos = contentScreenTransform.screenPointToParentPoint(eventData.position);
            if (localPos != null) {
                touchOffset = localPos.sub(contentScreenTransform.anchors.getCenter());
            } else {
                active = false;
            }
        }
    }
    if (scrollBarType == ScrollBarType.OnScroll) {
        targetAlpha = 1.0;
    }
}

/**
 * on touch move event
 * @param {TouchMoveEventArgs} eventData 
 */
function onTouchMove(eventData) {
    if (active) {
        if (dragX || dragY) {
            const localPos = contentScreenTransform.screenPointToParentPoint(eventData.position);
            if (localPos != null) {
                targetPos = localPos.sub(touchOffset);
                targetPos.x = dragX ? targetPos.x : startPos.x;
                targetPos.y = dragY ? targetPos.y : startPos.y;
            } else {
                active = false;
            }
            dirty = true;
        }
    }
}
/**
 * on touch end event
 * @param {TouchEndEventArgs} eventData
 */
function onTouchEnd(eventData) {
    if (active) {
        if (dragX || dragY) {
            const localPos = contentScreenTransform.screenPointToParentPoint(eventData.position);
            if (localPos != null) {
                const prevPos = targetPos;
                targetPos = localPos.sub(touchOffset);
                targetPos.x = dragX ? targetPos.x : startPos.x;
                targetPos.y = dragY ? targetPos.y : startPos.y;
                targetDir = targetPos.sub(prevPos);
            } else {
                active = false;
            }
            dirty = true;
        }

        active = false;
        if (scrollBarType == ScrollBarType.OnScroll) {
            targetAlpha = 0.0;
        }
    }
}
/**
 * instantiate and initialize scroll bars
 */

function createScrollBars() {
    // Vertical
    const verticalBarSo = manager.createSceneObject(so);
    const horizontalBarSo = manager.createSceneObject(so);

    verticalBarSo.name = "Vertical Scroll Bar";
    horizontalBarSo.name = "Horizontal Scroll Bar";

    verticalBarSo.layer = so.layer;
    horizontalBarSo.layer = so.layer;

    const barX = new ScrollBar(horizontalBarSo, ScrollDirection.Horizontal);
    const barY = new ScrollBar(verticalBarSo, ScrollDirection.Vertical);

    barX.setWidth(scrollBarWidth, false);
    barY.setWidth(scrollBarWidth, enableHorizontalScrollBar);

    barX.setMaterial(scrollBarMaterial.clone());
    barY.setMaterial(scrollBarMaterial.clone());

    barX.setEnabled(dragX && enableHorizontalScrollBar);
    barY.setEnabled(dragY && enableVerticalScrollBar);
    // add callbacks
    barX.onValueChanged.add(setPositionNormalizedX);
    barY.onValueChanged.add(setPositionNormalizedY);

    return [barX, barY];
}
/**
 * @param {Number} v - value, where -1 is left side, 1 - right side
 */
function setPositionNormalizedX(v) {
    let x = 0;
    if (boundsSize.x < 2.0) {
        x = v * (boundsSize.x - 2.0) / 2.0;
    } else if (boundsSize.x > 2.0) {
        x = v * (2.0 - boundsSize.x) / 2.0;
    } else {
        x = v;
    }
    targetPos.x = x + boundsOffset.x;
    markDirty();
}

/**
 * @param {Number} v - value, where -1 is top, 1 - bottom
 */

function setPositionNormalizedY(v) {
    // y reversed - to start from top
    let y = 0;
    if (boundsSize.y > 2.0) {
        y = v * (boundsSize.y - 2.0) / 2.0;
    } else if (boundsSize.y < 2.0) {
        y = v * (2.0 - boundsSize.y) / 2.0;
    } else {
        y = v;
    }
    targetPos.y = y + boundsOffset.y;
    markDirty();
}
/**
 * @returns {number} normalized position x
 */
function getPositionNormalizedX() {
    if (boundsSize.x < 2.0) {
        return 2 * boundsCenter.x / (boundsSize.x - 2.0);
    } else if (boundsSize.x > 2.0) {
        return 2 * boundsCenter.x / (2.0 - boundsSize.x);
    }
    return boundsCenter.x; //test this
}
/**
 * @returns {number} normalized position x
 */
function getPositionNormalizedY() {
    if (boundsSize.y > 2.0) {
        return 2 * boundsCenter.y / (boundsSize.y - 2.0);
    } else if (boundsSize.y < 2.0) {
        return 2 * boundsCenter.y / (2.0 - boundsSize.y);
    }
    return boundsCenter.y; //test this
}

/**
 * Scroll Bar implementation 
 */
function ScrollBar(sceneObject, direction) {
    this.onValueChanged = new EventWrapper();

    this.sceneObject = sceneObject;
    this.direction = direction;
    this.screenTransform = sceneObject.createComponent("ScreenTransform");

    const handle = manager.createSceneObject(sceneObject);
    handle.layer = sceneObject.layer;
    //create screen transform
    this.handleScreenTransform = handle.createComponent("ScreenTransform");
    this.handleAnchors = this.handleScreenTransform.anchors;
    this.image = handle.createComponent("Image");
    this.touchOffset;
    //add interactions
    const interactionComponent = handle.createComponent("InteractionComponent");
    interactionComponent.onTouchStart.add((e) => {
        this.onTouchStart(e.position);
    });
    interactionComponent.onTouchMove.add((e) => {
        this.onTouchMove(e.position);
    });
    interactionComponent.onTouchEnd.add((e) => {
        this.onTouchEnd(e.position);
    });
}
/**
 * enable or disable this scroll bar
 * @param {boolean} v 
 */
ScrollBar.prototype.setEnabled = function (v) {
    this.sceneObject.enabled = v;
};

ScrollBar.prototype.update = function (rect) {
    if (!this.sceneObject.enabled) {
        return;
    }
    if (this.direction == ScrollDirection.Horizontal) {
        const barSizeX = Math.min(1.0, 2.0 / Math.max(2, rect.right - rect.left));
        this.handleAnchors.setSize(new vec2(barSizeX * 2, 2));

        const localX = remap(0, rect.left, rect.right, -1, 1);
        this.handleAnchors.setCenter(new vec2(localX, 0));

        this.handleAnchors.right = Math.min(this.handleAnchors.right, 1.0);
        this.handleAnchors.left = Math.max(this.handleAnchors.left, -1.0);
    }
    if (this.direction == ScrollDirection.Vertical) {
        const barSizeY = Math.min(1.0, 2.0 / (rect.top - rect.bottom));
        this.handleAnchors.setSize(new vec2(2, barSizeY * 2));

        const localY = remap(0, rect.bottom, rect.top, -1, 1);
        this.handleAnchors.setCenter(new vec2(0, localY));

        this.handleAnchors.top = Math.min(this.handleAnchors.top, 1.0);
        this.handleAnchors.bottom = Math.max(this.handleAnchors.bottom, -1.0);
    }
    this.needUpdate = true;
};
ScrollBar.prototype.onTouchStart = function (pos) {
    const localPos = this.handleScreenTransform.screenPointToParentPoint(pos);
    if (localPos == null) {
        return;
    }
    this.touchOffset = localPos.sub(this.handleAnchors.getCenter());
};
/**
 * convert screen point to local point and trigger onValueChanged event
 * @param {vec2} pos 
 */
ScrollBar.prototype.onTouchMove = function (pos) {
    const localPos = this.handleScreenTransform.screenPointToParentPoint(pos);
    if (localPos == null || touchOffset == undefined) {
        return;
    }
    const size = this.handleAnchors.getSize();
    if (this.direction == ScrollDirection.Horizontal) {
        const x = (localPos.x - this.touchOffset.x) / (1 - size.x / 2);
        this.onValueChanged.trigger(x);
    } else {
        const y = (localPos.y - this.touchOffset.y) / (1 - size.y / 2);
        this.onValueChanged.trigger(-y);
    }
    this.needUpdate = false;
};
ScrollBar.prototype.onTouchEnd = function () {
    this.touchOffset = undefined;
};
ScrollBar.prototype.setMaterial = function (material) {
    this.image.mainMaterial = material;
    this.image.setRenderOrder(getMaxRenderOrder(so) + 1);
    this.pass = this.image.mainMaterial.mainPass;
};
/**
 * set scroll bar alpha - for show on 
 * @param {number} alpha - material alpha
 */
ScrollBar.prototype.setAlpha = function (alpha) {
    if (!this.pass) {
        return;
    }
    const color = this.pass.baseColor;
    if (scrollBarType == ScrollBarType.OnScroll) {
        let a = color.a;
        if (a < alpha) {
            a = Math.min(a + getDeltaTime() * 5, alpha);
        } else if (a > alpha) {
            a = Math.max(a - getDeltaTime() * 5, alpha);
        }
        color.a = a;
    } else {
        color.a = alpha;
    }
    this.pass.baseColor = color;
};
/**
 * 
 * @param {number} v - width in world units
 * @param {boolean} bot - whether horizontal bar enabled to add bottom offset
 */
ScrollBar.prototype.setWidth = function (v, bot) {
    if (this.direction == ScrollDirection.Vertical) {
        this.screenTransform.anchors.left = 1;
        this.screenTransform.offsets.left = -v;
        if (bot) {
            this.screenTransform.offsets.bottom = v;
        }
    } else {
        this.screenTransform.anchors.top = -1;
        this.screenTransform.offsets.top = v;
    }
};
/* end Scroll Bar Class */

/**
* Returns the input value remapped from the input range to the output range
* @param {number} value Value in
* @param {number} inMin Input range minimum
* @param {number} inMax Input range maximum
* @param {number} outMax Output range minimum
* @param {number} outMin Output range maximum
* @returns {number} `value` remapped from the input range to the output range
*/
function remap(value, inMin, inMax, outMin, outMax) {
    return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}
/**
 * Get max render order amongst children
 * @param {SceneObject} sceneObject 
 * @returns {number}
 */
function getMaxRenderOrder(sceneObject) {
    let renderOrder = getRenderOrder(sceneObject);
    sceneObject.children.forEach(child => {
        renderOrder = Math.max(renderOrder, getMaxRenderOrder(child));
    });
    return renderOrder;
}
/**
 * get render order of current scene object if available
 * @param {SceneObject} sceneObject 
 * @returns {number}
 */
function getRenderOrder(sceneObject) {
    const mv = sceneObject.getComponent("BaseMeshVisual");
    return mv != null ? mv.getRenderOrder() : 0;
}
/**
 * mark this component dirty
 */
function markDirty() {
    dirty = true;
}
/**
 * @returns {boolean} - if this component is dirty
 */
function isDirty() {
    return dirty;
}

Object.defineProperties(script, {
    "positionNormalizedX": {
        /**
         * get normalized position x
         * @returns {number} - local position x [-1, 1]
         */
        get: () => {
            return getPositionNormalizedX();
        },
        set: (v) => setPositionNormalizedX(v)
    },
    "positionNormalizedY": {
        /**
         * get normalized position y
         * @returns  {number} - local position y [-1, 1]
         */
        get: () => {
            return getPositionNormalizedY();
        },
        set: (v) => setPositionNormalizedY(v)
    },
    "scrollType": {
        /**
         * set scroll type
         * @param {ScrollType} v 
         */
        set: function (v) {
            scrollType = v; markDirty();
        },
        /**
         * get scroll type 
         * @returns {ScrollType}
         */
        get: () => {
            return scrollType;
        }
    },
    "scrollBarType": {
        /**
         * set scroll type
         * @param {ScrollBarType} v 
         */
        set: function (v) {
            scrollBarType = v;
            targetAlpha = (v == ScrollBarType.Always) ? 1 : 0;
            markDirty();
        },
        /**
         * get scroll type 
         * @returns {ScrollBarType}
         */
        get: () => {
            return scrollBarType;
        }
    },
    "dragX": {
        /**
         * enable or disable horizontal scrolling 
         * @param {boolean} v 
         */
        set: function (v) {
            dragX = v;
        },
        /**
         * @returns {boolean} - is horizontal scrolling enabled
         */
        get: () => {
            return dragX;
        }
    },
    "dragY": {
        /**
         * enable or disable vertical scrolling 
         * @param {boolean} v 
         */
        set: function (v) {
            dragY = v;
        },
        /**
         * @returns {boolean} - is vertical scrolling enabled
         */
        get: () => {
            return dragY;
        }
    },
    "content": {
        /**
         * get content screen transform
         * @returns {ScreenTransform}
         */
        get: () => {
            return contentScreenTransform;
        },
        /**
         * set content screen transform
         * @param {ScreenTransform} v 
         */
        set: v => {
            contentScreenTransform = v;
        }
    },
    "scrollBarWidth": {
        /**
         * @returns {number}
         */
        get: () => {
            return scrollBarWidth;
        },
        /**
         * set scroll bar width
         * @param {number} v 
         */
        set: v => {
            scrollBarWidth = v;
            if (horizontalScrollBar) {
                horizontalScrollBar.setWidth(v);
            }
            if (verticalScrollBar) {
                verticalScrollBar.setWidth(v, enableHorizontalScrollBar);
            }
        }
    },
    "enableHorizontalScrollBar": {
        /**
         * @returns {boolean}
         */
        get: () => {
            return enableHorizontalScrollBar;
        },
        /**
         * set scroll bar width
         * @param {boolean} v 
         */
        set: v => {
            enableHorizontalScrollBar = v;
            if (!isNull(horizontalScrollBar)) {
                horizontalScrollBar.setEnabled(v);
            }
        }
    },
    "enableVerticalScrollBar": {
        /**
         * @returns {boolean}
         */
        get: () => {
            return enableVerticalScrollBar;
        },
        /**
         * set scroll bar width
         * @param {boolean} v 
         */
        set: v => {
            enableVerticalScrollBar = v;
            if (!isNull(verticalScrollBar)) {
                verticalScrollBar.setEnabled(v);
            }
        }
    },
    "elasticity": {
        /**
         * @returns {number}
         */
        get: () => {
            return elasticity;
        },
        /**
         * set scroll bar width
         * @param {number} v 
         */
        set: v => {
            elasticity = v;
        }
    },
    "inertia": {
        /**
         * @returns {boolean}
         */
        get: () => {
            return inertia;
        },
        /**
         * set scroll bar width
         * @param {boolean} v 
         */
        set: v => {
            inertia = v;
        }
    },
    "dampening": {
        /**
         * @returns {number}
         */
        get: () => {
            return dampening;
        },
        /**
         * set scroll bar width
         * @param {number} v 
         */
        set: v => {
            dampening = v;
        }
    }

});
/**
 * copy rectangle
 * @param {Rect} rect 
 * @returns {Rect} copy of rectangle
 */
function copyRect(rect) {
    return Rect.create(rect.left, rect.right, rect.bottom, rect.top);
}
/**
 * 
 * @param {Rect} from 
 * @param {Rect} to 
 * @param {number} t 
 * @returns {Rect} rect between `from` and `to` determined by ratio `t`
 */
function lerpRect(from, to, t) {
    from.left = lerp(from.left, to.left, t);
    from.right = lerp(from.right, to.right, t);
    from.bottom = lerp(from.bottom, to.bottom, t);
    from.top = lerp(from.top, to.top, t);
    return from;
}

/**
* Returns the number between `a` and `b` determined by the ratio `t`
* @param {number} a Lower Bound
* @param {number} b Upper Bound
* @param {number} t Ratio [0-1]
* @returns {number} Number between `a` and `b` determined by ratio `t`
*/
function lerp(a, b, t) {
    return a + (b - a) * t;
}

script.isDirty = isDirty;
script.markDirty = markDirty;

/** @enum { number } */
script.ScrollType = ScrollType;
/** @enum { number } */
script.ScrollBarType = ScrollBarType;

script.createEvent("OnStartEvent").bind(onStart);
