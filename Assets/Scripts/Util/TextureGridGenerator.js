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
//@input float padding = 0.1 {"hint":"Gap between cells, as a fraction of cell size (0 = no gap)."}

//@ui {"widget":"separator"}
//@input bool generateOnStart = true
//@input bool addInteraction = true {"hint":"Give each cell an InteractionComponent + tap callback. Turn off for display-only grids."}
//@input bool blockTouches = false {"hint":"Stop touches on the grid from passing through to the camera. LEAVE OFF when using a UI ScrollView - it swallows the swipe."}

// ============================================
// STATE
// ============================================
var cells = [];   // { object, image, material, interaction, index }

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

    var cellW = 2 / cols;            // anchor space is -1..1
    var cellH = 2 / rows;
    var padX = cellW * script.padding * 0.5;
    var padY = cellH * script.padding * 0.5;

    for (var index = 0; index < total; index++) {
        var col = index % cols;
        var row = Math.floor(index / cols);

        // Row 0 sits at the top of the container.
        var left = -1 + col * cellW;
        var right = left + cellW;
        var top = 1 - row * cellH;
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
        st.anchors.top = top - padY;
        st.anchors.bottom = bottom + padY;
        st.offsets.left = 0;
        st.offsets.right = 0;
        st.offsets.top = 0;
        st.offsets.bottom = 0;

        var image = obj.createComponent("Component.Image");
        // Default is Stretch (distorts non-square flags); Fit keeps aspect ratio.
        image.stretchMode = StretchMode.Stretch;
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
            index: index
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
// CLEANUP / RESET
// ============================================
function clear() {
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
script.api.getCell = function (i) { return cells[i]; };
script.api.getCells = function () { return cells; };
script.api.onCellTapped = null;   // assign a handler(index, cell) externally
script.reset = reset;             // RestartButton-compatible

script.createEvent("OnDestroyEvent").bind(clear);
