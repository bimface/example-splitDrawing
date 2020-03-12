<template>
  <div id="app">
    <header>
      <a href="#" class="logo"></a>
      <h2>CAD设计协同平台<i>官方示例</i></h2>
      <div class="btn-box">
        <a href="https://github.com/bimface/example-splitDrawing" target="_blank" class="btn btn-sm btn-primary">源代码</a>
      </div>
    </header>

    <div class="container" :style="{'height':cHeight + 'px'}">
      <div :id="`viewerWrap`" class="viewer-wrap"></div>
      <div class="side" :class="{'side-isedit':isEdit}">
        <div class="title" v-if="!isEdit"><span>图纸</span></div>
        <ul class="drawinglist" v-if="!isEdit">
          <li v-for="(items, i) in drawingFrame" 
              :title="items.name"
              :key="i">
              <div>{{items.name}}</div>
              <div v-for="(item, j) in items.model" 
                   class="detail"
                   :title="item.name" 
                   :key="j">
                <div class="name"
                     :class="{'on':`d${i}m${j}`==nowIndex}"
                     @click="loadFrame(`d${i}m${j}`,items.viewToken,item.id)" >{{item.name}}</div>
                <div>{{item.number}}</div>
              </div>
          </li>
        </ul>
        <!-- 批注 -->
        <div class="title">
          <span>批注</span>
          <div class="new" v-if="!isEdit && loaded">
            <a href="javascript:void(0)" class="btn btn-sm btn-primary" :class="{'btn-disable2':isView}" @click="createAnnotation">添加批注</a>
          </div>
        </div>
        <div class="edit" v-if="isEdit">
          <div class="annotation-brief">
            <p>图名：{{this.nowName}}</p>
            <p>图号：{{this.nowNumber}}</p>
          </div>
          <textarea placeholder="添加批注描述" v-model="comment"></textarea>
          <a href="javascript:void(0)" class="btn btn-sm btn-primary" @click="annotationSave">保存</a>
          <a href="javascript:void(0)" class="btn btn-sm btn-default" @click="annotationCancel">取消</a>
        </div>
        <ul class="annotationlist" v-if="!isEdit" style="max-height:calc(100% - 352px)">
          <li v-for="(item, i) in annotationlist" 
              :title="item.name" 
              @click="annotationGetImage(i,item)" 
              :class="{'on':item.isClick}" 
              :key="i">
            <img :src="item.src" alt="" class="annotation-img" />
            <div class="info">
              <p class="name" v-if="item.name.length>0">{{item.name}}</p>
              <p class="name" v-else> - </p>
              <p>{{item.time}}</p>
              <p>图名：{{item.dwgname}}</p>
              <p>图号：{{item.number}}</p>
            </div>
          </li>
        </ul>
      </div>
      <div class="mask" v-if="isView">
        <a href="javascript:void(0)" class="btn btn-exit" @click="maskExit">退出</a>
      </div>
     
    </div>

    <footer>
      <div class="w1200">
        <div class="copyright">
          Copyright ©2016-2020 <a href="http://bimface.com" target="_blank">BIMFACE</a> 京ICP备10021606号-19 <a href="http://www.glodon.com/" target="_blank">广联达</a>旗下产品
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
  import Vue from 'vue'
  import '../../../../page/css/example-common.css'
  import '../../../assets/css/btn.less'
  import '../less/splitDrawing.less'
  import spliteAnnotation from './spliteAnnotation.js'
  import spliteLayers from './spliteLayers.js'

  export default {
    data(){
      return {
        cHeight:null,
        viewToken: null,
        loaded:false,
        isEdit: false,
        isView:false,
        state:null,
        comment:'',
        annotationlist:[],
        dwgViewer: {
          toolbar: null,  // 工具条
          annotationManager: null,  // annotation的绘制管理器
          annotationToolbar: null,
          annotationControl: null,  // 重写annotation的保存、取消
        },
        drawingFrame: null,
        isAllLoaded: false,
        nowIndex: null,
        nowName: null,
        nowNumber:  null,
        listStorage: null,
        layerStatus: null,
      }
    },

    mounted(){
      console.log('annotationList',spliteAnnotation);
      this.cHeight = document.documentElement.clientHeight - 105 - 40;
      var me = this;
      me.$http.get('//bimface.com/api/console/share/preview/viewtoken?token=c476913c').then((res)=>{
        if(res.data.code == 'success'){
          var viewToken = res.data.data;
          var BimfaceLoaderConfig = new BimfaceSDKLoaderConfig();
          BimfaceLoaderConfig.viewToken = viewToken;
          BimfaceSDKLoader.load(BimfaceLoaderConfig,successCallback,failureCallback);

          function successCallback(databag) {
            // 获取DOM元素
            var dom4Show = document.getElementById('viewerWrap');
            var WebDwgConfig = new Glodon.Bimface.Application.WebApplicationDrawingConfig();
            WebDwgConfig.domElement = dom4Show;
            //WebDwgConfig.Buttons = ['Home', "RectZoom", "DrawingMeasure", "FullScreen"];
            
            window.app = new Glodon.Bimface.Application.WebApplicationDrawing(WebDwgConfig);
            app.load(viewToken);
            window.viewer2D =app.getViewer(); 
            drawingViewExtend(databag,viewToken);
          }

          function failureCallback(error) {
            console.log(error);
          };

          function drawingViewExtend(databag,viewToken) {
            var viewerEvents = Glodon.Bimface.Viewer.ViewerDrawingEvent;
            viewer2D.addEventListener(viewerEvents.Loaded, function () {
              me.loaded = true;
              if (!me.drawingFrame) {
                viewer2D.getDrawingFrame(function (data) {
                  me.drawingFrame = [{
                    'viewToken': viewToken,
                    'name': databag.name,
                    'model': data.model
                  }];
                  viewer2D.destroy();
                  me.loadDwg();
                });
              }
              //自适应屏幕大小
              window.onresize=function(){
                viewer2D.resize(document.documentElement.clientWidth,document.documentElement.clientHeight-40)
              } 
              // 添加批注按钮
              var viewerDom = viewer2D.getRootElement();
              me.dwgViewer.toolbar = viewerDom.querySelector('.bf-toolbar-bottom');
            });
          }
        }
      })
    },

    methods: {
      loadDwg() {
        const me = this;
        me.$http.get(`//bimface.com/api/console/share/preview/viewtoken?token=ba99b2fe`).then((res)=>{  
          if(res.data.code == 'success'){
            var viewToken = res.data.data;
            var BimfaceLoaderConfig = new BimfaceSDKLoaderConfig();
            BimfaceLoaderConfig.viewToken = viewToken;
            BimfaceSDKLoader.load(BimfaceLoaderConfig,successCallback,failureCallback);

            function successCallback(databag) {
              viewer2D.destroy();
              app.load(viewToken);
              viewer2D.addEventListener(Glodon.Bimface.Viewer.ViewerDrawingEvent.Loaded, function () {
                if(!me.isAllLoaded) {
                  viewer2D.getDrawingFrame(function (data) {
                    const dwgFrame = {
                      'viewToken':viewToken,
                      'name': databag.name,
                      'model':data.model
                      };
                    me.drawingFrame.push(dwgFrame);
                    me.isAllLoaded = true;
                  });
                  const loadViewToken = me.drawingFrame[0].viewToken;
                  const loadModel = me.drawingFrame[0].model[0].id; 
                  me.loadFrame(`d0m0`,loadViewToken,loadModel);
                  console.log('drawingFrame',me.drawingFrame)
                }
               // me.defaultAnnotation();
              })
            }
            function failureCallback(error) {
              console.log(error);
            };
          }
        })
      },

      loadFrame(index,viewToken,id) {
        const me = this;
        if(!me.isView) {
          if(me.isAllLoaded) {
            const oldDwg = me.nowIndex.split('')[1];
            const oldModel = me.nowIndex.split('')[3];
            me.saveLayers(oldDwg,oldModel);
          }
          
          me.nowIndex = index;
          viewer2D.destroy();
          app.loadFrame(viewToken, id);
          viewer2D.addEventListener(Glodon.Bimface.Viewer.ViewerDrawingEvent.Loaded, function () {
              me.defaultAnnotation();  
              if(!me.layerStatus) sessionStorage.layers = JSON.stringify(spliteLayers); 
              const dwgIndex = me.nowIndex.split('')[1];
              const modelIndex = me.nowIndex.split('')[3];
              me.nowName = me.drawingFrame[dwgIndex].model[modelIndex].name;
              me.nowNumber = me.drawingFrame[dwgIndex].model[modelIndex].number;
              if(me.isAllLoaded) me.setLayers(dwgIndex,modelIndex);
          })
        }
      },

      saveLayers(dwgIndex,modelIndex) {
        const me = this;
        me.layerStatus = JSON.parse(sessionStorage.layers);
        var layers = viewer2D.getLayers();
        if(layers) me.layerStatus[dwgIndex][modelIndex] = layers;
        sessionStorage.layers = JSON.stringify(me.layerStatus);
      },

      setLayers(dwgIndex,modelIndex) {
        if(sessionStorage.layers) {
          this.layerStatus = JSON.parse(sessionStorage.layers);
           var currentLayer = this.layerStatus[dwgIndex][modelIndex];
           if(currentLayer) viewer2D.changeLayers(currentLayer);
        }
      },

      // 批注
      defaultAnnotation() {
        const me = this;
        if(!me.listStorage) sessionStorage.annotationList = JSON.stringify(spliteAnnotation);
        me.clearToolDom();
        me.dwgViewer.annotationManager = null;
        if (!me.dwgViewer.annotationManager) {
          var config = new Glodon.Bimface.Plugins.Annotation.AnnotationToolbarConfig();
          config.viewer = viewer2D;
          var annotationToolbar = new Glodon.Bimface.Plugins.Annotation.AnnotationToolbar(config);
        
          me.dwgViewer.annotationToolbar = annotationToolbar;
          me.dwgViewer.annotationManager = annotationToolbar.getAnnotationManager();
          me.defaultAnnotationList();
        }
      },

      defaultAnnotationList() {
        const me = this;
        me.annotationlist = [];
        const dwgIndex = me.nowIndex.split('')[1];
        const modelIndex = me.nowIndex.split('')[3];
        me.listStorage = JSON.parse(sessionStorage.annotationList);
        // 增加获取图层状态
        var layerStatus = me.listStorage[dwgIndex][modelIndex]
        me.listStorage[dwgIndex][modelIndex].forEach(item => {
          me.dwgViewer.annotationManager.setAnnotationList(item.status);
          me.dwgViewer.annotationManager.createSnapshot(function(data){
            var date = new Date();
            var seperator1 = "-";
            var seperator2 = ":";
            var month = date.getMonth() + 1;
            var strDate = date.getDate();
            let currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate + " " + date.getHours() + seperator2 + date.getMinutes() + seperator2 + date.getSeconds();
            let _img;
            item.img ? _img = item.img : _img = data;
            var obj = {
              name: item.name,
              time: currentdate,
              src: _img,
              state: item.status,
              isClick: false,
              dwgname: me.nowName,
              number: me.nowNumber,
            }
            me.annotationlist.push(obj);
          });
        })
        me.annotationCancel();
      },

      clearToolDom() {
        let markupVirtual = document.querySelector("#markupVirtual");
        if(markupVirtual) markupVirtual.parentNode.removeChild(markupVirtual);
        let control = document.querySelector(".bf-toolbar-control");
        if(control) control.parentNode.removeChild(control);
        let annotation = document.querySelector(".bf-annotation");
        if(annotation) annotation.parentNode.removeChild(annotation);
      },

      createAnnotation: function(){
        if(!this.isView){
          this.isEdit = true;
          this.state = [];
          this.comment = '';
          this.changeModel(1);
          this.dwgViewer.annotationToolbar.show();
          document.querySelector('.bf-toolbar-control').style.display = 'none';   
        }
      },

      annotationSave: function(){
        var me = this;
        let _state = me.dwgViewer.annotationManager.getCurrentState();  
        if(_state.annotationList.length == 0) {
          const emptyObj = {
            rotation: 0,
            markupType: "Cross",
            drawPoints:[0,0],
            strokeStyle: "rgba(0,0,0,0)",
            lineWidth:0,
            bNeedHitByBbox:false,
            drawEnd:true,
            markupId: "",
          }
          _state.annotationList.push(emptyObj);
        }
        me.dwgViewer.annotationManager.createSnapshot(function(data){
          var date = new Date();
          var seperator1 = "-";
          var seperator2 = ":";
          var month = date.getMonth() + 1;
          var strDate = date.getDate();
          let currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate + " " + date.getHours() + seperator2 + date.getMinutes() + seperator2 + date.getSeconds();
          let _img = data;
          var obj = {
            name:me.comment,
            time:currentdate,
            src: _img,
            state:_state,
            isClick:false,
            dwgname: me.nowName,
            number: me.nowNumber,
          }
          me.annotationlist.push(obj);
          const dwgIndex = me.nowIndex.split('')[1];
          const modelIndex = me.nowIndex.split('')[3];
          var storageObj = {
            name: me.comment,
            img: _img,
            status: _state,
          }
          me.listStorage[dwgIndex][modelIndex].push(storageObj);
          sessionStorage.annotationList =  JSON.stringify(me.listStorage);
        });
        me.annotationCancel();
      },

      annotationCancel: function(){
        this.dwgViewer.annotationManager.endDrawing();
        this.isEdit = false;
        this.changeModel(0);
        document.querySelector('.bf-annotation').addClass('bf-hide');
      },

      annotationGetImage: function(i,data){
        const me = this;
        const dwgIndex = me.nowIndex.split('')[1];
        const modelIndex = me.nowIndex.split('')[3];
        let image;
        if(!me.isEdit){
          me.isView = true;
          me.clearListStyle();
          me.changeModel(1);
          data.isClick = true;
          me.dwgViewer.annotationManager.setState(data.state);
          if(!me.listStorage[dwgIndex][modelIndex][i].img) {
            me.dwgViewer.annotationManager.createSnapshot(function(snapshot){
              image = snapshot;
              const copyList = me.annotationlist;
              copyList[i].src = image;
              me.annotationList = copyList;
              const imgs = document.querySelectorAll('.annotation-img');
              imgs[i].setAttribute('src',image);
              me.listStorage[dwgIndex][modelIndex][i].img = image;
              sessionStorage.annotationList = JSON.stringify(me.listStorage);
            })
          }
        }
      },

      clearListStyle: function(){
        for(let i=0;i<this.annotationlist.length;i++){
          this.annotationlist[i].isClick = false;
        }
      },

      maskExit: function(){
        this.isView = false;
        this.clearListStyle();
        this.changeModel(0);
        this.dwgViewer.annotationManager.startDrawing();
        this.dwgViewer.annotationManager.endDrawing();
      },

      changeModel: function(num){
        if(num == 0){
         app.getToolbar("MainToolbar").show();
        } else {
         app.getToolbar("MainToolbar").hide();
        }
      },
      
    }
  }
</script>
