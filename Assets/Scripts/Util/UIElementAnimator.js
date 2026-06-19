// UIElementAnimator.js
///////////////
// Version: 3.0
///////////////
// Description: Handles individual UI element animations including
// spawn-in animations and active loop animations.
// despawn animations (mirrored from spawn-in animation)
// Supports combining multiple animation types together.
///////////////
// by THEARLAB
///////////////

// ============================================
// SPAWN-IN ANIMATION
// ============================================
// @ui {"widget":"group_start", "label":"🚀 Spawn-In Animation"}
// @input bool enableSpawnAnimation {"label": "Enable Spawn Animation"}
// @input bool autoSpawnOnStart {"label": "Auto Spawn On Start", "showIf": "enableSpawnAnimation"}
// @input float spawnDuration = 0.5 {"label": "Duration (seconds)", "showIf": "enableSpawnAnimation"}
// @input float spawnDelay = 0 {"label": "Start Delay (seconds)", "showIf": "enableSpawnAnimation"}
// @input string spawnEasing {"widget": "combobox", "values": [{"label": "Linear", "value": "Linear"}, {"label": "Quadratic In", "value": "QuadraticIn"}, {"label": "Quadratic Out", "value": "QuadraticOut"}, {"label": "Quadratic InOut", "value": "QuadraticInOut"}, {"label": "Cubic In", "value": "CubicIn"}, {"label": "Cubic Out", "value": "CubicOut"}, {"label": "Cubic InOut", "value": "CubicInOut"}, {"label": "Elastic Out", "value": "ElasticOut"}, {"label": "Back Out", "value": "BackOut"}, {"label": "Bounce Out", "value": "BounceOut"}, {"label": "Sinusoidal InOut", "value": "SinusoidalInOut"}, {"label": "Exponential Out", "value": "ExponentialOut"}], "showIf": "enableSpawnAnimation", "label": "Easing"}

// Spawn - Fade
// @ui {"widget":"separator", "showIf": "enableSpawnAnimation"}
// @input bool spawnFade {"label": "Fade", "showIf": "enableSpawnAnimation"}
// @input float spawnFadeStart = 0 {"label": "Fade Start", "showIf": "spawnFade"}
// @input float spawnFadeEnd = 1 {"label": "Fade End", "showIf": "spawnFade"}

// Spawn - Scale
// @ui {"widget":"separator", "showIf": "enableSpawnAnimation"}
// @input bool spawnScale {"label": "Scale", "showIf": "enableSpawnAnimation"}
// @input float spawnScaleStart = 0 {"label": "Scale Start", "showIf": "spawnScale"}
// @input float spawnScaleEnd = 1 {"label": "Scale End", "showIf": "spawnScale"}

// Spawn - Rotate
// @ui {"widget":"separator", "showIf": "enableSpawnAnimation"}
// @input bool spawnRotate {"label": "Rotate", "showIf": "enableSpawnAnimation"}
// @input float spawnRotateStart = -180 {"label": "Rotate Start (degrees)", "showIf": "spawnRotate"}
// @input float spawnRotateEnd = 0 {"label": "Rotate End (degrees)", "showIf": "spawnRotate"}

// Spawn - Slide
// @ui {"widget":"separator", "showIf": "enableSpawnAnimation"}
// @input bool spawnSlide {"label": "Slide", "showIf": "enableSpawnAnimation"}
// @input float spawnSlideStart = 1 {"label": "Slide Start (offset)", "showIf": "spawnSlide"}
// @input float spawnSlideEnd = 0 {"label": "Slide End (offset)", "showIf": "spawnSlide"}
// @input vec2 spawnSlideDirection = {0, 1} {"label": "Slide Direction", "showIf": "spawnSlide", "hint": "Normalized direction vector"}

// Spawn - Reveal
// @ui {"widget":"separator", "showIf": "enableSpawnAnimation"}
// @input bool spawnReveal {"label": "Reveal (shader)", "showIf": "enableSpawnAnimation"}
// @input float spawnRevealStart = 0 {"label": "Reveal Start", "showIf": "spawnReveal"}
// @input float spawnRevealEnd = 1 {"label": "Reveal End", "showIf": "spawnReveal"}
// @ui {"widget":"group_end"}

