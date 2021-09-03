<template>
  <div id="app">
    <header>
      <a
        href="#"
        class="logo"
      />
      <h2>
        CAD设计协同平台
        <i>官方示例</i>
      </h2>
      <div class="btn-box">
        <a
          href="https://github.com/bimface/example-splitDrawing"
          target="_blank"
          class="btn btn-sm btn-primary"
        >源代码</a>
      </div>
    </header>

    <div class="container">
      <div
        ref="viewerWrap"
        class="viewer-wrap"
      />
      <div
        class="side"
        :class="{ 'side-isedit': isEdit }"
      >
        <div
          v-if="!isEdit"
          class="title"
        >
          <span>图纸</span>
        </div>
        <ul
          v-if="!isEdit"
          class="drawinglist"
        >
          <li
            v-for="(items, i) in drawingFrame"
            :key="i"
            :title="items.name"
          >
            <div>{{ items.name }}</div>
            <div
              v-for="(item, j) in items.model"
              :key="j"
              class="detail"
              :title="item.name"
            >
              <div
                class="name"
                :class="{ on: `d${i}m${j}` == nowIndex }"
                @click="loadFrame(`d${i}m${j}`, items.viewToken, item.id)"
              >
                {{ item.name }}
              </div>
              <div>{{ item.number }}</div>
            </div>
          </li>
        </ul>
        <!-- 批注 -->
        <div class="title">
          <span>批注</span>
          <div
            v-if="!isEdit && isAllLoaded"
            class="new"
          >
            <a
              href="javascript:void(0)"
              class="btn btn-sm btn-primary"
              :class="{ 'btn-disable2': isView }"
              @click="createAnnotation"
            >添加批注</a>
          </div>
        </div>
        <div
          v-if="isEdit"
          class="edit"
        >
          <div class="annotation-brief">
            <p>图名：{{ nowName }}</p>
            <p>图号：{{ nowNumber }}</p>
          </div>
          <textarea
            v-model="comment"
            placeholder="添加批注描述"
          />
          <a
            href="javascript:void(0)"
            class="btn btn-sm btn-primary"
            @click="annotationSave"
          >保存</a>
          <a
            href="javascript:void(0)"
            class="btn btn-sm btn-default"
            @click="annotationCancel"
          >取消</a>
        </div>
        <ul
          v-if="!isEdit"
          class="annotationlist"
          style="max-height: calc(100% - 352px)"
        >
          <li
            v-for="(item, i) in annotationlist"
            :key="i"
            :title="item.name"
            :class="{ on: item.isClick }"
            @click="annotationGetImage(i, item)"
          >
            <img
              :src="item.src"
              alt
              class="annotation-img"
            >
            <div class="info">
              <p
                v-if="item.name.length > 0"
                class="name"
              >
                {{ item.name }}
              </p>
              <p
                v-else
                class="name"
              >
                -
              </p>
              <p>{{ item.time }}</p>
              <p>图名：{{ item.dwgname }}</p>
              <p>图号：{{ item.number }}</p>
            </div>
          </li>
        </ul>
      </div>
      <div
        v-if="isView"
        class="mask"
      >
        <a
          href="javascript:void(0)"
          class="btn btn-exit"
          @click="maskExit"
        >退出</a>
      </div>
    </div>

    <footer>
      <div class="w1200">
        <div class="copyright">
          Copyright ©2016-2020
          <a
            href="http://bimface.com"
            target="_blank"
          >BIMFACE</a>
          京ICP备10021606号-19
          <a
            href="http://www.glodon.com/"
            target="_blank"
          >广联达</a>旗下产品
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
/* eslint-disable */
import '../assets/common.css'
import { spliteAnnotation } from './spliteAnnotation'
import { spliteLayers } from './spliteLayers'
import axios from 'axios'

