// TapSlideAnchor.js
///////////////
// Version: 1.0
///////////////
// Description: On tap of an InteractionComponent, tweens a ScreenTransform's
// bottom anchor from a start value to an end value (default 0.7 -> -0.3).
///////////////
// by THEARLAB
///////////////

//@input Component.InteractionComponent interaction {"hint":"Tap source."}
//@input Component.ScreenTransform screenTransform {"hint":"ScreenTransform whose bottom anchor is tweened."}
//@input Component.ScreenTransform screenTransform2 {"hint":"ScreenTransform whose bottom anchor is tweened."}

//@ui {"widget":"separator"}
//@input float fromBottom = 0.7 {"hint":"Bottom anchor at start (parent space, -1..1)."}
//@input float toBottom = -0.3 {"hint":"Bottom anchor at end."}
//@input float duration = 0.5 {"hint":"Tween duration (seconds)."}
//@input float delay = 0 {"hint":"Delay before the tween starts (seconds)."}
//@input string easing = "QuadraticInOut" {"widget":"combobox","values":[{"label":"Linear","value":"Linear"},{"label":"Quadratic In","value":"QuadraticIn"},{"label":"Quadratic Out","value":"QuadraticOut"},{"label":"Quadratic InOut","value":"QuadraticInOut"},{"label":"Cubic InOut","value":"CubicInOut"},{"label":"Sinusoidal InOut","value":"SinusoidalInOut"},{"label":"Exponential Out","value":"ExponentialOut"},{"label":"Back Out","value":"BackOut"}]}

//@ui {"widget":"separator"}
//@input Component.ScriptComponent gridGenerator {"hint":"Optional TextureGridGenerator. Its cells pop in on tap."}
//@input float popDelay = 0.5 {"hint":"Delay after tap before the grid pops in (seconds)."}
//@input float popStagger = 0.03 {"hint":"Delay between each cell's pop-in (seconds)."}
//@input float popOutDuration = 0.25 {"hint":"How long the grid cells take to scale down to 0 on close (seconds)."}
//@input Component.ScriptComponent blurController {"hint":"Optional MaterialBlurController. Blurs in on tap."}

//@ui {"widget":"separator"}
//@input bool setStartOnAwake = true {"hint":"Set the bottom anchor to 'fromBottom' at scene start."}
//@input bool triggerOnce = true {"hint":"Ignore further taps until reset."}

// ============================================
// STATE
// ============================================
var slideTween = null;
var triggered = false;
var poppedOnce = false;   // grid pop-in only plays the first time the grid opens
var st2TopFixed = 0;     // screenTransform2's top anchor (kept fixed the whole time)
var st2FullBottom = 0;   // screenTransform2's original (expanded) bottom anchor

// ============================================
// LIFECYCLE
// ============================================
script.createEvent("OnStartEvent").bind(onStart);

function onStart() {
    if (!script.screenTransform) {
        print("WARNING: TapSlideAnchor - no screenTransform assigned.");
        return;
    }

    // Cache screenTransform2's top (kept fixed) and its expanded bottom, then
    // collapse it by placing the bottom anchor on the top anchor at start.
    // It "grows" by dragging the bottom down once the tap interaction fires.
    if (script.screenTransform2) {
        st2TopFixed = script.screenTransform2.anchors.top;
        st2FullBottom = script.screenTransform2.anchors.bottom;
        script.screenTransform2.anchors.bottom = st2TopFixed;
    }

    if (script.setStartOnAwake) {
        setBottom(script.fromBottom);
    }

    if (!script.interaction) {
        print("WARNING: TapSlideAnchor - no interaction component assigned.");
        return;
    }
    script.interaction.onTap.add(onTap);
}

// ============================================
// TAP
// ============================================
function onTap() {
    if (script.triggerOnce && triggered) {
        return;
    }
    triggered = true;
    slideTo(script.toBottom);

    // Reveal/slide sound.
    if (global.PlayAudio) {
        global.PlayAudio(1);
    }

    var isFirstOpen = !poppedOnce;
    poppedOnce = true;

    // Grid cells: staggered (diagonal) pop on the FIRST open; on later opens a
    // simple pop where all cells scale up together (stagger 0).
    var grid = script.gridGenerator && script.gridGenerator.api ? script.gridGenerator.api : null;
    if (grid && grid.popIn) {
        grid.popIn(script.popDelay, isFirstOpen ? script.popStagger : 0);
    }

    // First open only: hide the opening hint.
    if (isFirstOpen && global.HideHint) {
        global.HideHint(0, 0);
    }
    // Blur in quickly.
    if (script.blurController && script.blurController.api && script.blurController.api.blurIn) {
        script.blurController.api.blurIn();
    }
}

// Tween the bottom anchor from its CURRENT value to 'target' so it works
// regardless of which state the panel is in. 'onDone' (optional) fires when
// the slide completes.
function slideTo(target, onDone) {
    if (!script.screenTransform) return;

    if (slideTween) {
        slideTween.stop();
    }

    var start = script.screenTransform.anchors.bottom;

    // screenTransform2: top stays fixed, only the bottom anchor drags.
    // Opening expands the bottom down to its full size; closing collapses it
    // back onto the top anchor.
    var startBottom2 = script.screenTransform2 ? script.screenTransform2.anchors.bottom : 0;
    var targetBottom2 = (target === script.toBottom) ? st2FullBottom : st2TopFixed;

    slideTween = new global.CustomTween({
        name: "TapSlideAnchor",
        duration: script.duration,
        delay: script.delay,
        easing: global.Easings[script.easing] || global.Easings.QuadraticInOut,
        onUpdate: function (progress) {
            setBottom(lerp(start, target, progress));
            if (script.screenTransform2) {
                script.screenTransform2.anchors.bottom = lerp(startBottom2, targetBottom2, progress);
            }
        },
        onComplete: function () {
            if (onDone) onDone();
        }
    });
    slideTween.start();
}

// Open: slide out to toBottom (-0.3). Same as a tap.
function slideForward() {
    slideTo(script.toBottom);
}

// Close: slide back to fromBottom (0.7) and re-arm the tap. The grid cells
// tween down to 0 as the panel slides away.
function slideBack() {
    triggered = false;
    if (script.gridGenerator && script.gridGenerator.api && script.gridGenerator.api.popOut) {
        script.gridGenerator.api.popOut(script.popOutDuration);
    }
    slideTo(script.fromBottom);
}

// ============================================
// ANCHOR
// ============================================
function setBottom(value) {
    // anchors is a live Rect on the ScreenTransform; setting an edge moves it.
    // screenTransform2 is driven separately (top fixed, bottom dragged) in slideTo.
    script.screenTransform.anchors.bottom = value;
}

// ============================================
// UTIL
// ============================================
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// ============================================
// RESET (RestartButton-compatible)
// ============================================
function reset() {
    if (slideTween) {
        slideTween.stop();
        slideTween = null;
    }
    triggered = false;
    poppedOnce = false;   // let the pop-in play again after a full restart
    if (script.screenTransform) {
        setBottom(script.fromBottom);
    }
    // Collapse screenTransform2 again (bottom back onto the fixed top) so it
    // re-grows on the next tap.
    if (script.screenTransform2) {
        script.screenTransform2.anchors.bottom = st2TopFixed;
    }
}

script.reset = reset;
script.api.reset = reset;
script.api.trigger = onTap;          // fire the slide (open) from another script
script.api.slideForward = slideForward;
script.api.slideBack = slideBack;    // call when a grid option is tapped

script.createEvent("OnDestroyEvent").bind(function () {
    if (slideTween) slideTween.stop();
});
