//@ui {"widget":"label"}
//@ui {"widget":"separator"}
//@ui {"widget":"label", "label":"SELFIE LENS SETTINGS"}
//@ui {"widget":"separator"}
//@ui {"widget":"label"}
//@input bool selfieLensOnly
//@input SceneObject swapCameraHint {"showIf": "selfieLensOnly"}
//@ui {"widget":"label"}
//@input SceneObject[] selfieLensObjects

//@ui {"widget":"label", "showIf": "selfieLensOnly", "showIfValue":"false"} 
//@ui {"widget":"separator", "showIf": "selfieLensOnly", "showIfValue":"false"}
//@ui {"widget":"label", "label":"WORLD LENS SETTINGS", "showIf": "selfieLensOnly", "showIfValue":"false"}
//@ui {"widget":"separator", "showIf": "selfieLensOnly", "showIfValue":"false"}
//@ui {"widget":"label", "showIf": "selfieLensOnly", "showIfValue":"false"}
//@input SceneObject[] worldLensObjects {"showIf": "selfieLensOnly", "showIfValue":"false"}

const SetSwapCameraHint = (enable) => {
    script.swapCameraHint.enabled = enable
}


const ResetSelfieLens = () => {
    script.selfieLensObjects.forEach((obj) => obj.enabled = false)
}


const ResetWorldLens = () => {
    script.worldLensObjects.forEach((obj) => obj.enabled = false)   
}


const SetSelfieLens = () => {
    if (script.selfieLensOnly) SetSwapCameraHint(false)
    ResetWorldLens()
    ResetSelfieLens()
    script.selfieLensObjects.forEach((obj) => obj.enabled = true)
}


const SetWorldLens = () => {
    if (script.selfieLensOnly) SetSwapCameraHint(true)
    ResetWorldLens()
    ResetSelfieLens()
    script.worldLensObjects.forEach((obj) => obj.enabled = true)
    
}


const cameraBackEvent = script.createEvent("CameraBackEvent") 
cameraBackEvent.bind(SetWorldLens)


const cameraFrontEvent = script.createEvent("CameraFrontEvent") 
cameraFrontEvent.bind(SetSelfieLens)
