define(["net/URLLoader","parser/FLVParser","broadway/player","media/Sound"],function(URLLoader,FLVParser,Player,Sound){
    function Video(){
        this.source = ""
        this.loader = new URLLoader()
        this.loader.on("complete",function(buffer){
            this.initParser(buffer)
        }.bind(this))
        this.initParser = function(buffer){
            this.parser = new FLVParser(buffer)
            this.parser.on("error",function(msg){
            })
            this.parser.on("complete",function(){
                console.info("decode complete")
                this.sound.play()
            }.bind(this))
            this.parser.on("getHeader",function(){
                console.info("getHeader")
                this.naluPlayer.decode(this.parser.sps)
                this.naluPlayer.decode(this.parser.pps)
                var pic=0
                setTimeout(function foo() {
                    var avc = this.naluPlayer;
                    if(pic<this.parser.nalus.length){
                        var nalu = this.parser.nalus[pic]
                        nalu.forEach(function(n){
                            avc.decode(n);
                        })
                        pic ++;
                        if (pic < this.parser.nalus.length) {
                            setTimeout(foo.bind(this), 35);
                        };
                    }
                }.bind(this), 35);
            }.bind(this))
            this.parser.on("getAudio",function(buf){
                this.sound.decode(buf)
            }.bind(this))
            this.parser.parse()
        }.bind(this)

        this.naluPlayer = new Player({
          useWorker: false,
          reuseMemory: true,
          webgl: true,
          size: {
            width: 640,
            height: 420,
          }
        });
        this.canvas = this.naluPlayer.canvas

        this.sound = new Sound()

    }
    Video.prototype = {
        play :function(){
            if(this.source != ""){
                this.loader.load(this.source)
            }
        }
    }
    return Video
})