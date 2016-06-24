define([],function(){
    function constructor(bufferlength) {
        this.async = true
        this.responseType = "arraybuffer"
        this.bufferLength = bufferlength||10*1024*1024

        this.listeners = []
        this.forwardevt = function(evt,data){
            this.listeners.forEach(function(listener){
                if(evt == listener.type){
                    listener.handler(data);
                }
            })
        }
    }
    constructor.prototype = {
        on:function(evtType,handle){
            listener = {}
            listener.type = evtType
            listener.handler = handle
            this.listeners.push(listener)
        },
        load: function(source) {
            source+="?end="+this.bufferLength
            var xhr = new XMLHttpRequest();
            xhr.open("GET", source, this.async);
            xhr.responseType = this.responseType

            xhr.onprogress = function (event) {
                this.forwardevt("progress",event)
            }.bind(this)
            xhr.onreadystatechange = function (event) {
                switch(xhr.readyState){
                    case 1:
                        break;
                    case 2:
                        break
                    case 3://loading
                        this.forwardevt("progress")
                        break
                    case 4:
                        this.forwardevt("complete",xhr.response)
                        break
                }
            }.bind(this)

            xhr.send(null);
        }
    }
    return constructor;
})
