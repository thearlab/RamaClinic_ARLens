// TextureGridGenerator.js
///////////////
// Version: 1.0
///////////////
// Description: Spawns a grid of Image cells (default 5 cols x 10 rows = 50)
// under a container ScreenTransform. Each cell gets:
//   - its own ScreenTransform (laid out into the grid rect)
//   - its own cloned Material so it can show a different texture
//   - its own InteractionComponent (tap callback with the cell index)
//
// Wire the 50 textures into "textures" and assign a base Material to clone.
///////////////
// by THEARLAB
///////////////

//@input SceneObject gridContainer {"hint":"Parent for the grid. Must have a ScreenTransform. Defaults to this object."}
//@input Asset.Texture[] textures {"hint":"Texture per cell, in row-major order (left->right, top->bottom)."}
//@input Asset.Material baseMaterial {"hint":"Material cloned once per cell; its baseTex is overwritten with each texture."}

//@ui {"widget":"separator"}
//@input int columns = 5 {"hint":"Grid columns."}
//@input int rows = 10 {"hint":"Grid rows."}
//@input float padding = 0.1 {"hint":"Horizontal gap between columns, as a fraction of cell size (0 = no gap)."}
//@input float rowSpacing = 0 {"hint":"Extra gap between rows WITHOUT shrinking images. Fraction of cell height; grows the grid taller (scrolls). 0 = rows touch."}
//@input float topMargin = 0 {"hint":"Empty space before the first row. Fraction of cell height; grows the grid taller (scrolls)."}
//@input float bottomMargin = 0 {"hint":"Empty space after the last row. Fraction of cell height; grows the grid taller (scrolls)."}
//@input float cellWidthOffset = 0 {"hint":"Pixels to inset each cell's width PER SIDE. + = narrower, - = wider. Tune until circles are round."}
//@input float cellHeightOffset = 0 {"hint":"Pixels to inset each cell's height PER SIDE. + = shorter, - = taller. Tune until circles are round."}
//@input bool keepAspect = false {"hint":"Off (Stretch) fills the cell; On (Fit) preserves the texture's own aspect (letterboxed)."}

//@ui {"widget":"separator"}
//@input float popDuration = 0.25 {"hint":"Pop-in scale duration per cell (seconds)."}
//@input float popStagger = 0.03 {"hint":"Delay between each cell starting its pop-in (seconds)."}

//@ui {"widget":"separator"}
//@input bool generateOnStart = true
//@input bool addInteraction = true {"hint":"Give each cell an InteractionComponent + tap callback. Turn off for display-only grids."}
//@input bool blockTouches = false {"hint":"Stop touches on the grid from passing through to the camera. LEAVE OFF when using a UI ScrollView - it swallows the swipe."}

// ============================================
// STATE
// ============================================
var cells = [];   // { object, image, material, interaction, index, screenTransform }
var popTweens = [];   // in-flight pop-in scale tweens
var gridCols = 1;     // column count of the last generated grid (for pop ordering)
// Authored container anchor height, captured before any row-spacing growth so
// regenerating doesn't compound the grow factor.
var containerBaseTop = null;
var containerBaseBottom = null;

// ============================================
// LIFECYCLE
// ============================================
script.createEvent("OnStartEvent").bind(function () {
    if (script.generateOnStart) {
        generate();
    }
});

