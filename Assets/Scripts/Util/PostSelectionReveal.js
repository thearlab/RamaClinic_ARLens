// PostSelectionReveal.js
///////////////
// Version: 1.0
///////////////
// Description: Triggered once (after the first grid selection). Waits a delay,
// then fades a material in and slides 4 ScreenTransforms into their original
// positions: 2 entering from the left, 2 from the right.
///////////////
// by THEARLAB
///////////////

//@input float delay = 1.0 {"hint":"Wait after trigger before the reveal starts (seconds)."}

//@ui {"widget":"separator"}
//@input Asset.Material fadeMaterial {"hint":"Material faded from 0 to its original alpha on reveal."}
//@input float fadeDuration = 0.5 {"hint":"Material fade-in duration (seconds)."}

//@ui {"widget":"separator"}
//@input Component.ScreenTransform[] fromLeft {"hint":"ScreenTransforms that slide in from the left (e.g. 2)."}
//@input Component.ScreenTransform[] fromRight {"hint":"ScreenTransforms that slide in from the right (e.g. 2)."}
//@input float slideDuration = 0.6 {"hint":"Slide-in duration (seconds)."}
//@input float stagger = 0.08 {"hint":"Small delay between each transform starting its slide (seconds)."}
//@input float slideDistance = 2.0 {"hint":"How far off-screen they start, in anchor units (2 = fully off a centered screen)."}

//@ui {"widget":"separator"}
//@input Component.ScriptComponent hoverController {"hint":"Optional HoverFloat (same transforms). api.play() fires when all slides finish."}
//@input string easing = "QuadraticOut" {"widget":"combobox","values":[{"label":"Linear","value":"Linear"},{"label":"Quadratic Out","value":"QuadraticOut"},{"label":"Quadratic InOut","value":"QuadraticInOut"},{"label":"Cubic Out","value":"CubicOut"},{"label":"Cubic InOut","value":"CubicInOut"},{"label":"Sinusoidal InOut","value":"SinusoidalInOut"},{"label":"Exponential Out","value":"ExponentialOut"},{"label":"Back Out","value":"BackOut"}]}

//@ui {"widget":"separator"}
//@input bool triggerOnce = true {"hint":"Ignore further triggers until reset."}

// ============================================
// STATE
// ============================================
var items = [];          // { st, origLeft, origRight, startOffset }
var fadeFullAlpha = 1;   // fadeMaterial's original alpha
var slideTweens = [];    // one tween per transform (staggered)
var slidesPending = 0;   // remaining slide tweens before hover starts
var fadeTween = null;
var delayEvent = null;
var triggered = false;

// ============================================
// LIFECYCLE
// ============================================
script.createEvent("OnStartEvent").bind(onStart);

function onStart() {
    cacheItems();

    if (script.fadeMaterial) {
        var a = getAlpha(script.fadeMaterial);
        fadeFullAlpha = (a === null) ? 1 : a;
    }

    // Start hidden / off-screen so the reveal has somewhere to slide in from.
    hideAll();
}

// Cache each ScreenTransform's authored anchor edges and the off-screen
// horizontal offset it should start at (negative = left, positive = right).
function cacheItems() {
    items = [];
    addItems(script.fromLeft, -script.slideDistance);
    addItems(script.fromRight, script.slideDistance);
}

function addItems(list, startOffset) {
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
        var st = list[i];
        if (!st) continue;
        items.push({
            st: st,
            origLeft: st.anchors.left,
            origRight: st.anchors.right,
            startOffset: startOffset
        });
    }
}

// ============================================
// REVEAL
// ============================================
function trigger() {
    if (script.triggerOnce && triggered) return;
    triggered = true;

    // Re-cache in case anchors moved since start, then push everything off-screen.
    hideAll();

    if (delayEvent) {
        delayEvent.enabled = false;
        delayEvent = null;
    }
    delayEvent = script.createEvent("DelayedCallbackEvent");
    delayEvent.bind(reveal);
    delayEvent.reset(script.delay);
}

function reveal() {
    fadeIn();
    slideIn();
}

