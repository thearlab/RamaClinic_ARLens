// MaterialBlurController.js
///////////////
// Version: 1.0
///////////////
// Description: Tweens a numeric material property (e.g. "blurFactor") in and
// out. blurIn() ramps it to 'blurAmount' quickly; blurOut() ramps it back to 0.
///////////////
// by THEARLAB
///////////////

//@input Asset.Material material {"hint":"Material whose property is tweened."}
//@input string property = "blurFactor" {"hint":"Numeric mainPass property name to tween."}
//@input float blurAmount = 0.45 {"hint":"Target value for blurIn()."}
//@input float duration = 0.15 {"hint":"Tween duration (seconds) - quick."}
//@input string easing = "QuadraticOut" {"widget":"combobox","values":[{"label":"Linear","value":"Linear"},{"label":"Quadratic Out","value":"QuadraticOut"},{"label":"Quadratic InOut","value":"QuadraticInOut"},{"label":"Cubic Out","value":"CubicOut"},{"label":"Sinusoidal InOut","value":"SinusoidalInOut"},{"label":"Exponential Out","value":"ExponentialOut"}]}

//@ui {"widget":"separator"}
//@input bool setZeroOnStart = true {"hint":"Force the property to 0 (no blur) at scene start."}

// ============================================
// STATE
// ============================================
var blurTween = null;

// ============================================
// LIFECYCLE
// ============================================
script.createEvent("OnStartEvent").bind(function () {
    if (script.setZeroOnStart) {
        setValue(0);
    }
});

// ============================================
// BLUR
// ============================================
function blurIn() { tweenTo(script.blurAmount); }
function blurOut() { tweenTo(0); }

function tweenTo(target) {
    var mat = script.material;
    if (!mat || !mat.mainPass) {
        print("WARNING: MaterialBlurController - no material assigned.");
        return;
    }

    if (blurTween) {
        blurTween.stop();
        blurTween = null;
    }

    var start = mat.mainPass[script.property];
    if (typeof start !== "number") start = 0;

    blurTween = new global.CustomTween({
        name: "MaterialBlur",
        duration: script.duration,
        easing: global.Easings[script.easing] || global.Easings.QuadraticOut,
        onUpdate: function (p) {
            setValue(lerp(start, target, p));
        },
        onComplete: function () {
            setValue(target);   // snap to exact target
            blurTween = null;
        }
    });
    blurTween.start();
}

function setValue(v) {
    var mat = script.material;
    if (mat && mat.mainPass) {
        mat.mainPass[script.property] = v;
    }
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
    if (blurTween) { blurTween.stop(); blurTween = null; }
    setValue(0);
}

script.reset = reset;
script.api.reset = reset;
script.api.blurIn = blurIn;
script.api.blurOut = blurOut;
script.api.tweenTo = tweenTo;   // tween to an arbitrary value

script.createEvent("OnDestroyEvent").bind(function () {
    if (blurTween) blurTween.stop();
});