// ============================================
// ACTIVE ANIMATION (LOOP)
// ============================================
// @ui {"widget":"group_start", "label":"🔄 Active Animation (Loop)"}
// @input bool enableActiveAnimation {"label": "Enable Active Animation"}
// @input bool pingPong {"label": "Ping Pong Animation", "showIf": "enableActiveAnimation"}
// @input bool startActiveAfterSpawn {"label": "Start After Spawn Complete", "showIf": "enableActiveAnimation"}
// @input float activeDuration = 1 {"label": "Duration (seconds)", "showIf": "enableActiveAnimation"}
// @input float activeRepeatDelay = 0 {"label": "Repeat Delay (seconds)", "showIf": "enableActiveAnimation"}
// @input string activeEasing {"widget": "combobox", "values": [{"label": "Linear", "value": "Linear"}, {"label": "Quadratic In", "value": "QuadraticIn"}, {"label": "Quadratic Out", "value": "QuadraticOut"}, {"label": "Quadratic InOut", "value": "QuadraticInOut"}, {"label": "Cubic In", "value": "CubicIn"}, {"label": "Cubic Out", "value": "CubicOut"}, {"label": "Cubic InOut", "value": "CubicInOut"}, {"label": "Elastic Out", "value": "ElasticOut"}, {"label": "Back Out", "value": "BackOut"}, {"label": "Bounce Out", "value": "BounceOut"}, {"label": "Sinusoidal InOut", "value": "SinusoidalInOut"}], "showIf": "enableActiveAnimation", "label": "Easing"}

// Active - Fade
// @ui {"widget":"separator", "showIf": "enableActiveAnimation"}
// @input bool activeFade {"label": "Fade", "showIf": "enableActiveAnimation"}
// @input float activeFadeStart = 1 {"label": "Fade Start", "showIf": "activeFade"}
// @input float activeFadeEnd = 0.5 {"label": "Fade End", "showIf": "activeFade"}

// Active - Scale
// @ui {"widget":"separator", "showIf": "enableActiveAnimation"}
// @input bool activeScale {"label": "Scale", "showIf": "enableActiveAnimation"}
// @input float activeScaleStart = 1 {"label": "Scale Start", "showIf": "activeScale"}
// @input float activeScaleEnd = 1.2 {"label": "Scale End", "showIf": "activeScale"}

// Active - Rotate
// @ui {"widget":"separator", "showIf": "enableActiveAnimation"}
// @input bool activeRotate {"label": "Rotate", "showIf": "enableActiveAnimation"}
// @input float activeRotateStart = -5 {"label": "Rotate Start (degrees)", "showIf": "activeRotate"}
// @input float activeRotateEnd = 5 {"label": "Rotate End (degrees)", "showIf": "activeRotate"}

// Active - Slide
// @ui {"widget":"separator", "showIf": "enableActiveAnimation"}
// @input bool activeSlide {"label": "Slide", "showIf": "enableActiveAnimation"}
// @input float activeSlideStart = 0 {"label": "Slide Start (offset)", "showIf": "activeSlide"}
// @input float activeSlideEnd = 0.1 {"label": "Slide End (offset)", "showIf": "activeSlide"}
// @input vec2 activeSlideDirection = {0, 1} {"label": "Slide Direction", "showIf": "activeSlide", "hint": "Normalized direction vector"}

// Active - Reveal
// @ui {"widget":"separator", "showIf": "enableActiveAnimation"}
// @input bool activeReveal {"label": "Reveal (shader)", "showIf": "enableActiveAnimation"}
// @input float activeRevealStart = 1 {"label": "Reveal Start", "showIf": "activeReveal"}
// @input float activeRevealEnd = 0.5 {"label": "Reveal End", "showIf": "activeReveal"}
// @ui {"widget":"group_end"}


const targetImage = script.sceneObject.getComponent("Component.Image")
const screenTransform = script.sceneObject.getComponent("Component.ScreenTransform");

// ============================================
// INTERNAL STATE
// ============================================
var spawnTween = null;
var activeTween = null;
var isSpawned = false;
var originalAlpha = 1;
var originalScale = null;
var originalPosition = null;
var originalRotation = 0;
var originalRevealRatio = 1;

// ============================================
// LIFECYCLE
// ============================================
script.createEvent("OnStartEvent").bind(onStart);

function onStart() {
    if (!targetImage && !screenTransform) {
        print("WARNING: UIElementAnimator - No target image assigned!");
        return;
    }
    
    // Cache original values
    cacheOriginalValues();
    
    // Set initial state if spawn animation is enabled
    if (script.enableSpawnAnimation) {
        setInitialSpawnState();
    }
    
    // Auto spawn if enabled
    if (script.enableSpawnAnimation && script.autoSpawnOnStart) {
        spawnIn();
    } else if (script.enableActiveAnimation && !script.startActiveAfterSpawn) {
        // Start active animation immediately if not waiting for spawn
        startActiveAnimation();
    }
}

function cacheOriginalValues() {
    if (targetImage && targetImage.mainPass.baseColor) {
        originalAlpha = targetImage.mainPass.baseColor.a;
    }
    
    if (screenTransform) {
        originalScale = screenTransform.scale;
        originalPosition = screenTransform.anchors.getCenter();
        originalRotation = 0; // Assuming starting rotation is 0
    }
    
    // Cache reveal ratio if it exists
    if (targetImage && targetImage.mainPass.revealRatio !== undefined) {
        originalRevealRatio = targetImage.mainPass.revealRatio;
    }
}