export default {
  name: 'drawing',
  data() {
    return {
      isEdit: false,
      isView: false,
      comment: '',
      annotationlist: [],
      databag: null,
      dwgViewer: {
        toolbar: null,  // 工具条
        annotationManager: null,  // annotation的绘制管理器
        annotationToolbar: null,
        annotationControl: null,  // 重写annotation的保存、取消
      },
      app: null,// bimface Application
      viewer2D: null, // bimface view2D
      drawingFrame: null,
      isAllLoaded: false,
      nowIndex: null,
      nowName: null,
      nowNumber: null,
      listStorage: null,
      layerStatus: null,
    }
  },

  async mounted() {
    await this.initView()
  },

  methods: {
    async getViewToken(url) {
      const res = await axios.get(url)
      if (res.data.code == 'success') {
        return res.data.data
      } else {
        throw error("get请求出错")
      }
    },
    async initView() {
      const tokens = await Promise.all([this.getViewToken("/test/viewtoken?token=c476913c"), this.getViewToken("/test/viewtoken?token=ba99b2fe")])

      await this.loadDwgFile(tokens[0])
      await this.loadDwgFile(tokens[1])
      const loadViewToken = this.drawingFrame[0].viewToken;
      const loadModel = this.drawingFrame[0].model[0].id;
      this.loadFrame(`d0m0`, loadViewToken, loadModel);
      console.log('drawingFrame', this.drawingFrame)
    },
    async loadDwgFile(viewToken) {
      const databag = await this.getDwgData(viewToken)
      return new Promise((resolve, reject) => {
        // 初始化App和view2D
        if (!this.app) {
          let dom4Show = this.$refs.viewerWrap
          let WebDwgConfig = new Glodon.Bimface.Application.WebApplicationDrawingConfig();
          WebDwgConfig.domElement = dom4Show;
          this.app = new Glodon.Bimface.Application.WebApplicationDrawing(WebDwgConfig);
          this.app.load(viewToken);
          this.viewer2D = this.app.getViewer()
          // 定义viewer2D加载完毕事件
          let viewerEvents = Glodon.Bimface.Viewer.ViewerDrawingEvent;
          this.viewer2D.addEventListener(viewerEvents.Loaded, () => {
            if (!this.drawingFrame) {
              // 初始化drawingFrame
              this.viewer2D.getDrawingFrame((data) => {
                console.log("frame加载1--data:", data)
                console.log("frame加载1--databag:", databag)
                this.drawingFrame = [{
                  'viewToken': viewToken,
                  'name': databag.name,
                  'model': data.model
                }];
                this.viewer2D.destroy();
              })
              //自适应屏幕大小
              window.onresize = () => {
                this.viewer2D.resize(document.documentElement.clientWidth, document.documentElement.clientHeight - 40)
              }
              resolve()
            }
          })
        } else {
          // 已经完成App和view2D的实例化
          this.viewer2D.destroy();
          this.app.load(viewToken)
          // 定义viewer2D加载完毕事件
          let viewerEvents = Glodon.Bimface.Viewer.ViewerDrawingEvent;
          this.viewer2D.addEventListener(viewerEvents.Loaded, () => {
            if (!this.isAllLoaded) {
              this.viewer2D.destroy();

              this.viewer2D.getDrawingFrame((data) => {
                console.log("frame加载2--data:", data)
                console.log("frame加载2--databag:", databag)
                const dwgFrame = {
                  'viewToken': viewToken,
                  'name': databag.name,
                  'model': data.model
                };
                this.drawingFrame.push(dwgFrame);
                this.isAllLoaded = true;
                resolve()

              });
            }
          })
        }
      })
    },
    getDwgData(viewToken) {
      return new Promise((resolve, reject) => {
        let BimfaceLoaderConfig = new BimfaceSDKLoaderConfig();
        BimfaceLoaderConfig.viewToken = viewToken;
        new BimfaceSDKLoader.load(BimfaceLoaderConfig, (databag) => resolve(databag), (error) => reject(error));
      })
    },
    loadFrame(index, viewToken, id) {
      if (!this.isView) {
        // if (me.isAllLoaded) {
        //   const oldDwg = me.nowIndex.split('')[1];
        //   const oldModel = me.nowIndex.split('')[3];
        //   me.saveLayers(oldDwg, oldModel);
        // }
        this.nowIndex = index;
        this.viewer2D.destroy();
        this.app.loadFrame(viewToken, id);
        this.viewer2D.addEventListener(Glodon.Bimface.Viewer.ViewerDrawingEvent.Loaded, () => {
          console.log("触发loadFrame ViewerDrawingEvent")
          this.defaultAnnotation();
          if (!this.layerStatus) sessionStorage.layers = JSON.stringify(spliteLayers);
          const dwgIndex = this.nowIndex.split('')[1];
          const modelIndex = this.nowIndex.split('')[3];
          this.nowName = this.drawingFrame[dwgIndex].model[modelIndex].name;
          this.nowNumber = this.drawingFrame[dwgIndex].model[modelIndex].number;
          // if (this.isAllLoaded) this.setLayers(dwgIndex, modelIndex);
        })
      }
    },

    saveLayers(dwgIndex, modelIndex) {
      this.layerStatus = JSON.parse(sessionStorage.layers);
      var layers = this.viewer2D.getLayers();
      if (layers) this.layerStatus[dwgIndex][modelIndex] = layers;
      sessionStorage.layers = JSON.stringify(this.layerStatus);
    },

    setLayers(dwgIndex, modelIndex) {
      if (sessionStorage.layers) {
        this.layerStatus = JSON.parse(sessionStorage.layers);
        var currentLayer = this.layerStatus[dwgIndex][modelIndex];
        if (currentLayer) this.viewer2D.changeLayers(currentLayer);
      }
    },

    // 批注
    defaultAnnotation() {
      if (!this.listStorage) sessionStorage.annotationList = JSON.stringify(spliteAnnotation);
      this.clearToolDom();
      this.dwgViewer.annotationManager = null;
      if (!this.dwgViewer.annotationManager) {
        var config = new Glodon.Bimface.Plugins.Annotation.AnnotationToolbarConfig();
        config.viewer = this.viewer2D;
        var annotationToolbar = new Glodon.Bimface.Plugins.Annotation.AnnotationToolbar(config);

        this.dwgViewer.annotationToolbar = annotationToolbar;
        this.dwgViewer.annotationManager = annotationToolbar.getAnnotationManager();
        this.defaultAnnotationList();
      }
    },

    defaultAnnotationList() {
      this.annotationlist = [];
      const dwgIndex = this.nowIndex.split('')[1];
      const modelIndex = this.nowIndex.split('')[3];
      this.listStorage = JSON.parse(sessionStorage.annotationList);
      // 增加获取图层状态
      // var layerStatus = this.listStorage[dwgIndex][modelIndex]
      this.listStorage[dwgIndex][modelIndex].forEach(item => {
        this.dwgViewer.annotationManager.setAnnotationList(item.status);
        this.dwgViewer.annotationManager.createSnapshot((data) => {
          let date = new Date();
          let seperator1 = "-";
          let seperator2 = ":";
          let month = date.getMonth() + 1;
          let strDate = date.getDate();
          let currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate + " " + date.getHours() + seperator2 + date.getMinutes() + seperator2 + date.getSeconds();
          let _img = item.img ? item.img : data;
          // item.img ? _img = item.img : _img = data;
          let obj = {
            name: item.name,
            time: currentdate,
            src: _img,
            state: item.status,
            isClick: false,
            dwgname: this.nowName,
            number: this.nowNumber,
          }
          this.annotationlist.push(obj);
        });
      })
      this.annotationCancel();
    },

    clearToolDom() {
      let markupVirtual = document.querySelector("#markupVirtual");
      if (markupVirtual) markupVirtual.parentNode.removeChild(markupVirtual);
      let control = document.querySelector(".bf-toolbar-control");
      if (control) control.parentNode.removeChild(control);
      let annotation = document.querySelector(".bf-annotation");
      if (annotation) annotation.parentNode.removeChild(annotation);
    },

    createAnnotation() {
      if (!this.isView) {
        this.isEdit = true;
        this.comment = '';
        this.app.getToolbar("MainToolbar").hide();
        this.dwgViewer.annotationToolbar.show();
        document.querySelector('.bf-toolbar-control').style.display = 'none';
      }
    },

    annotationSave() {
      let _state = this.dwgViewer.annotationManager.getCurrentState();
      if (_state.annotationList.length == 0) {
        const emptyObj = {
          rotation: 0,
          markupType: "Cross",
          drawPoints: [0, 0],
          strokeStyle: "rgba(0,0,0,0)",
          lineWidth: 0,
          bNeedHitByBbox: false,
          drawEnd: true,
          markupId: "",
        }
        _state.annotationList.push(emptyObj);
      }
      this.dwgViewer.annotationManager.createSnapshot((data) => {
        var date = new Date();
        var seperator1 = "-";
        var seperator2 = ":";
        var month = date.getMonth() + 1;
        var strDate = date.getDate();
        let currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate + " " + date.getHours() + seperator2 + date.getMinutes() + seperator2 + date.getSeconds();
        let _img = data;
        var obj = {
          name: this.comment,
          time: currentdate,
          src: _img,
          state: _state,
          isClick: false,
          dwgname: this.nowName,
          number: this.nowNumber,
        }
        this.annotationlist.push(obj);
        const dwgIndex = this.nowIndex.split('')[1];
        const modelIndex = this.nowIndex.split('')[3];
        var storageObj = {
          name: this.comment,
          img: _img,
          status: _state,
        }
        this.listStorage[dwgIndex][modelIndex].push(storageObj);
        sessionStorage.annotationList = JSON.stringify(this.listStorage);
      });
      this.annotationCancel();
    },

    annotationCancel() {
      this.dwgViewer.annotationManager.endDrawing();
      this.isEdit = false;
      this.app.getToolbar("MainToolbar").show();
      document.querySelector('.bf-annotation').addClass('bf-hide');
    },

    annotationGetImage(i, data) {
      const dwgIndex = this.nowIndex.split('')[1];
      const modelIndex = this.nowIndex.split('')[3];
      if (!this.isEdit) {
        this.isView = true;
        this.clearListStyle();
        this.app.getToolbar("MainToolbar").hide();
        data.isClick = true;
        this.dwgViewer.annotationManager.setState(data.state);
        if (!this.listStorage[dwgIndex][modelIndex][i].img) {
          this.dwgViewer.annotationManager.createSnapshot((snapshot) => {
            let image = snapshot;
            const copyList = this.annotationlist;
            copyList[i].src = image;
            this.annotationList = copyList;
            const imgs = document.querySelectorAll('.annotation-img');
            imgs[i].setAttribute('src', image);
            this.listStorage[dwgIndex][modelIndex][i].img = image;
            sessionStorage.annotationList = JSON.stringify(this.listStorage);
          })
        }
      }
    },

    clearListStyle() {
      for (let i = 0; i < this.annotationlist.length; i++) {
        this.annotationlist[i].isClick = false;
      }
    },

    maskExit() {
      this.isView = false;
      this.clearListStyle();
      this.app.getToolbar("MainToolbar").show();
      this.dwgViewer.annotationManager.startDrawing();
      this.dwgViewer.annotationManager.endDrawing();
    },

    // changeModel(num) {
    //   if (num == 0) {
    //     this.app.getToolbar("MainToolbar").show();
    //   } else {
    //     this.app.getToolbar("MainToolbar").hide();
    //   }
    // },

  }
}
</script>