// ============================================
// GENERATION
// ============================================
function generate() {
    if (!script.baseMaterial) {
        print("ERROR: TextureGridGenerator - no baseMaterial assigned.");
        return;
    }

    var container = script.gridContainer || script.getSceneObject();
    if (!container.getComponent("Component.ScreenTransform")) {
        print("WARNING: TextureGridGenerator - container has no ScreenTransform; cell layout may be wrong.");
    }

    clear();

    // Block touches from falling through the grid to the camera / scene behind.
    if (script.blockTouches && global.touchSystem) {
        global.touchSystem.touchBlocking = true;
    }

    var cols = Math.max(1, script.columns);
    var rows = Math.max(1, script.rows);
    var total = cols * rows;
    gridCols = cols;   // remember for diagonal pop ordering

    // Row spacing (f), top margin (m) and bottom margin (mb) are fractions of
    // cell HEIGHT. The bottom margin is just extra span below the last row, so
    // it leaves empty space there.
    var f = Math.max(0, script.rowSpacing);
    var m = Math.max(0, script.topMargin);
    var mb = Math.max(0, script.bottomMargin);
    var span = m + rows + (rows - 1) * f + mb;   // total grid height in units of cell height

    var contentST = container.getComponent("Component.ScreenTransform");
    if (contentST) {
        if (containerBaseTop === null) {
            containerBaseTop = contentST.anchors.top;
            containerBaseBottom = contentST.anchors.bottom;
        }
        // Rows fill the authored height (plus spacing/margin); the container
        // grows by k so spacing/margins don't shrink the cells. Per-cell shape
        // is then tuned with cellWidthOffset / cellHeightOffset (pixels).
        var k = span / rows;
        if (k <= 0) k = 1;

        var baseH = containerBaseTop - containerBaseBottom;
        contentST.anchors.top = containerBaseTop;
        contentST.anchors.bottom = containerBaseTop - baseH * k;   // grow downward from authored top
    }

    var cellW = 2 / cols;            // anchor space is -1..1; fills the column
    // The grid fills the (grown) container, so in normalized space:
    // cellH * span = 2  ->  cellH = 2 / span.
    var cellH = 2 / span;
    var pitch = cellH * (1 + f);     // row-to-row step, including the gap
    var topMarginNorm = cellH * m;   // empty space before row 0
    var padX = cellW * script.padding * 0.5;

    for (var index = 0; index < total; index++) {
        var col = index % cols;
        var row = Math.floor(index / cols);

        // Row 0 sits just below the top margin.
        var left = -1 + col * cellW;
        var right = left + cellW;
        var top = 1 - topMarginNorm - row * pitch;
        var bottom = top - cellH;

        var obj = global.scene.createSceneObject("Cell_" + index);
        obj.setParent(container);   // LS: single argument only
        // Inherit the container's render layer so the same camera draws the
        // cells (otherwise new objects land on the default layer and get
        // picked up by the perspective camera instead of the screen camera).
        obj.layer = container.layer;

        var st = obj.createComponent("Component.ScreenTransform");
        st.anchors.left = left + padX;
        st.anchors.right = right - padX;
        st.anchors.top = top;          // full cell height (row gap comes from 'pitch', not shrinking)
        st.anchors.bottom = bottom;
        // Per-axis pixel tuning: inset each edge so you can shape the cell
        // (e.g. make a wide cell square). + values shrink, - values grow.
        st.offsets.left = script.cellWidthOffset;
        st.offsets.right = -script.cellWidthOffset;
        st.offsets.top = -script.cellHeightOffset;
        st.offsets.bottom = script.cellHeightOffset;
        // Start hidden (scale 0) so cells are invisible until the pop-in.
        st.scale = new vec3(0, 0, st.scale.z);

        var image = obj.createComponent("Component.Image");
        // Fit keeps the texture's aspect ratio (circles stay round even if the
        // cell isn't square); Stretch fills the cell and can distort into ovals.
        image.stretchMode = script.keepAspect ? StretchMode.Fit : StretchMode.Stretch;
        // Clone so each cell owns its material and can carry a unique texture.
        var material = script.baseMaterial.clone();
        var tex = script.textures ? script.textures[index] : null;
        if (tex) {
            material.mainPass.baseTex = tex;
        }
        image.clearMaterials();
        image.addMaterial(material);

        var interaction = null;
        if (script.addInteraction) {
            interaction = obj.createComponent("Component.InteractionComponent");
            // onTap fires on the FRONT-MOST component only and is gesture-filtered
            // (taps, not swipes), so it reports the correct cell's own index and
            // stays stable through scrolling. The ScrollView now reads global touch
            // events, so this onTap no longer blocks swiping.
            interaction.onTap.add(makeTapHandler(index));
        }

        cells.push({
            object: obj,
            image: image,
            material: material,
            interaction: interaction,   // null when addInteraction is off
            index: index,
            screenTransform: st
        });
    }

    print("TextureGridGenerator: generated " + cells.length + " cells (" + cols + "x" + rows + ").");
}

function makeTapHandler(index) {
    // Factory so each handler captures its own cell index (avoids the closure trap).
    return function () {
        onCellTapped(index);
    };
}

