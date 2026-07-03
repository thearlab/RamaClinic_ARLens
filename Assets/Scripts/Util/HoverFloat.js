// HoverFloat.js
///////////////
// Version: 1.0
///////////////
// Description: Continuously hovers a set of ScreenTransforms up and down on Y
// using a sine wave. Each item gets a phase offset so they're NOT in sync.
// Hover amount (amplitude), speed, and the phase offset are all inputs.
///////////////
// by THEARLAB
///////////////

//@input Component.ScreenTransform[] screenTransforms {"hint":"Items to hover up/down on Y."}

//@ui {"widget":"separator"}
//@input float hoverAmount = 0.04 {"hint":"Vertical hover amplitude, in anchor units (half the total travel)."}
//@input float speed = 2.0 {"hint":"Hover speed (radians per second)."}
//@input float phaseOffset = 0.6 {"hint":"Phase difference between consecutive items (radians) so they bob out of sync. 0 = all in sync."}

//@ui {"widget":"separator"}
//@input bool playOnStart = false {"hint":"Start hovering at scene start. Leave OFF if another script calls api.play() (e.g. after a slide-in)."}

// ============================================
// STATE
// ============================================
var items = [];      // { st, x, baseY, origY }
var elapsed = 0;
var playing = false;

// ============================================
// LIFECYCLE
// ============================================
script.createEvent("OnStartEvent").bind(onStart);
script.createEvent("UpdateEvent").bind(onUpdate);

function onStart() {
    cacheItems();
    if (script.playOnStart) play();
}

function cacheItems() {
    items = [];
    var list = script.screenTransforms || [];
    for (var i = 0; i < list.length; i++) {
        var st = list[i];
        if (!st) continue;
        var c = st.anchors.getCenter();
        // Shift the oscillation base by -sin(phase)*amount so that at elapsed 0
        // the item sits EXACTLY at its current position (no startup jump), then
        // bobs symmetrically by +/- amount around that base.
        var phase = i * script.phaseOffset;
        var baseY = c.y - Math.sin(phase) * script.hoverAmount;
        items.push({ st: st, x: c.x, baseY: baseY, origY: c.y });
    }
}

function onUpdate() {
    if (!playing) return;
    elapsed += getDeltaTime();

    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var offset = Math.sin(elapsed * script.speed + i * script.phaseOffset) * script.hoverAmount;
        it.st.anchors.setCenter(new vec2(it.x, it.baseY + offset));
    }
}

// ============================================
// CONTROL
// ============================================
// Re-cache current positions as the hover base, so we bob around wherever the
// items are now (e.g. their final slid-in spots), then start.
function play() {
    cacheItems();
    elapsed = 0;
    playing = true;
}

function stop() {
    playing = false;
}

// Stop hovering and snap everything back to its original position.
function reset() {
    playing = false;
    elapsed = 0;
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        it.st.anchors.setCenter(new vec2(it.x, it.origY));
    }
}

script.reset = reset;
script.api.reset = reset;
script.api.play = play;
script.api.stop = stop;
