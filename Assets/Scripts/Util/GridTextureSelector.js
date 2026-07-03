// GridTextureSelector.js
///////////////
// Version: 1.0
///////////////
// Description: Listens for grid cell taps from a TextureGridGenerator and, when
// an option is selected, assigns the texture at that same index to a material.
///////////////
// by THEARLAB
///////////////

//@input Component.ScriptComponent gridGenerator {"hint":"The TextureGridGenerator script. Its onCellTapped drives the selection."}
//@input Asset.Texture[] textures {"hint":"Textures indexed to match the grid cells (same order)."}
//@input Asset.Material targetMaterial {"hint":"Material whose baseTex is set to the selected texture."}
//@input Asset.Material targetMaterial2 {"hint":"Material whose baseTex is set to the selected texture."}

//@ui {"widget":"separator"}
//@input Asset.Material fadeMaterial {"hint":"Material that fades out, switches texture, then fades back in on selection."}
//@input Asset.Texture[] fadeTextures {"hint":"Textures for the fade material, indexed to match the grid cells (same order)."}
//@input float fadeDuration = 0.3 {"hint":"Fade-out / fade-in duration in seconds (each half)."}
//@input float colorDuration = 0.4 {"hint":"Color tween duration in seconds (flag-color materials)."}

//@ui {"widget":"separator"}
//@input Asset.Material colorMaterial1 {"hint":"Gets the selected flag's 1st color (baseColor)."}
//@input Asset.Material colorMaterial2 {"hint":"Gets the selected flag's 2nd color (baseColor)."}
//@input Asset.Material colorMaterial3 {"hint":"Gets the selected flag's 3rd color (baseColor)."}
//@input Asset.Material colorMaterial4 {"hint":"Gets the selected flag's 4th color (baseColor)."}

//@ui {"widget":"separator"}
//@input Component.ScriptComponent revealController {"hint":"Optional PostSelectionReveal. Its api.trigger() fires on the FIRST selection."}
//@input Component.ScriptComponent blurController {"hint":"Optional MaterialBlurController. Blurs back to 0 on selection."}

//@ui {"widget":"separator"}
//@input float sound3Delay = 0.25 {"hint":"Delay before the 2nd selection sound (audio index 3) plays after the first (index 2)."}

//@ui {"widget":"separator"}
//@input Component.ScriptComponent slidePanel {"hint":"Optional TapSlideAnchor. Slides back to its start (0.7) when an option is tapped."}
//@input int defaultIndex = -1 {"hint":"Texture selected at start. -1 = leave the material untouched."}

// ============================================
// STATE
// ============================================
var fadeTween = null;
var fadeFullAlpha = 1;   // fadeMaterial's original alpha, captured at start
var colorTween = null;   // in-flight flag-color tween
var firstSelectionDone = false;
var sound3Event = null;  // delayed play of the 2nd selection sound

// ============================================
// LIFECYCLE
// ============================================
script.createEvent("OnStartEvent").bind(onStart);

function onStart() {
    if (!script.targetMaterial) {
        print("WARNING: GridTextureSelector - no targetMaterial assigned.");
    }

    // Cache the fade material's full alpha so fades return to the right value.
    if (script.fadeMaterial) {
        var a = getAlpha(script.fadeMaterial);
        fadeFullAlpha = (a === null) ? 1 : a;
    }

    if (script.gridGenerator && script.gridGenerator.api) {
        // Grid calls api.onCellTapped(index, cell) when a cell is tapped.
        script.gridGenerator.api.onCellTapped = function (index) {
            select(index);
        };
    } else {
        print("WARNING: GridTextureSelector - no gridGenerator assigned; call api.select(index) manually.");
    }

    // Delayed play of the 2nd selection sound (audio index 3).
    sound3Event = script.createEvent("DelayedCallbackEvent");
    sound3Event.bind(function () {
        if (global.PlayAudio) global.PlayAudio(3);
    });

    if (script.defaultIndex >= 0) {
        select(script.defaultIndex, true);   // startup: don't count as the first user selection
    }
}

