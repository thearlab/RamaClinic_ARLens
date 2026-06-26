// TapRevealAction.js
///////////////
// Version: 1.0
///////////////
// Description: On tap of an InteractionComponent:
//   1. enables a target SceneObject,
//   2. fades in a set of materials (default 3) from alpha 0 -> 1,
//   3. hides hints (default ids 0 and 1) via the global HintsManager.
///////////////
// by THEARLAB
///////////////

//@input Component.InteractionComponent interaction {"hint":"Tap source. Fires the reveal."}

//@ui {"widget":"separator"}
//@input SceneObject objectToEnable {"hint":"Enabled on tap."}
//@input Asset.Material[] fadeMaterials {"hint":"Materials faded in on tap (assign 3). Each is animated alpha 0 -> 1."}
//@input float fadeDuration = 0.5 {"hint":"Material fade-in duration (seconds)."}
//@input float fadeDelay = 0 {"hint":"Delay before the fade starts (seconds)."}
//@input string easing = "QuadraticInOut" {"widget":"combobox","values":[{"label":"Linear","value":"Linear"},{"label":"Quadratic In","value":"QuadraticIn"},{"label":"Quadratic Out","value":"QuadraticOut"},{"label":"Quadratic InOut","value":"QuadraticInOut"},{"label":"Cubic InOut","value":"CubicInOut"},{"label":"Sinusoidal InOut","value":"SinusoidalInOut"},{"label":"Exponential Out","value":"ExponentialOut"}]}

//@ui {"widget":"separator"}
//@input bool hideHint = true {"hint":"Hide hints via the global HintsManager on tap."}
//@input int[] hintIndices {"hint":"Hint ids to hide (e.g. add 0 and 1).", "showIf":"hideHint"}
//@input float hintFadeDelay = 0 {"hint":"Delay before the hints hide (seconds).", "showIf":"hideHint"}

//@ui {"widget":"separator"}
//@input bool triggerOnce = true {"hint":"Ignore further taps after the first reveal (until reset)."}

// ============================================
// STATE
// ============================================
var fadeTween = null;
var triggered = false;
var baseColors = [];   // cached rgb per material so the fade only touches alpha

// ============================================
// LIFECYCLE
// ============================================
script.createEvent("OnStartEvent").bind(onStart);

function onStart() {
    cacheBaseColors();

    // Start hidden so the fade-in has somewhere to come from.
    setMaterialsAlpha(0);
    if (script.objectToEnable) {
        script.objectToEnable.enabled = false;
    }

    if (!script.interaction) {
        print("WARNING: TapRevealAction - no interaction component assigned.");
        return;
    }
    script.interaction.onTap.add(onTap);
}

function cacheBaseColors() {
    baseColors = [];
    var mats = script.fadeMaterials || [];
    for (var i = 0; i < mats.length; i++) {
        var c = (mats[i] && mats[i].mainPass) ? mats[i].mainPass.baseColor : null;
        baseColors[i] = c ? new vec4(c.r, c.g, c.b, c.a) : new vec4(1, 1, 1, 1);
    }
}

// ============================================
// TAP
// ============================================
function onTap() {
    if (script.triggerOnce && triggered) {
        return;
    }
    triggered = true;

    if (script.objectToEnable) {
        script.objectToEnable.enabled = true;
    }

    fadeInMaterials();

    hideHints();
}

function hideHints() {
    if (!script.hideHint || !global.HideHint) return;
    var ids = script.hintIndices || [];
    for (var i = 0; i < ids.length; i++) {
        global.HideHint(ids[i], script.hintFadeDelay);
    }
}

function fadeInMaterials() {
    var mats = script.fadeMaterials || [];
    if (mats.length === 0) return;

    if (fadeTween) {
        fadeTween.stop();
    }

    fadeTween = new global.CustomTween({
        name: "TapRevealFade",
        duration: script.fadeDuration,
        delay: script.fadeDelay,
        easing: global.Easings[script.easing] || global.Easings.QuadraticInOut,
        onStart: function () {
            setMaterialsAlpha(0);
        },
        onUpdate: function (progress) {
            setMaterialsAlpha(progress);
        }
    });
    fadeTween.start();
}

// ============================================
// MATERIAL ALPHA
// ============================================
function setMaterialsAlpha(alpha) {
    var mats = script.fadeMaterials || [];
    for (var i = 0; i < mats.length; i++) {
        var mat = mats[i];
        if (!mat || !mat.mainPass) continue;
        var rgb = baseColors[i] || new vec4(1, 1, 1, 1);
        mat.mainPass.baseColor = new vec4(rgb.r, rgb.g, rgb.b, alpha);
    }
}

// ============================================
// RESET (RestartButton-compatible)
// ============================================
function reset() {
    if (fadeTween) {
        fadeTween.stop();
        fadeTween = null;
    }
    triggered = false;
    setMaterialsAlpha(0);
    if (script.objectToEnable) {
        script.objectToEnable.enabled = false;
    }
}

script.reset = reset;
script.api.reset = reset;
script.api.trigger = onTap;   // allow firing the reveal from another script

script.createEvent("OnDestroyEvent").bind(function () {
    if (fadeTween) fadeTween.stop();
});