<style lang="less">
header {
  width: calc(100% - 40px);
  min-width: 1160px;
  height: 50px;
  position: absolute;
  top: 0;
  line-height: 50px;
  padding: 0 20px;
  background-color: #2c2c2c;
  .logo {
    float: left;
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAAAeCAYAAACrI9dtAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAMsSURBVHjazJhfiExRHMfvXHfIlGWLJxIRngghpbSSUto8eNiUv0nJn13bZkditlWGstYmD2rKn0QoacN6Ex7EavEiK9tu2Igte5c2/3b4/up38vPrnLsz5Rq/+jQz55x7z+eeOef8zkyi/EXbZs/zmkGZ9zvOgtVgrCh7CA6CBLefJuqegn6wVJT1gjR4DTKgwvszFoDHH2esHFLlns8d7AYDnjtIqA3UgQbQAroi2vfyAxwDm6hzcFu1WQXOYVBG2KTKhhEzQhn+TDc5HiFmhE6AkVxW6xBbaxPz+dUlpoXkdTYxKZRU1xQs5otKKRaCBw4hm9hL8CZCqCixBN6cUQ1CvvlUsF3VPQcpMFmU0UQ9DL6A/eIroxgEHWCJus9pUM6LScYVTPwbJNWvKmiE9qHykRdjoN9ZeDkElqmq2T4ve0MnuA92ePFHFejmkZQOvl/ApI4zrHPML6GQU8wvsZBVLOCVRjv1HbXK4o4e1ed8cBK8DziXjeGd2kQqYtVcwstMtYXQQ/0EWTBB1H3ip69UW0gDly8Gi0TdcnA14A2zhTdCM8eeRDwhCc3h9wO82R4FX0ErOADGC+Eu0T4ParjP8+AtX7eQp9EeStA+Z/tqbpwvYviNUDMvZdo0m0Aj6LO0N0LV4oSR4fl8CqyAUChXX7FiUkgeeZIOMZuQJ8R6jJDOfVJsKEIodAjZxD7wvVxCJrKYq2nzIeADmgw6qO2NkKrjOdQtyjp5Uo8TZevALk7WtAA+q77eqc9VEHuGEWsN+MQog1bRD5cRLmpXJ8xCYo1lFW+09D0K5alAddDHw04jtTXmfWqK6ptOqdtAu28RalLHj38RJDTXnON9i1CylEJG6r8SMlJpPjEO8nIP+X3ccZlPt/NEv0Q+4LP1TXVBR0Tua/wLx+GLYDRvwtfUcfgVSdVzftqiLsw5vCotuSzLUvfUD4eQk/sGdV/q864qvwBuma+vgnfaXJHDL1PHdDCJR2on+O64Jsd96V/LJLTe/Fo2q69YMVcumxghVpCQzn2Fig2Xy6TYt2KFTO7zlBjFkQipBssfHC6xWk7K9Rah664/OH4JMABZFx2zEE4mHQAAAABJRU5ErkJggg==)
      no-repeat 0 10px;
    width: 50px;
    height: 50px;
  }
  h2 {
    float: left;
    font-size: 18px;
  }
  h2,
  h2 i {
    font-weight: 400;
    color: #fff;
  }
  h2 i {
    display: inline-block;
    margin-left: 10px;
    background-color: #f60;
    padding: 4px 5px;
    border-radius: 3px;
    font-size: 12px;
    line-height: 12px;
    font-style: normal;
    vertical-align: 2px;
  }
  .btn-box {
    float: right;
    .btn {
      text-align: right;
      margin-left: 10px;
    }
  }
}
.btn-disable2:hover {
  color: #fff;
  background: #ccc;
  border: 1px solid #ccc;
}
.btn-disable2 {
  background: #ccc;
  color: #fff;
  cursor: default;
}
.btn.btn-sm {
  padding: 0 20px;
  line-height: 28px;
}
.btn.btn-primary {
  background: #11dab7;
  color: #fff;
}
.btn.btn-sm {
  padding: 0 20px;
  line-height: 28px;
}
.btn.btn-primary {
  background: #11dab7;
  color: #fff;
}
.btn-sm {
  height: 28px;
}
.btn,
.btn:hover {
  text-decoration: none;
}