function onCellTapped(index) {
    print("cell " + index + " tapped");
    // Override from another script: script.api.onCellTapped = function(i){ ... }
    if (script.api.onCellTapped) {
        script.api.onCellTapped(index, cells[index]);
    }
}

// ============================================
// POP-IN
// ============================================
// Scale every cell up from 0 to full with a back-out (bounce) easing, one
// after the other. 'delay' (seconds) waits before the first cell pops.
function popIn(delay, stagger) {
    stopPops();
    var d = delay || 0;
    var dur = (script.popDuration > 0) ? script.popDuration : 0.25;
    // Caller may override the stagger; otherwise use the Inspector value.
    var stag = (typeof stagger === "number" && stagger >= 0) ? stagger
             : ((script.popStagger >= 0) ? script.popStagger : 0.03);

    for (var i = 0; i < cells.length; i++) {
        var st = cells[i].screenTransform;
        if (!st) continue;
        setScaleXY(st, 0);   // start hidden
        // Diagonal wavefront: cells on the same anti-diagonal (row + col) pop
        // together, sweeping out from the top-left corner.
        var col = i % gridCols;
        var row = Math.floor(i / gridCols);
        popOne(st, d + (row + col) * stag, dur);
    }
}

function popOne(st, startDelay, dur) {
    var tw = new global.CustomTween({
        name: "GridPopIn",
        duration: dur,
        delay: startDelay,
        easing: global.Easings.BackOut,   // overshoots past 1, then settles (bounce back)
        onUpdate: function (p) {
            setScaleXY(st, p);
        },
        onComplete: function () {
            setScaleXY(st, 1);   // snap to exact full scale
        }
    });
    popTweens.push(tw);
    tw.start();
}

// Scale every cell down to 0 over 'duration' seconds (e.g. while the panel
// slides away). Tweens from each cell's current scale.
function popOut(duration) {
    stopPops();
    var dur = (duration > 0) ? duration : 0.3;
    for (var i = 0; i < cells.length; i++) {
        var st = cells[i].screenTransform;
        if (!st) continue;
        popOneOut(st, dur, st.scale.x);
    }
}

function popOneOut(st, dur, startScale) {
    var tw = new global.CustomTween({
        name: "GridPopOut",
        duration: dur,
        easing: global.Easings.QuadraticIn,
        onUpdate: function (p) {
            setScaleXY(st, startScale * (1 - p));
        },
        onComplete: function () {
            setScaleXY(st, 0);
        }
    });
    popTweens.push(tw);
    tw.start();
}

// Show all cells immediately at full scale (no animation).
function showInstant() {
    stopPops();
    for (var i = 0; i < cells.length; i++) {
        if (cells[i].screenTransform) setScaleXY(cells[i].screenTransform, 1);
    }
}

// Hide all cells immediately (scale 0).
function hideCells() {
    stopPops();
    for (var i = 0; i < cells.length; i++) {
        if (cells[i].screenTransform) setScaleXY(cells[i].screenTransform, 0);
    }
}

function setScaleXY(st, s) {
    var sc = st.scale;
    st.scale = new vec3(s, s, sc.z);
}

function stopPops() {
    for (var i = 0; i < popTweens.length; i++) {
        if (popTweens[i]) popTweens[i].stop();
    }
    popTweens = [];
}

// ============================================
// CLEANUP / RESET
// ============================================
function clear() {
    stopPops();
    for (var i = 0; i < cells.length; i++) {
        if (cells[i].object) {
            cells[i].object.destroy();
        }
    }
    cells = [];
}

function reset() {
    clear();
    if (script.generateOnStart) {
        generate();
    }
}

// ============================================
// PUBLIC API
// ============================================
script.api.generate = generate;
script.api.clear = clear;
script.api.popIn = popIn;         // staggered scale-up; first open
script.api.popOut = popOut;              // tween all cells to 0 over a duration
script.api.showInstant = showInstant;   // later opens: show with no animation
script.api.hide = hideCells;             // scale all cells to 0 instantly
script.api.getCell = function (i) { return cells[i]; };
script.api.getCells = function () { return cells; };
script.api.onCellTapped = null;   // assign a handler(index, cell) externally
script.reset = reset;             // RestartButton-compatible

script.createEvent("OnDestroyEvent").bind(clear);
