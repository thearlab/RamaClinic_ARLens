//@input int hintId
//@input float appearDelay
//@input SceneObject restartBtn
//@input Component.ScriptComponent[] sceneCtrls

let restartTapped = true 
let rotationTween

const Restart = () => {
    script.sceneCtrls.forEach((ctrl) => ctrl.reset())
    //ADD A script.reset FUNCTION IN EVERY SCENE CONTROLLERS
}

const CreateRotationTween = () => {
    let tween = new global.CustomTween({
        duration: 3, repeatMode: global.LoopType.Loop, repeatNumber: -1, 
        onUpdate: (progress) => tr.rotation = quat.angleAxis(-Math.PI * progress * 2, new vec3(0, 0, 1))
    })
    return tween
}

const SetRestartInteraction = () => {
    restartTapped = false 
    intr.onTap.add(() => {
        if (restartTapped) return
        restartTapped = true 
        global.HideHint(script.hintId, 0, () => { 
            rotationTween.stop() 
            Restart()
        })
    })
}

const EnableRestart = () => {
    rotationTween.start()
    global.ShowHint(script.hintId, script.appearDelay, () => {
        SetRestartInteraction()
    })
}

global.EnableRestart = EnableRestart 
script.EnableRestart = EnableRestart

let tr, intr
script.createEvent("OnStartEvent").bind(() => {
    tr = script.restartBtn.getComponent("Component.ScreenTransform")
    intr = script.restartBtn.getComponent("Component.InteractionComponent")
    rotationTween = CreateRotationTween()
})