// ============================================
// SELECTION
// ============================================
function select(index, isStartup) {
    var textures = script.textures || [];
    if (index < 0 || index >= textures.length) {
        print("WARNING: GridTextureSelector - no texture at index " + index + ".");
        return;
    }

    if (script.targetMaterial && script.targetMaterial.mainPass) {
        script.targetMaterial.mainPass.baseTex = textures[index];
    }
    if (script.targetMaterial2 && script.targetMaterial2.mainPass) {
        script.targetMaterial2.mainPass.baseTex = textures[index];
    }
    var isFirstUser = !isStartup && !firstSelectionDone;

    // On the first user selection, wait the reveal's delay before the fade swap
    // so it stays in sync with the post-selection reveal.
    var swapDelay = 0;
    if (isFirstUser && script.revealController && script.revealController.api && script.revealController.api.getDelay) {
        swapDelay = script.revealController.api.getDelay();
    }
    // Fade material out, swap its texture (same index), then fade back in.
    fadeSwapTexture(index, swapDelay);
    // Set the 4 flag-color materials to this country's colors.
    applyFlagColors(index);
    // First user selection only: kick off the post-selection reveal.
    if (isFirstUser) {
        firstSelectionDone = true;
        if (script.revealController && script.revealController.api && script.revealController.api.trigger) {
            script.revealController.api.trigger();
        }
        // Hide the selection hint, then show the next hint after 1s.
        if (global.HideHint) {
            global.HideHint(2, 0);
        }
        if (global.ShowHint) {
            global.ShowHint(3, 2.5);
        }
    }
    // Selection sounds: play index 2 now, then index 3 after a small delay.
    if (!isStartup) {
        if (global.PlayAudio) global.PlayAudio(2);
        if (sound3Event) sound3Event.reset(script.sound3Delay);
    }
    // Close the picker panel (slide its bottom anchor back to 0.7).
    if (script.slidePanel && script.slidePanel.api && script.slidePanel.api.slideBack) {
        script.slidePanel.api.slideBack();
    }
    // Blur back to 0 on selection.
    if (script.blurController && script.blurController.api && script.blurController.api.blurOut) {
        script.blurController.api.blurOut();
    }
}