function setInitialSpawnState() {
    // Apply all enabled spawn animation start values
    if (script.spawnFade) {
        setAlpha(script.spawnFadeStart);
    }
    
    if (script.spawnScale) {
        setScale(script.spawnScaleStart);
    }
    
    if (script.spawnRotate) {
        setRotation(script.spawnRotateStart);
    }
    
    if (script.spawnSlide) {
        setSlideOffset(script.spawnSlideStart, script.spawnSlideDirection);
    }
    
    if (script.spawnReveal) {
        setRevealRatio(script.spawnRevealStart);
    }
}

// ============================================
// SPAWN-IN ANIMATION
// ============================================
function spawnIn() {
    if (!script.enableSpawnAnimation || isSpawned) {
        return;
    }
    
    var hasAnyAnimation = script.spawnFade || script.spawnScale || script.spawnRotate || script.spawnSlide || script.spawnReveal;
    if (!hasAnyAnimation) {
        isSpawned = true;
        onSpawnComplete();
        return;
    }
    
    var easingFunc = global.Easings[script.spawnEasing] || global.Easings.Linear;
    
    if (spawnTween) {
        spawnTween.stop();
    }
    
    spawnTween = new global.CustomTween({
        duration: script.spawnDuration || 0.5,
        delay: script.spawnDelay || 0,
        easing: easingFunc,
        onUpdate: function(t) {
            // Apply all enabled animations
            if (script.spawnFade) {
                var alpha = lerp(script.spawnFadeStart, script.spawnFadeEnd, t);
                setAlpha(alpha);
            }
            
            if (script.spawnScale) {
                var scale = lerp(script.spawnScaleStart, script.spawnScaleEnd, t);
                setScale(scale);
            }
            
            if (script.spawnRotate) {
                var rotation = lerp(script.spawnRotateStart, script.spawnRotateEnd, t);
                setRotation(rotation);
            }
            
            if (script.spawnSlide) {
                var slideOffset = lerp(script.spawnSlideStart, script.spawnSlideEnd, t);
                setSlideOffset(slideOffset, script.spawnSlideDirection);
            }
            
            if (script.spawnReveal) {
                var reveal = lerp(script.spawnRevealStart, script.spawnRevealEnd, t);
                setRevealRatio(reveal);
            }
        },
        onComplete: function() {
            isSpawned = true;
            onSpawnComplete();
        }
    });
    
    spawnTween.start();
}

function onSpawnComplete() {
    print("Spawn animation complete for: " + script.getSceneObject().name);
    
    // Start active animation if configured to start after spawn
    if (script.enableActiveAnimation && script.startActiveAfterSpawn) {
        startActiveAnimation();
    }
}

// Public method to trigger spawn
script.spawnIn = spawnIn;

// ============================================
// DESPAWN ANIMATION
// ============================================
function despawn() {
    if (!script.enableSpawnAnimation || !isSpawned) {
        return;
    }
    
    var hasAnyAnimation = script.spawnFade || script.spawnScale || script.spawnRotate || script.spawnSlide || script.spawnReveal;
    if (!hasAnyAnimation) {
        isSpawned = false;
        return;
    }
    
    var easingFunc = global.Easings[script.spawnEasing] || global.Easings.Linear;
    
    if (spawnTween) {
        spawnTween.stop();
    }

    if(activeTween) {
        activeTween.stop();
    }
    
    spawnTween = new global.CustomTween({
        duration: script.spawnDuration || 0.5,
        delay: 0,
        easing: easingFunc,
        onUpdate: function(t) {
            // Apply all enabled animations
            if (script.spawnFade) {
                var alpha = lerp(script.spawnFadeStart, script.spawnFadeEnd, 1 - t);
                setAlpha(alpha);
            }
            
            if (script.spawnScale) {
                var scale = lerp(script.spawnScaleStart, script.spawnScaleEnd, 1 - t);
                setScale(scale);
            }
            
            if (script.spawnRotate) {
                var rotation = lerp(script.spawnRotateStart, script.spawnRotateEnd, 1 - t);
                setRotation(rotation);
            }
            
            if (script.spawnSlide) {
                var slideOffset = lerp(script.spawnSlideStart, script.spawnSlideEnd, 1 - t);
                setSlideOffset(slideOffset, script.spawnSlideDirection);
            }
            
            if (script.spawnReveal) {
                var reveal = lerp(script.spawnRevealStart, script.spawnRevealEnd, 1 - t);
                setRevealRatio(reveal);
            }
        },
        onComplete: function() {
            isSpawned = false;
            setInitialSpawnState();
        }
    });
    
    spawnTween.start();
}

