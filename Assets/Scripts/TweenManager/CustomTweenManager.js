// CustomTweenManager.js
///////////////
// Version: 0.2
///////////////
// ---- EXTENSION TO LENS STUDIO TWEEN MANAGER -------
// Description:
/////////////// Creates Custom Tween with a static progress from 0 to 1
/////////////// controlled exclusively through script
// ----- DOCUMENTATION -----
// https://www.notion.so/thearlab/Custom-Tween-Documentation-1e787f7ddd2e8046a401f430ef97c8e0
/////////////////
// by THEARLAB
///////////////
///////////////

global.Easings = {
    Linear: global.TWEEN.Easing.Linear.None,
    QuadraticIn: global.TWEEN.Easing.Quadratic.In,
    QuadraticOut: global.TWEEN.Easing.Quadratic.Out,
    QuadraticInOut: global.TWEEN.Easing.Quadratic.InOut,
    QuadraticOutIn: global.TWEEN.Easing.Quadratic.OutIn,
    CubicIn: global.TWEEN.Easing.Cubic.In,
    CubicOut: global.TWEEN.Easing.Cubic.Out,
    CubicInOut: global.TWEEN.Easing.Cubic.InOut,
    CubicOutIn: global.TWEEN.Easing.Cubic.OutIn,
    QuarticIn: global.TWEEN.Easing.Quartic.In,
    QuarticOut: global.TWEEN.Easing.Quartic.Out,
    QuarticInOut: global.TWEEN.Easing.Quartic.InOut,
    QuarticOutIn: global.TWEEN.Easing.Quartic.OutIn,
    QuinticIn: global.TWEEN.Easing.Quintic.In,
    QuinticOut: global.TWEEN.Easing.Quintic.Out,
    QuinticInOut: global.TWEEN.Easing.Quintic.InOut,
    QuinticOutIn: global.TWEEN.Easing.Quintic.OutIn,
    SinusoidalIn: global.TWEEN.Easing.Sinusoidal.In,
    SinusoidalOut: global.TWEEN.Easing.Sinusoidal.Out,
    SinusoidalInOut: global.TWEEN.Easing.Sinusoidal.InOut,
    SinusoidalOutIn: global.TWEEN.Easing.Sinusoidal.OutIn,
    ExponentialIn: global.TWEEN.Easing.Exponential.In,
    ExponentialOut: global.TWEEN.Easing.Exponential.Out,
    ExponentialInOut: global.TWEEN.Easing.Exponential.InOut,
    ExponentialOutIn: global.TWEEN.Easing.Exponential.OutIn,
    CircularIn: global.TWEEN.Easing.Circular.In,
    CircularOut:global.TWEEN.Easing.Circular.Out,
    CircularInOut: global.TWEEN.Easing.Circular.InOut,
    CircularOutIn: global.TWEEN.Easing.Circular.OutIn,
    ElasticIn: global.TWEEN.Easing.Elastic.In,
    ElasticOut: global.TWEEN.Easing.Elastic.Out,
    ElasticInOut: global.TWEEN.Easing.Elastic.InOut,
    ElasticOutIn: global.TWEEN.Easing.Elastic.OutIn,
    BackIn: global.TWEEN.Easing.Back.In,
    BackOut: global.TWEEN.Easing.Back.Out,
    BackInOut: global.TWEEN.Easing.Back.InOut,
    BackOutIn: global.TWEEN.Easing.Back.OutIn,
    BounceIn: global.TWEEN.Easing.Bounce.In,
    BounceOut: global.TWEEN.Easing.Bounce.Out,
    BounceInOut: global.TWEEN.Easing.Bounce.InOut,
    BounceOutIn: global.TWEEN.Easing.Bounce.OutIn,
    Step: global.TWEEN.Easing.Step,
    Bezier: global.TWEEN.Easing.Bezier,
    Arch: global.TWEEN.Easing.Arch
}

class CustomTween {
    constructor(_tweenParameters) {
        this.params = _tweenParameters
        this.startCallback = this.params.onStart
        this.updateCallback = this.params.onUpdate
        this.completeCallback = this.params.onComplete
        this.stopCallback = this.params.onStop
    }

    start() {
        this.tween = CreateTween(this.params)
        this.tween.start()
    }

    reset() {
        this.jumpTo(0)
    }

    stop() {
        this.tween.stop();
    }

    jumpTo(progress) {
        if(this.params.onStart)
            this.startCallback()
        this.updateCallback(progress)
        this.tween = CreateTween(this.params)
    }

    pause() {
        this.tween.pause()
    }

    resume() {
        this.tween.resume()
    }

    setDuration(d) {
        this.params.duration = d
        this.tween.setDuration(d * 1000);
    }

    isPlaying(){
        return this.tween.isPlaying();
    }

    getProgress(){
        return this.tween.getProgress();
    }
}

global.CustomTween = CustomTween


const SetTweenRepeatNumber = (tween, repeatNumber) => {
    tween.repeat(repeatNumber)
}

