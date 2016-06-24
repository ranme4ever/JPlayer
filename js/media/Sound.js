define([],function(){
    function SoundPlayer(){
        this.buffer
        this.bytesArray = []
        try{
            window.AudioContext = window.AudioContext||window.webkitAudioContext;
            this.context = new AudioContext();
        }
        catch(e){
            document.getElementById("board").innerHTML="Web Audio API is not supported in this browser"
        }
    }
    SoundPlayer.prototype = {
        decode:function(rawBuf){
            if(!this.buffer){
                this.buffer = rawBuf
            }else{
                var tmpbuf = new Uint8Array(rawBuf.length + this.buffer.length)
                tmpbuf.set(this.buffer)
                tmpbuf.set(rawBuf,this.buffer.length)
                this.buffer = tmpbuf;
            }
        },
        play:function(){
            this.context.decodeAudioData(
                this.buffer.buffer,
                function(buf){
                    var audioBufferSouceNode = this.context.createBufferSource();
                    audioBufferSouceNode.connect(this.context.destination);
                    audioBufferSouceNode.buffer = buf;
                    audioBufferSouceNode.start(0);
                }.bind(this),
                function(e){
                    console.log("audio decode error!")
                })
        }
    }
    return SoundPlayer
})