function slideIn() {
    stopSlides();
    slidesPending = items.length;
    if (slidesPending === 0) {
        onAllSlidesComplete();
        return;
    }
    // Each transform starts its slide a little after the previous one.
    for (var i = 0; i < items.length; i++) {
        slideOne(items[i], i * script.stagger);
    }
}

function slideOne(it, startDelay) {
    var tw = new global.CustomTween({
        name: "PostSelectionSlide",
        duration: script.slideDuration,
        delay: startDelay,
        easing: global.Easings[script.easing] || global.Easings.QuadraticOut,
        onUpdate: function (p) {
            var off = lerp(it.startOffset, 0, p);
            it.st.anchors.left = it.origLeft + off;
            it.st.anchors.right = it.origRight + off;
        },
        onComplete: function () {
            // Snap exactly to authored anchors to avoid float drift.
            it.st.anchors.left = it.origLeft;
            it.st.anchors.right = it.origRight;
            slidesPending--;
            if (slidesPending <= 0) onAllSlidesComplete();
        }
    });
    slideTweens.push(tw);
    tw.start();
}

// All slide-ins finished -> start the hover on the same transforms.
function onAllSlidesComplete() {
    if (script.hoverController && script.hoverController.api && script.hoverController.api.play) {
        script.hoverController.api.play();
    }
}

function stopSlides() {
    for (var i = 0; i < slideTweens.length; i++) {
        if (slideTweens[i]) slideTweens[i].stop();
    }
    slideTweens = [];
}

function fadeIn() {
    if (!script.fadeMaterial) return;
    if (fadeTween) fadeTween.stop();

    setAlpha(script.fadeMaterial, 0);
    fadeTween = new global.CustomTween({
        name: "PostSelectionFade",
        duration: script.fadeDuration,
        easing: global.Easings.QuadraticInOut,
        onUpdate: function (p) {
            setAlpha(script.fadeMaterial, lerp(0, fadeFullAlpha, p));
        },
        onComplete: function () {
            fadeTween = null;
        }
    });
    fadeTween.start();
}

// ============================================
// HIDE
// ============================================
function hideAll() {
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        it.st.anchors.left = it.origLeft + it.startOffset;
        it.st.anchors.right = it.origRight + it.startOffset;
    }
    if (script.fadeMaterial) {
        setAlpha(script.fadeMaterial, 0);
    }
}

// ============================================
// MATERIAL ALPHA / UTIL
// ============================================
function setAlpha(mat, a) {
    if (!mat || !mat.mainPass) return;
    var bc = mat.mainPass.baseColor;
    if (bc) mat.mainPass.baseColor = new vec4(bc.x, bc.y, bc.z, a);
    var bcf = mat.mainPass.baseColorFactor;
    if (bcf) mat.mainPass.baseColorFactor = new vec4(bcf.x, bcf.y, bcf.z, a);
    if (typeof mat.mainPass.opacity === "number") mat.mainPass.opacity = a;
}

function getAlpha(mat) {
    if (!mat || !mat.mainPass) return null;
    var bc = mat.mainPass.baseColor;
    if (bc && typeof bc.w !== "undefined") return bc.w;
    var bcf = mat.mainPass.baseColorFactor;
    if (bcf && typeof bcf.w !== "undefined") return bcf.w;
    if (typeof mat.mainPass.opacity === "number") return mat.mainPass.opacity;
    return null;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// ============================================
// RESET (RestartButton-compatible)
// ============================================
function reset() {
    stopSlides();
    slidesPending = 0;
    // Stop the hover so it doesn't keep bobbing the re-hidden transforms.
    if (script.hoverController && script.hoverController.api && script.hoverController.api.reset) {
        script.hoverController.api.reset();
    }
    if (fadeTween) { fadeTween.stop(); fadeTween = null; }
    if (delayEvent) { delayEvent.enabled = false; delayEvent = null; }
    triggered = false;
    hideAll();
}

script.reset = reset;
script.api.reset = reset;
script.api.trigger = trigger;   // called by GridTextureSelector on first selection
script.api.getDelay = function () { return script.delay; };   // shared delay value

script.createEvent("OnDestroyEvent").bind(function () {
    stopSlides();
    if (fadeTween) fadeTween.stop();
});
