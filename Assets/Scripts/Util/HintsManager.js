//@input Component.Image[] hints

global.ShowHint = (id, delay, callback) => {
    if (id < 0 || id > script.hints.length - 1) {
        print("WARNING: Hint with id " + id + " does not exist.")
        return
    }
    let fadeInHint = new CustomTween({
        delay: delay,
        onUpdate: (progress) => { script.hints[id].mainPass.baseColor = new vec4(1, 1, 1, progress) },
        onComplete: callback
    })
    fadeInHint.start()
}

global.HideHint = (id, delay, callback) => {
    if (id < 0 || id > script.hints.length - 1) {
        print("WARNING: Hint with id " + id + " does not exist.")
        return
    }

    var startAlpha;

    let fadeOutHint = new CustomTween({
        delay: delay,
        onStart: () => {startAlpha = script.hints[id].mainPass.baseColor.a},
        onUpdate: (progress) => { script.hints[id].mainPass.baseColor = new vec4(1, 1, 1, startAlpha * (1 - progress)) },
        onComplete: callback
    })
    fadeOutHint.start()
}