const SetTweenRepeatMode = (tween, loopType, repeatNumber) => {
    if (loopType == global.LoopType.PingPong) {
        tween.yoyo(true)
        SetTweenRepeatNumber(tween, repeatNumber == -1 ? Infinity : repeatNumber)

    }
    else if (loopType == global.LoopType.Loop) {
        SetTweenRepeatNumber(tween, Infinity)
    }
    else {
        SetTweenRepeatNumber(tween, repeatNumber == -1 ? Infinity : Math.abs(repeatNumber - 1))
    }
}

const CheckTweenParameters = (tweenParameters) => {
    if (tweenParameters.duration == null) {
        print("WARNING " + tweenParameters.name + " : Tween Parameter Duration missing and set by default to 1.")
        tweenParameters.duration = 1
    }
    if (tweenParameters.delay == null) {
        print("WARNING " + tweenParameters.name + " : Tween Parameter Delay missing and set by default to 0.")
        tweenParameters.delay = 0
    }
    if (tweenParameters.easing == null) {
        print("WARNING " + tweenParameters.name + " : Tween Parameter Easing missing and set by default to 0.")
        tweenParameters.easing = global.Easings.Linear
    }
    else if(tweenParameters.easing == global.Easings.Step && 
        (tweenParameters.stepAmount == null || tweenParameters.stepAmount <= 0))
    {
        print("WARNING " + tweenParameters.name + " : Tween Parameter Step Amount invalid and set by default to 10.")
        tweenParameters.stepAmount = 10;
    }
    else if(tweenParameters.easing == global.Easings.Bezier && 
        (tweenParameters.bezierPoints == null || tweenParameters.bezierPoints.length == 0))
    {
        print("WARNING " + tweenParameters.name + " : Tween Parameter Bezier Points invalid, setting default Bezier points [0, 1].")
        tweenParameters.bezierPoints = [];
    }
    else if(tweenParameters.easing == global.Easings.Arch && tweenParameters.archHeight == null)
    {
        print("WARNING " + tweenParameters.name + " : Tween Parameter Arch Heightinvalid, setting default height 0.")
        tweenParameters.archHeight = 0;
        //tweenParameters.bezierPoints = [0, 0.5, 1, 1, 1];
    }

    return tweenParameters
}

const CreateTween = (tweenParameters) => {
    tweenParameters = CheckTweenParameters(tweenParameters)
    let obj = { progress: 0.0}

    let tween = new global.TWEEN.Tween(obj)
    .to({ progress: 1.0 }, tweenParameters.duration * 1000.0)
    .delay(tweenParameters.delay * 1000.0)
    .easing(tweenParameters.easing)
    
    if(tweenParameters.easing == global.Easings.Step){
        tween.step(tweenParameters.stepAmount)
    }

    if(tweenParameters.easing == global.Easings.Bezier){
        tweenParameters.bezierPoints.unshift(0)
        tweenParameters.bezierPoints.push(1)
        print(tweenParameters.bezierPoints)
        tween.bezierPoints(tweenParameters.bezierPoints);
    }

    if(tweenParameters.easing == global.Easings.Arch){
        let p = [0, 
            (1 + tweenParameters.archHeight) / 2, 
            1 + tweenParameters.archHeight, 
            1 + (tweenParameters.archHeight / 2), 
            1]
        tween.bezierPoints(p)
    }

    if (tweenParameters.onStart != null) {
        tween.onStart(tweenParameters.onStart)
    }

    if (tweenParameters.onRepeat != null) {
        tween.onRepeat(tweenParameters.onRepeat)
    }

    if (tweenParameters.onUpdate != null) {
        tween.onUpdate(() => {
            tweenParameters.onUpdate(obj.progress)
         })
    }

    
    // -----------------------
    //ADD EVENTS
    // If more events are needed, use these as a base

    if (tweenParameters.onEvent1Reached != null && 
        tweenParameters.event1Time != null && 
        tweenParameters.event1Time >= 0 && tweenParameters.event1Time <= 1) {
        tween.onEvent1Reached(tweenParameters.event1Time, tweenParameters.onEvent1Reached)
    }

    if (tweenParameters.onEvent2Reached != null && 
        tweenParameters.event2Time != null && 
        tweenParameters.event2Time >= 0 && tweenParameters.event2Time <= 1) {
        tween.onEvent2Reached(tweenParameters.event2Time, tweenParameters.onEvent2Reached)
    }

    if (tweenParameters.onEvent3Reached != null && 
        tweenParameters.event3Time != null && 
        tweenParameters.event3Time >= 0 && tweenParameters.event3Time <= 1) {
        tween.onEvent3Reached(tweenParameters.event3Time, tweenParameters.onEvent3Reached)
    }
    // -----------------------
    
    if (tweenParameters.repeatMode != null) SetTweenRepeatMode(tween, tweenParameters.repeatMode, tweenParameters.repeatNumber);
    if (tweenParameters.repeatDelay != null) tween.repeatDelay(tweenParameters.repeatDelay * 1000);
    if (tweenParameters.retriggerEventsOnLoop || tweenParameters.retriggerEvents) tween.retriggerEventsOnLoop(tweenParameters.retriggerEventsOnLoop  || tweenParameters.retriggerEvents);
    if (tweenParameters.onStop != null) tween.onStop(tweenParameters.onStop);
    if (tweenParameters.onComplete != null) tween.onComplete(tweenParameters.onComplete);
    
    return tween;
}