// ============================================
// FADE SWAP
// ============================================
// Fade the fade material out to 0, swap its baseTex (texture at 'index'),
// then fade back to its original alpha. 'startDelay' (seconds) delays the
// fade-out start (used on the first selection to sync with the reveal).
function fadeSwapTexture(index, startDelay) {
    var mat = script.fadeMaterial;
    if (!mat || !mat.mainPass) return;

    var fadeTextures = script.fadeTextures || [];
    if (index < 0 || index >= fadeTextures.length || !fadeTextures[index]) {
        print("WARNING: GridTextureSelector - no fadeTexture at index " + index + ".");
        return;
    }
    var newTex = fadeTextures[index];

    // Kill any in-flight fade so two tweens don't fight over the same alpha.
    if (fadeTween) {
        fadeTween.stop();
        fadeTween = null;
    }

    var startAlpha = getAlpha(mat);
    if (startAlpha === null) startAlpha = fadeFullAlpha;

    fadeTween = new global.CustomTween({
        name: "GridFadeOut",
        duration: script.fadeDuration,
        delay: startDelay || 0,
        easing: global.Easings.QuadraticInOut,
        onUpdate: function (p) {
            setAlpha(mat, lerp(startAlpha, 0, p));
        },
        onComplete: function () {
            // Swap texture while fully transparent so the change is hidden.
            mat.mainPass.baseTex = newTex;
            fadeTween = new global.CustomTween({
                name: "GridFadeIn",
                duration: script.fadeDuration,
                easing: global.Easings.QuadraticInOut,
                onUpdate: function (p) {
                    setAlpha(mat, lerp(0, fadeFullAlpha, p));
                },
                onComplete: function () {
                    fadeTween = null;
                }
            });
            fadeTween.start();
        }
    });
    fadeTween.start();
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
// FLAG COLORS
// ============================================
// Source of truth: one row per country, 4 colors each (RGB 0..1), ordered by
// visual prominence. Flags with <4 colors repeat their dominant colors; flags
// with >4 keep the 4 most prominent. Index MUST match the grid/textures order.
var COUNTRY_COLORS = [
    [new vec4(0,0,0,1),          new vec4(0.86,0,0.10,1),    new vec4(1,0.81,0,1),       new vec4(1,0.81,0,1)],        // 0  Germany
    [new vec4(0,0.60,0.71,1),    new vec4(1,1,1,1),          new vec4(0.12,0.71,0.23,1), new vec4(0.81,0.07,0.15,1)],  // 1  Uzbekistan
    [new vec4(0.67,0.08,0.11,1), new vec4(0.95,0.75,0,1),    new vec4(0.67,0.08,0.11,1), new vec4(0.95,0.75,0,1)],      // 2  Spain
    [new vec4(1,1,1,1),          new vec4(0.81,0.07,0.14,1), new vec4(1,1,1,1),          new vec4(0.81,0.07,0.14,1)],  // 3  England
    [new vec4(0.14,0.62,0.25,1), new vec4(1,1,1,1),          new vec4(0.85,0,0,1),       new vec4(0.14,0.62,0.25,1)],  // 4  Iran
    [new vec4(0,0.14,0.49,1),    new vec4(0.80,0.08,0.17,1), new vec4(1,1,1,1),          new vec4(0,0.14,0.49,1)],      // 5  Australia
    [new vec4(0.46,0.67,0.86,1), new vec4(1,1,1,1),          new vec4(0.99,0.75,0.29,1), new vec4(0.46,0.67,0.86,1)],  // 6  Argentina
    [new vec4(0,0,0,1),          new vec4(1,1,1,1),          new vec4(0,0.46,0.24,1),    new vec4(0.81,0.07,0.15,1)],  // 7  Jordan
    [new vec4(0,0.22,0.66,1),    new vec4(1,1,1,1),          new vec4(0.99,0.82,0.09,1), new vec4(0,0.22,0.66,1)],      // 8  Uruguay
    [new vec4(1,0.87,0,1),       new vec4(0.01,0.31,0.64,1), new vec4(0.93,0.11,0.14,1), new vec4(1,0.87,0,1)],        // 9  Ecuador
    [new vec4(0,0.59,0.22,1),    new vec4(1,0.87,0,1),       new vec4(0.01,0.13,0.50,1), new vec4(1,1,1,1)],           // 10 Brazil
    [new vec4(0,0.40,0,1),       new vec4(1,0,0,1),          new vec4(1,0.80,0,1),       new vec4(1,0,0,1)],           // 11 Portugal
    [new vec4(0,0.14,0.58,1),    new vec4(1,0.80,0,1),       new vec4(1,1,1,1),          new vec4(0,0.14,0.58,1)],      // 12 Bosnia and Herzegovina
    [new vec4(0,0.38,0.20,1),    new vec4(1,1,1,1),          new vec4(0.82,0.06,0.20,1), new vec4(0,0.38,0.20,1)],      // 13 Algeria
    [new vec4(0,0.20,0.53,1),    new vec4(1,1,1,1),          new vec4(0.81,0.07,0.15,1), new vec4(0.95,0.77,0.06,1)],  // 14 Cape Verde
    [new vec4(0,0.52,0.25,1),    new vec4(0.99,0.94,0.26,1), new vec4(0.89,0.11,0.14,1), new vec4(0,0.52,0.25,1)],      // 15 Senegal
    [new vec4(0,0.42,0.65,1),    new vec4(1,0.80,0,1),       new vec4(0,0.42,0.65,1),    new vec4(1,0.80,0,1)],         // 16 Sweden
    [new vec4(0.81,0.07,0.15,1), new vec4(1,1,1,1),          new vec4(0,0,0,1),          new vec4(0,0.46,0.24,1)],      // 17 Iraq
    [new vec4(0.76,0.15,0.18,1), new vec4(0,0.38,0.20,1),    new vec4(0.76,0.15,0.18,1), new vec4(0,0.38,0.20,1)],      // 18 Morocco
    [new vec4(0,0.41,0.28,1),    new vec4(1,1,1,1),          new vec4(0.81,0.07,0.15,1), new vec4(0,0.41,0.28,1)],      // 19 Mexico
    [new vec4(0,0.42,0.21,1),    new vec4(1,1,1,1),          new vec4(0,0.42,0.21,1),    new vec4(1,1,1,1)],           // 20 Saudi Arabia
    [new vec4(0.73,0.05,0.18,1), new vec4(1,1,1,1),          new vec4(0,0.13,0.36,1),    new vec4(0.73,0.05,0.18,1)],  // 21 Norway
    [new vec4(0.93,0.16,0.22,1), new vec4(1,1,1,1),          new vec4(0.93,0.16,0.22,1), new vec4(1,1,1,1)],           // 22 Austria
    [new vec4(0.70,0.13,0.20,1), new vec4(1,1,1,1),          new vec4(0.24,0.23,0.43,1), new vec4(0.70,0.13,0.20,1)],  // 23 USA
    [new vec4(1,1,1,1),          new vec4(0.74,0,0.18,1),    new vec4(1,1,1,1),          new vec4(0.74,0,0.18,1)],      // 24 Japan
    [new vec4(0.84,0.17,0.12,1), new vec4(1,1,1,1),          new vec4(0,0.22,0.66,1),    new vec4(0.84,0.17,0.12,1)],  // 25 Paraguay
    [new vec4(0,0,0,1),          new vec4(0.98,0.88,0.26,1), new vec4(0.93,0.16,0.22,1), new vec4(0,0,0,1)],           // 26 Belgium
    [new vec4(1,1,1,1),          new vec4(0.85,0.07,0.10,1), new vec4(0.03,0.14,0.34,1), new vec4(1,1,1,1)],           // 27 Panama
    [new vec4(0.89,0.04,0.09,1), new vec4(1,1,1,1),          new vec4(0.89,0.04,0.09,1), new vec4(1,1,1,1)],           // 28 Turkey
    [new vec4(1,1,1,1),          new vec4(0.84,0.08,0.10,1), new vec4(0.07,0.27,0.49,1), new vec4(0.84,0.08,0.10,1)],  // 29 Czechia
    [new vec4(0.91,0,0.07,1),    new vec4(1,1,1,1),          new vec4(0.91,0,0.07,1),    new vec4(1,1,1,1)],           // 30 Tunisia
    [new vec4(0,0.50,1,1),       new vec4(0.97,0.84,0.09,1), new vec4(0.81,0.06,0.13,1), new vec4(0,0.50,1,1)],        // 31 DR Congo
    [new vec4(0,0.47,0.34,1),    new vec4(0.87,0.10,0.20,1), new vec4(0,0.13,0.40,1),    new vec4(1,0.70,0,1)],        // 32 South Africa
    [new vec4(0.97,0.50,0,1),    new vec4(1,1,1,1),          new vec4(0,0.62,0.38,1),    new vec4(0.97,0.50,0,1)],     // 33 Ivory Coast
    [new vec4(0.85,0.16,0.11,1), new vec4(1,1,1,1),          new vec4(0.85,0.16,0.11,1), new vec4(1,1,1,1)],           // 34 Switzerland
    [new vec4(0.81,0.07,0.15,1), new vec4(0.99,0.82,0.09,1), new vec4(0,0.40,0.20,1),    new vec4(0,0,0,1)],          // 35 Ghana
    [new vec4(0,0.33,0.64,1),    new vec4(1,1,1,1),          new vec4(0.94,0.25,0.21,1), new vec4(0,0.33,0.64,1)],      // 36 France
    [new vec4(0.54,0.08,0.22,1), new vec4(1,1,1,1),          new vec4(0.54,0.08,0.22,1), new vec4(1,1,1,1)],           // 37 Qatar
    [new vec4(0.83,0.10,0.13,1), new vec4(1,1,1,1),          new vec4(0.06,0.06,0.55,1), new vec4(0.83,0.10,0.13,1)],  // 38 Croatia
    [new vec4(0.85,0.02,0.13,1), new vec4(1,1,1,1),          new vec4(0.85,0.02,0.13,1), new vec4(1,1,1,1)],           // 39 Canada
    [new vec4(0,0.17,0.50,1),    new vec4(0.98,0.91,0.08,1), new vec4(1,1,1,1),          new vec4(0,0.17,0.50,1)],     // 40 Curacao
    [new vec4(1,1,1,1),          new vec4(0.80,0.13,0.20,1), new vec4(0,0.20,0.49,1),    new vec4(0,0,0,1)],          // 41 South Korea
    [new vec4(0.99,0.82,0.09,1), new vec4(0,0.22,0.58,1),    new vec4(0.81,0.07,0.15,1), new vec4(0.99,0.82,0.09,1)],  // 42 Colombia
    [new vec4(0.81,0.07,0.15,1), new vec4(1,1,1,1),          new vec4(0,0,0,1),          new vec4(0.75,0.58,0,1)],      // 43 Egypt
    [new vec4(0,0.14,0.49,1),    new vec4(0.80,0.08,0.17,1), new vec4(1,1,1,1),          new vec4(0,0.14,0.49,1)],      // 44 New Zealand
    [new vec4(0,0.13,0.62,1),    new vec4(0.82,0.06,0.20,1), new vec4(0,0.13,0.62,1),    new vec4(0.82,0.06,0.20,1)],  // 45 Haiti
    [new vec4(0.68,0.11,0.16,1), new vec4(1,1,1,1),          new vec4(0.13,0.27,0.55,1), new vec4(0.68,0.11,0.16,1)],  // 46 Netherlands
    [new vec4(0,0.37,0.72,1),    new vec4(1,1,1,1),          new vec4(0,0.37,0.72,1),    new vec4(1,1,1,1)]            // 47 Scotland
];

// The four parallel arrays you asked for. colorN[i] is country i's N-th color.
var color1 = COUNTRY_COLORS.map(function (r) { return r[0]; });
var color2 = COUNTRY_COLORS.map(function (r) { return r[1]; });
var color3 = COUNTRY_COLORS.map(function (r) { return r[2]; });
var color4 = COUNTRY_COLORS.map(function (r) { return r[3]; });

// Tween the 4 color materials from their CURRENT colors to the selected
// country's 4 colors.
function applyFlagColors(index) {
    if (index < 0 || index >= COUNTRY_COLORS.length) {
        print("WARNING: GridTextureSelector - no flag colors at index " + index + ".");
        return;
    }
    var row = COUNTRY_COLORS[index];

    // One tween drives all 4 materials so they stay in sync. Stop any in-flight
    // tween first so two don't fight over the same colors.
    if (colorTween) {
        colorTween.stop();
        colorTween = null;
    }

    var mats = [script.colorMaterial1, script.colorMaterial2, script.colorMaterial3, script.colorMaterial4];
    var starts = [];
    for (var i = 0; i < mats.length; i++) {
        var sc = getColor(mats[i]);
        starts.push(sc || row[i]);   // no current color -> start at target (no visible tween)
    }

    colorTween = new global.CustomTween({
        name: "GridFlagColors",
        duration: script.colorDuration,
        easing: global.Easings.QuadraticInOut,
        onUpdate: function (p) {
            for (var j = 0; j < mats.length; j++) {
                var s = starts[j];
                var t = row[j];
                setColor(mats[j], new vec4(lerp(s.x, t.x, p), lerp(s.y, t.y, p), lerp(s.z, t.z, p), 1));
            }
        },
        onComplete: function () {
            colorTween = null;
        }
    });
    colorTween.start();
}

// Set a material's RGB (baseColor + baseColorFactor), preserving its alpha.
function setColor(mat, c) {
    if (!mat || !mat.mainPass) return;
    var bc = mat.mainPass.baseColor;
    var a = (bc && typeof bc.w !== "undefined") ? bc.w : 1;
    mat.mainPass.baseColor = new vec4(c.x, c.y, c.z, a);
    var bcf = mat.mainPass.baseColorFactor;
    if (bcf) {
        var af = (typeof bcf.w !== "undefined") ? bcf.w : a;
        mat.mainPass.baseColorFactor = new vec4(c.x, c.y, c.z, af);
    }
}

// Read a material's current RGB as a vec4 (alpha ignored), or null.
function getColor(mat) {
    if (!mat || !mat.mainPass) return null;
    var bc = mat.mainPass.baseColor;
    if (bc) return new vec4(bc.x, bc.y, bc.z, 1);
    var bcf = mat.mainPass.baseColorFactor;
    if (bcf) return new vec4(bcf.x, bcf.y, bcf.z, 1);
    return null;
}

// ============================================
// PUBLIC API
// ============================================
script.api.select = select;   // set selection from another script

script.createEvent("OnDestroyEvent").bind(function () {
    if (fadeTween) fadeTween.stop();
    if (colorTween) colorTween.stop();
});
