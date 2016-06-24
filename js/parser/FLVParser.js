define(["common/ByteStream"],function(ByteStream){
    function FLVParser(bytes){
        this.stream = new ByteStream(new Uint8Array(bytes))
        this.nalus=[]
        this.sps=[]
        this.pps=[]

        this.audioSpecCfg = {
            set audioObjectType(value){
                if(value == 2)//AAC-LC
                    this.profileID = 1
            },
            profileID:0,//aac profile index
            sampleIndex:0,
            chanels:2,
            frameLen:0,
            dependOnCodecoder:0,
            extenionFlag:0,
        }
        this.listeners = []
        this.forwardevt = function(evt,data){
            this.listeners.forEach(function(listener){
                if(listener.type == evt){
                    listener.handle(data)
                }
            })
        }
    }
    FLVParser.prototype = {
        on:function(type,handle){
            listener = {}
            listener.type = type
            listener.handle = handle
            this.listeners.push(listener)
        },
        parse :function(){
            this.readHeader()
            while(this.stream.pos<this.stream.end){
                result = this.readTag()
                if(!result)
                    break;
            }
            this.forwardevt("complete","invalid FLV signature")
            console.log("parser complete")
        },
        readHeader:function(){
            //read flv
            var sig = this.stream.readUTF8(3)
            if ('FLV' != sig) {
                this.forwardevt("error","invalid FLV signature")
            }
            //read version
            var ver = this.stream.readU8()
            console.info("version is "+ver)
            if (1 !== ver) {
                this.forwardevt("error",'expected flv version 1, got: ' + ver);
            }
            this.version = ver
            //read typeflag
            var flags = this.stream.readU8();
            var typeFlagsAudio = flags >>2
            var typeFlagsVideo = flags&1
            //read  size of header
            var offset = this.stream.readU32();
            // assert offset === 9
        },
        readTag:function(){
            var preTagsize = this.stream.readU32();
            var tagtype = this.stream.readU8();
            var tagDatasize = this.stream.readU24();
            var timestamp = this.stream.readU24()
            var timestampExtended = this.stream.readU8()
            var streamID = this.stream.readU24()
            //read tagbody
            switch(tagtype){
                case 0x09:
                    var buf = this.stream.subStream(this.stream.pos,tagDatasize)
                    var frametype_codecid = buf.readU8()
                    var frametype = frametype_codecid>>4
                    var codecID = frametype_codecid&0xf
                    if (codecID ==7)//avc package
                    {
                        var avcpkg = buf.subStream(buf.pos,buf.end-buf.pos)
                        avcPackageType = avcpkg.readU8();
                        timeoff = avcpkg.readU24()
                        if(avcPackageType==0)//avc sequence header
                        {
                            avcCfg = avcpkg.subStream(avcpkg.pos,avcpkg.end-avcpkg.pos)
                            configurationVersion = avcCfg.readU8()
                            AVCProfileIndication  = avcCfg.readU8()
                            profile_compatibility = avcCfg.readU8()

                            AVCLevelIndication = avcCfg.readU8()
                            lengthSizeMinusOne = avcCfg.readU8()&0x3
                            numOfsps_reserv = avcCfg.readU8()
                            numOfsps = numOfsps_reserv&0x1F
                            for(i=0;i<numOfsps;i++){
                                spslen = avcCfg.readU16()
                                this.sps= avcCfg.readU8Array(spslen)
                            }
                            numOfpps = avcCfg.readU8()
                            for(i=0;i<numOfpps;i++){
                                ppslen =  avcCfg.readU16()
                                this.pps = avcCfg.readU8Array(ppslen)
                            }
                            this.forwardevt("getHeader")
                        }else{
                            nalusbuf = avcpkg.subStream(avcpkg.pos,avcpkg.end-avcpkg.pos)
                            var naluFrame = []
                            while(nalusbuf.pos-nalusbuf.start<nalusbuf.length){
                                nalulen = nalusbuf.readU32()
                                naluFrame.push(nalusbuf.readU8Array(nalulen))
                            }
                            this.nalus.push(naluFrame)
                        }
                    }
                    break;
                case 0x08://audio
//                    this.stream.seek(this.stream.pos+tagDatasize)
//                    break;
                    var buf = this.stream.subStream(this.stream.pos,tagDatasize)
                    var soundHeader = buf.readU8()
                    var soundFormat = soundHeader>>4
                    var soundRate = (soundHeader>>2)&0x3
                    var soundSize = (soundHeader>>1)&0x1
                    var soundType = soundHeader&0x1
                    var aacPkgType = buf.readU8()
                    if(aacPkgType ==0){//AAC sequence header
                        var aacSpecCfg = buf.readU16()
                        this.audioSpecCfg.audioObjectType = aacSpecCfg>>11
                        this.audioSpecCfg.sampleIndex = (aacSpecCfg>>7)&0xf
                        this.audioSpecCfg.chanels = (aacSpecCfg)>>3 &0xf
                        this.audioSpecCfg.frameLen = (aacSpecCfg>>2)&0x1
                        this.audioSpecCfg.dependOnCodecoder = (aacSpecCfg>>1) &0x1
                        this.audioSpecCfg.extenionFlag = aacSpecCfg&0x1
                    }else{//AAC RAW
                        var rawSize = buf.end-buf.pos
                        var rawdata = buf.readU8Array(rawSize)
                        //package aac raw with adts
                        var adts =  []
                        //syncword(12)ID(1)layer(2)protection_absent(1)
                        adts.push(0xff)
                        adts.push((0xf<<4)+0x0+0x0+1)
                        //objecttype(2)samplint_frequency_index(4)private_bit(1)channel_config(1)
                        adts.push((this.audioSpecCfg.profileID<<6)+(this.audioSpecCfg.sampleIndex<<2)+0+(this.audioSpecCfg.chanels>>2))
                        //channel_config(2)original_copy(1)home(1)copyright_bie(1)copyright_start(1)frame_length(2)
                        frame_length=7+rawSize
                        adts.push(((this.audioSpecCfg.chanels&3)<<6)+0+0+0+0+(frame_length>>11))
                        //frame_length(8)
                        adts.push((frame_length>>3)&0xff)
                        //frame_length(3)adts_buffer_fullness(5)
                        adts.push(((frame_length&7)<<5)+(0x7ff>>6))
                        //adts_buffer_fullness(6)number_of_raw_data_blocks_in_frame(2)
                        adts.push(((0x7ff&0x3f)<<2)+0)
                        var adtsData = new Uint8Array(adts)
                        var aacraw = new Uint8Array(adtsData.length+rawdata.length)
                        aacraw.set(adtsData)
                        aacraw.set(rawdata,adtsData.length)
                        this.forwardevt("getAudio",aacraw);
                    }
                    break;
                case 0x12://script
                    this.stream.seek(this.stream.pos+tagDatasize)
                    break
                default:
                  this.forwardevt("error",'unknown tag type: ' + tagtype);
                  return false;
            }
            return true
        }
    }

    return FLVParser
})