// Public method to trigger spawn
script.despawn = despawn;

// ============================================
// ACTIVE ANIMATION (PING-PONG LOOP)
// ============================================
function startActiveAnimation() {
    if (!script.enableActiveAnimation) {
        return;
    }
    
    var hasAnyAnimation = script.activeFade || script.activeScale || script.activeRotate || script.activeSlide || script.activeReveal;
    if (!hasAnyAnimation) {
        return;
    }
    
    var easingFunc = global.Easings[script.activeEasing] || global.Easings.SinusoidalInOut;
    
    if (activeTween) {
        activeTween.stop();
    }
    
    activeTween = new global.CustomTween({
        duration: script.activeDuration || 1,
        repeatMode: script.pingPong ? global.LoopType.PingPong : global.LoopType.Loop,
        repeatNumber: -1,
        repeatDelay: script.activeRepeatDelay || 0,
        easing: easingFunc,
        onUpdate: function(t) {
            // Apply all enabled animations
            if (script.activeFade) {
                var alpha = lerp(script.activeFadeStart, script.activeFadeEnd, t);
                setAlpha(alpha);
            }
            
            if (script.activeScale) {
                var scale = lerp(script.activeScaleStart, script.activeScaleEnd, t);
                setScale(scale);
            }
            
            if (script.activeRotate) {
                var rotation = lerp(script.activeRotateStart, script.activeRotateEnd, t);
                setRotation(rotation);
            }
            
            if (script.activeSlide) {
                var slideOffset = lerp(script.activeSlideStart, script.activeSlideEnd, t);
                setSlideOffset(slideOffset, script.activeSlideDirection);
            }
            
            if (script.activeReveal) {
                var reveal = lerp(script.activeRevealStart, script.activeRevealEnd, t);
                setRevealRatio(reveal);
            }
        }
    });
    
    activeTween.start();
}

function stopActiveAnimation() {
    if (activeTween) {
        activeTween.stop();
        activeTween = null;
    }
}

// Public methods
script.startActiveAnimation = startActiveAnimation;
script.stopActiveAnimation = stopActiveAnimation;

// ============================================
// ANIMATION VALUE APPLICATION
// ============================================
function setAlpha(alpha) {
    if (!targetImage) return;
    
    var color = targetImage.mainPass.baseColor;
    targetImage.mainPass.baseColor = new vec4(color.r, color.g, color.b, alpha);
}

function setRotation(degrees) {
    if (!screenTransform) return;
    
    var radians = degrees * (Math.PI / 180);
    screenTransform.rotation = quat.angleAxis(radians, vec3.forward());
}

function setScale(scaleFactor) {
    if (!screenTransform || !originalScale) return;
    
    screenTransform.scale = new vec3(
        originalScale.x * scaleFactor,
        originalScale.y * scaleFactor,
        originalScale.z
    );
}

function setSlideOffset(offset, direction) {
    if (!screenTransform || !originalPosition) return;
    
    var slideDir = direction || new vec2(1, 0);
    var offsetVec = slideDir.uniformScale(offset);
    var newPos = originalPosition.add(offsetVec);
    screenTransform.anchors.setCenter(newPos);
}

function setRevealRatio(ratio) {
    if (!targetImage) return;
    
    // Access the revealRatio shader parameter
    if (targetImage.mainPass.revealRatio !== undefined) {
        targetImage.mainPass.revealRatio = ratio;
    }
}

// ============================================
// RESET
// ============================================
function reset() {
    // Stop all tweens
    if (spawnTween) {
        spawnTween.stop();
        spawnTween = null;
    }
    
    if (activeTween) {
        activeTween.stop();
        activeTween = null;
    }
    
    isSpawned = false;
    
    // Reset to original values
    if (targetImage) {
        var color = targetImage.mainPass.baseColor;
        targetImage.mainPass.baseColor = new vec4(color.r, color.g, color.b, originalAlpha);
        
        if (targetImage.mainPass.revealRatio !== undefined) {
            targetImage.mainPass.revealRatio = originalRevealRatio;
        }
    }
    
    if (screenTransform) {
        if (originalScale) {
            screenTransform.scale = originalScale;
        }
        if (originalPosition) {
            screenTransform.anchors.setCenter(originalPosition);
        }
        screenTransform.rotation = quat.angleAxis(0, vec3.forward());
    }
    
    // Set initial spawn state again if enabled
    if (script.enableSpawnAnimation) {
        setInitialSpawnState();
    }
}

script.reset = reset;

// ============================================
// UTILITY
// ============================================
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// ============================================
// CLEANUP
// ============================================
script.createEvent("OnDestroyEvent").bind(function() {
    if (spawnTween) spawnTween.stop();
    if (activeTween) activeTween.stop();
});