.btn {
  display: inline-block;
  text-align: center;
  border: none;
  border-radius: 3px;
  outline: none;
  box-sizing: border-box;
  cursor: pointer;
}
.btn-default {
  background: transparent;
  color: #32d3a6;
  border: 1px solid #32d3a6;
}
.btn-exit {
  border: 1px solid #333;
  background-color: hsla(0, 0%, 7%, 0.88);
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translate(-50%);
  padding: 10px 15px;
  width: 100px;
  text-align: center;
  color: #fff;
  z-index: 199;
}
.container {
  width: calc(100% - 20px);
  min-width: 1180px;
  overflow: hidden;
  position: absolute;
  top: 50px;
  bottom: 40px;
  margin: 10px;
  box-shadow: 0 0 5px 0 #eee;
  background-color: #fff;
  .side-isedit {
    top: 0;
  }
  .viewer-wrap {
    position: absolute;
    top: 0;
    left: 0;
    right: 300px;
    bottom: 0;
  }
  .side {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 300px;
    border-left: 1px solid #ccc;
    box-sizing: border-box;
    .title {
      position: relative;
      line-height: 40px;
      height: 40px;
      box-sizing: border-box;
      padding: 0 10px;
      font-size: 14px;
      border-bottom: 1px solid #ddd;
      background-color: #eaeaea;
      span {
        padding-left: 5px;
        border-left: 4px solid #32d3a6;
      }
    }
    .annotation-brief {
      color: #999;
    }
    .edit-control-tips {
      float: right;
      line-height: 28px;
      color: #ff001f;
    }
    .edit textarea {
      border: 1px solid #ddd;
      box-sizing: border-box;
      width: 279px;
      margin: 5px 0;
      height: 100px;
      resize: none;
      padding: 5px;
      font-size: 14px;
    }
    .drawinglist {
      max-height: 280px;
      padding: 5px 15px;
      color: #999;
      overflow-y: auto;
      li {
        margin-bottom: 5px;
      }
      .detail div {
        padding-left: 20px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .name {
        cursor: pointer;
        color: #333;
      }
      .on {
        color: #32d5a7;
      }
    }
    .title {
      position: relative;
      line-height: 40px;
      height: 40px;
      box-sizing: border-box;
      padding: 0 10px;
      font-size: 14px;
      border-bottom: 1px solid #ddd;
      background-color: #eaeaea;
      span {
        padding-left: 5px;
        border-left: 4px solid #32d3a6;
      }
      .new {
        position: absolute;
        right: 10px;
        top: 0;
      }
    }
    .annotationlist {
      overflow-y: auto;
      li {
        position: relative;
        overflow: hidden;
        border-bottom: 1px solid #ddd;
        padding: 8px 10px 8px 100px;
        box-sizing: border-box;
        color: #999;
        border-left: 2px solid #eee;
        font-size: 12px;
        cursor: pointer;
        &:last-child {
          border-bottom: 0 none;
        }
        .info {
          float: right;
          width: 180px;
          p {
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
          }
        }
        .name {
          color: #333;
          font-size: 14px;
        }
        img {
          position: absolute;
          left: 10px;
          width: 80px;
          height: 50px;
          border: 1px solid #ddd;
          background-color: #fff;
        }
      }
    }
  }
}
.bf-hide {
  display: none;
}
img {
  outline: none;
  vertical-align: middle;
}
a {
  color: #4a90e2;
  text-decoration: none;
  outline: none;
}
footer {
  width: 100%;
  position: absolute;
  bottom: 0;
  background-color: #2c2c2c;
  min-width: 1200px;
  .copyright {
    line-height: 40px;
    font-size: 14px;
    text-align: center;
    color: #999;
    a {
      color: #11dab7;
    }
    .icp-text {
      color: #999;
    }
  }
}
.w1200 {
  width: 1200px;
  margin: 0 auto;
}
</style>
