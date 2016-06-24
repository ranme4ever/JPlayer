define(["media/Video"],function(Video){
    function constructor(div){
        this.video = new Video()
        div.appendChild(this.video.canvas);
    }
    constructor.prototype = {
        play:function(){
            this.video.play()
        },
        setup:function(cfg){
            this.cfg = cfg
            this.video.source = cfg.file
        }
    }
    return constructor
})