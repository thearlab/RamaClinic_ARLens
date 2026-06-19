//@ui {"widget":"separator"}
//@ui {"widget":"label"}
//@ui {"widget":"label", "label":"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"}
//@ui {"widget":"label", "label":"DISABLE BEFORE PUBLISH!!!"}
//@ui {"widget":"label", "label":"!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"}
//@ui {"widget":"label"}
//@ui {"widget":"separator"}
//@input bool testMode
//@input string version = 1
//@input Component.Text versionText


script.createEvent("OnStartEvent").bind(() => {
    if (script.testMode) {
        script.versionText.text = "V. " + script.version
        script.versionText.getSceneObject().enabled = true
    }
    else {
        script.versionText.getSceneObject().enabled = false
    }
})